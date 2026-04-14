"""RFP Worker - orchestrates job processing with reliable queue semantics"""

import asyncio
import json
import logging
import uuid
from typing import Any, Dict, Optional

from redis.asyncio import Redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
from supabase import create_client, Client

from config import (
    REDIS_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    QUEUE_NAME,
    PROCESSING_LIST_PREFIX,
    QUEUE_POLL_TIMEOUT,
    STORAGE_BUCKET,
    DEFAULT_LLM_MODEL,
    WORKER_ID,
    WORKER_SHUTDOWN_GRACE_SECONDS,
)
from services import PDFService, StorageService, LLMService
from utils import ProgressPublisher

logger = logging.getLogger(__name__)

WORKER_ID_FILE = ".worker_id"


def _resolve_worker_id() -> str:
    """Generate a stable worker ID.

    Priority: WORKER_ID config (env) > file-persisted UUID fallback.
    """
    if WORKER_ID:
        return WORKER_ID

    # Fallback: persist a UUID to a file so it survives restarts
    # within the same container filesystem.
    try:
        with open(WORKER_ID_FILE, "r") as f:
            stored = f.read().strip()
            if stored:
                return stored
    except FileNotFoundError:
        pass

    new_id = str(uuid.uuid4())
    try:
        with open(WORKER_ID_FILE, "w") as f:
            f.write(new_id)
    except OSError as e:
        logger.warning(f"Could not persist worker ID to file: {e}")
    return new_id


class RFPWorker:
    """Worker that processes RFP analysis jobs from Redis queue.

    Uses BLMOVE for reliable dequeue: jobs move to a per-worker processing
    list and are only removed (acked) after the job completes or fails.
    """

    def __init__(
        self,
        *,
        redis_client: Optional[Redis] = None,
        storage_service: Optional[StorageService] = None,
        llm_service: Optional[LLMService] = None,
        pdf_service: Optional[PDFService] = None,
    ):
        """Initialize worker with optional injected services.

        Services left as None are created by connect().
        """
        self.redis_client = redis_client
        self.supabase_client: Optional[Client] = None
        self.queue_name = QUEUE_NAME

        self.storage_service = storage_service
        self.llm_service = llm_service
        self.pdf_service = pdf_service

        self.worker_id = _resolve_worker_id()
        self.processing_list = f"{PROCESSING_LIST_PREFIX}:{self.worker_id}"

        # Shutdown coordination — set by signal handler
        self._shutdown = asyncio.Event()

    def connect(self):
        """Connect to Redis and Supabase, filling in any services not injected."""
        if self.redis_client is None:
            self.redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {REDIS_URL}")

        needs_supabase = self.storage_service is None or self.pdf_service is None
        if needs_supabase and self.supabase_client is None:
            if not SUPABASE_SERVICE_ROLE_KEY:
                raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not provided")
            self.supabase_client = create_client(
                SUPABASE_URL.rstrip('/') + '/',
                SUPABASE_SERVICE_ROLE_KEY,
            )
            logger.info(f"Connected to Supabase at {SUPABASE_URL}")

        if self.storage_service is None:
            self.storage_service = StorageService(self.supabase_client)

        if self.pdf_service is None:
            self.pdf_service = PDFService(self.supabase_client, STORAGE_BUCKET)

        if self.llm_service is None:
            self.llm_service = LLMService()

    async def disconnect(self):
        """Disconnect from Redis and release Supabase client."""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("Disconnected from Redis")

        if self.supabase_client is not None:
            self.supabase_client = None
            logger.info("Released Supabase client")

    # ------------------------------------------------------------------
    # Reliable queue helpers
    # ------------------------------------------------------------------

    async def _recover_in_flight_jobs(self):
        """At boot, push any orphaned jobs from our processing list back
        to the head of the main queue so they are re-processed first."""
        recovered = 0
        while True:
            job_json = await self.redis_client.rpop(self.processing_list)
            if job_json is None:
                break
            await self.redis_client.lpush(self.queue_name, job_json)
            recovered += 1

        if recovered:
            logger.info(
                f"Recovered {recovered} orphaned job(s) from {self.processing_list}"
            )

    async def _dequeue(self) -> Optional[str]:
        """Atomically move a job from the main queue to our processing list.

        Returns the raw JSON string, or None on timeout.
        """
        result = await self.redis_client.blmove(
            self.queue_name,
            self.processing_list,
            timeout=QUEUE_POLL_TIMEOUT,
            src="RIGHT",
            dest="LEFT",
        )
        return result

    async def _ack(self, job_json: str):
        """Remove a job from the processing list after completion or failure."""
        await self.redis_client.lrem(self.processing_list, 1, job_json)

    # ------------------------------------------------------------------
    # Job processing
    # ------------------------------------------------------------------

    async def process_job(self, job_data: Dict[str, Any]):
        """Process single RFP analysis job.

        Accepts:
            job_data: Job data containing documentId, storagePath, filename
        """
        document_id = job_data.get('documentId')
        storage_path = job_data.get('storagePath')
        filename = job_data.get('filename')

        logger.info(f"Processing job for document {document_id}: {filename}")

        progress = ProgressPublisher(self.redis_client, document_id)
        pdf_path = None

        try:
            # Mark as processing
            self.storage_service.mark_processing(document_id)
            await progress.publish("uploaded")

            # Step 1: Download PDF
            logger.info(f"Downloading PDF from {storage_path}")
            pdf_path = self.pdf_service.download_pdf(storage_path)

            # Step 2: Extract text
            logger.info("Extracting text from PDF")
            await progress.publish("extracting_text")
            extracted_text = self.pdf_service.extract_text(pdf_path)
            logger.info(f"Extracted {len(extracted_text)} characters")

            # Step 3: Run LLM analysis (async)
            logger.info("Starting LLM analysis (4 categories)...")
            analysis_results = await self.llm_service.analyze_rfp(
                document_id=document_id,
                full_text=extracted_text,
                progress_publisher=progress,
            )

            # Step 4: Prepare LLM usage metrics
            input_tokens = 0
            output_tokens = 0
            for category_usage in [
                analysis_results.cost_breakdown.risks,
                analysis_results.cost_breakdown.accessibility,
                analysis_results.cost_breakdown.questions,
                analysis_results.cost_breakdown.subcontracting,
            ]:
                if category_usage:
                    input_tokens += category_usage.input_tokens
                    output_tokens += category_usage.output_tokens

            llm_usage = {
                "total_tokens": analysis_results.total_tokens,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_cost_usd": analysis_results.total_cost_usd,
                "processing_time_seconds": analysis_results.processing_time_seconds,
                "model": DEFAULT_LLM_MODEL,
                "categories_completed": 100.0,
            }

            # Step 5: Update database with results
            logger.info(
                f"Analysis complete: {analysis_results.processing_time_seconds:.1f}s, "
                f"${analysis_results.total_cost_usd:.4f}, "
                f"{analysis_results.get_success_rate():.0f}% success"
            )

            self.storage_service.mark_completed(
                document_id=document_id,
                analysis_results=analysis_results,
                llm_usage=llm_usage,
            )

            await progress.publish("completed")
            logger.info(f"Job {document_id} completed successfully")

        except Exception as e:
            error_msg = f"Error processing job {document_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)

            try:
                await progress.publish_error(error_msg)
            except RedisError:
                pass  # Best-effort progress publishing

            try:
                self.storage_service.mark_failed(document_id, error_msg)
            except Exception as db_error:
                logger.error(f"Failed to update error status: {db_error}")
                raise

        finally:
            if pdf_path:
                self.pdf_service.cleanup_temp_file(pdf_path)

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    async def run(self):
        """Main worker loop — polls queue and processes jobs.

        On SIGTERM/SIGINT the ``_shutdown`` event is set. The loop finishes
        the current job (if any) before exiting.  If the in-flight job
        exceeds ``WORKER_SHUTDOWN_GRACE_SECONDS`` after the signal, the
        worker force-exits and the job remains in the processing list for
        boot-time recovery.
        """
        logger.info(
            f"Worker {self.worker_id} started, "
            f"processing list: {self.processing_list}"
        )

        await self._recover_in_flight_jobs()

        while not self._shutdown.is_set():
            job_json: Optional[str] = None
            try:
                job_json = await self._dequeue()
                if job_json is None:
                    continue

                job_data = json.loads(job_json)

            except (RedisConnectionError, RedisTimeoutError) as e:
                logger.error(f"Redis connection error during dequeue: {e}")
                continue

            except json.JSONDecodeError as e:
                logger.error(f"Poison message (invalid JSON), dropping: {e}")
                if job_json is not None:
                    await self._ack(job_json)
                continue

            # Process the job. _run_job handles ack and grace-period timeout.
            # Returns False if the grace period was exceeded (job left in
            # processing list for boot-time recovery).
            if not await self._run_job(job_data, job_json):
                break

        logger.info("Worker shutting down...")

    async def _run_job(self, job_data: Dict[str, Any], job_json: str) -> bool:
        """Run a single job with shutdown-awareness.

        Returns True if the job completed (success or failure) and was acked.
        Returns False if the shutdown grace period was exceeded — the job is
        left in the processing list for recovery on next boot.
        """
        job_task = asyncio.ensure_future(self.process_job(job_data))

        if self._shutdown.is_set():
            # Shutdown was already requested (arrived during dequeue).
            return await self._await_with_grace(job_task, job_data, job_json)

        # Race the job against a shutdown request.
        shutdown_future = asyncio.ensure_future(self._shutdown.wait())
        done, _ = await asyncio.wait(
            {job_task, shutdown_future},
            return_when=asyncio.FIRST_COMPLETED,
        )

        if job_task in done:
            # Job finished before any shutdown signal.
            shutdown_future.cancel()
            exc = job_task.exception()
            if exc is None:
                await self._ack(job_json)
            else:
                logger.error(
                    f"Job {job_data.get('documentId')} raised {type(exc).__name__}: "
                    f"{exc}. Leaving in processing list for boot-time recovery.",
                )
            return True

        # Shutdown arrived while the job is still running.
        # Give it up to WORKER_SHUTDOWN_GRACE_SECONDS to finish.
        return await self._await_with_grace(job_task, job_data, job_json)

    async def _await_with_grace(
        self,
        job_task: asyncio.Task,
        job_data: Dict[str, Any],
        job_json: str,
    ) -> bool:
        """Wait for *job_task* to finish within the grace period.

        Returns True if the job completed in time (and was acked).
        Returns False if it exceeded the deadline (left in processing list).
        """
        doc_id = job_data.get("documentId")
        logger.info(
            f"Shutdown requested — allowing up to "
            f"{WORKER_SHUTDOWN_GRACE_SECONDS}s for job {doc_id} to finish"
        )

        done, _ = await asyncio.wait(
            {job_task}, timeout=WORKER_SHUTDOWN_GRACE_SECONDS
        )

        if job_task in done:
            exc = job_task.exception()
            if exc is None:
                await self._ack(job_json)
                logger.info(f"Job {doc_id} finished within grace period")
            else:
                logger.error(
                    f"Job {doc_id} raised {type(exc).__name__} within grace period: "
                    f"{exc}. Leaving in processing list for boot-time recovery.",
                )
            return True

        # Grace period exceeded — cancel the task and leave the job
        # in the processing list for recovery on next boot.
        job_task.cancel()
        try:
            await job_task
        except asyncio.CancelledError:
            pass
        logger.warning(
            f"Job {doc_id} exceeded shutdown grace period "
            f"({WORKER_SHUTDOWN_GRACE_SECONDS}s). Leaving in processing "
            f"list for recovery on next boot."
        )
        return False
