"""RFP Worker - orchestrates job processing with reliable queue semantics"""

import asyncio
import json
import logging
import tempfile
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import structlog
from opentelemetry.trace import SpanKind, Status, StatusCode
from redis.asyncio import Redis
from redis.exceptions import RedisError, ConnectionError as RedisConnectionError, TimeoutError as RedisTimeoutError
from supabase import AsyncClient, create_async_client

from config import (
    REDIS_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    QUEUE_NAME,
    PROCESSING_LIST_PREFIX,
    DLQ_NAME,
    QUEUE_POLL_TIMEOUT,
    STORAGE_BUCKET,
    DEFAULT_LLM_MODEL,
    WORKER_ID,
    WORKER_MAX_JOB_ATTEMPTS,
    WORKER_SHUTDOWN_GRACE_SECONDS,
)
from exceptions import LLMServiceError, StorageError
from services import PDFService, StorageService, LLMService
from tracing import get_tracer
from utils import ProgressPublisher

tracer = get_tracer("worker")

# Errors that mean "transient — try again before giving up". Anything not in
# this set goes straight to the DLQ with attempts=1 (no retry budget burned).
_RETRYABLE_EXCEPTIONS = (
    StorageError,
    LLMServiceError,
    RedisError,
    asyncio.TimeoutError,
)

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
        self.supabase_client: Optional[AsyncClient] = None
        self.queue_name = QUEUE_NAME

        self.storage_service = storage_service
        self.llm_service = llm_service
        self.pdf_service = pdf_service

        self.worker_id = _resolve_worker_id()
        self.processing_list = f"{PROCESSING_LIST_PREFIX}:{self.worker_id}"
        self.dlq_name = DLQ_NAME

        # Shutdown coordination — set by signal handler
        self._shutdown = asyncio.Event()

    async def connect(self):
        """Connect to Redis and Supabase, filling in any services not injected."""
        if self.redis_client is None:
            self.redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
            logger.info(f"Connected to Redis at {REDIS_URL}")

        needs_supabase = self.storage_service is None or self.pdf_service is None
        if needs_supabase and self.supabase_client is None:
            self.supabase_client = await create_async_client(
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
            job_data: Job payload — documentId, storagePath, filename, attempts
        """
        document_id = job_data.get('documentId')
        filename = job_data.get('filename')
        attempts = int(job_data.get('attempts') or 0) + 1
        job_data['attempts'] = attempts

        structlog.contextvars.bind_contextvars(document_id=document_id, attempts=attempts)
        # The root span covers the full job — including the failure path —
        # so retries surface as repeated child trees in Phoenix and the
        # document_id/attempts/worker_id attributes are visible at the top
        # of every trace.
        with tracer.start_as_current_span(
            "worker.process_job",
            kind=SpanKind.CONSUMER,
            attributes={
                "document_id": str(document_id) if document_id is not None else "",
                "filename": filename or "",
                "attempts": attempts,
                "worker_id": self.worker_id,
            },
        ) as span:
            try:
                logger.info(f"Processing job for document {document_id}: {filename}")

                # Idempotency: a replayed job for a terminal document is a no-op.
                # `failed` only appears here when a previous attempt's ack didn't
                # land — log loudly so the divergence is visible, but don't re-run.
                if not await self._handle_terminal_status(job_data):
                    span.set_attribute("job.outcome", "skipped_terminal")
                    return

                await self._run_job_steps(job_data)
                span.set_attribute("job.outcome", "completed")
            except Exception as exc:
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, str(exc)))
                raise
            finally:
                structlog.contextvars.unbind_contextvars("document_id", "attempts")

    # ------------------------------------------------------------------
    # Status / idempotency
    # ------------------------------------------------------------------

    async def _handle_terminal_status(self, job_data: Dict[str, Any]) -> bool:
        """Short-circuit if the document is already in a terminal state.

        Returns True if processing should continue, False if the job is a
        replay of a finished document (caller should return immediately).
        Storage failures during the lookup are surfaced — they're retryable.
        """
        document_id = job_data['documentId']
        current_status = await self.storage_service.get_status(document_id)

        if current_status == "completed":
            logger.info(
                f"Skipping replay of completed job for document {document_id}"
            )
            try:
                progress = ProgressPublisher(self.redis_client, document_id)
                await progress.publish("completed")
            except RedisError:
                pass
            return False

        if current_status == "failed":
            logger.warning(
                f"Replay of already-failed document {document_id}: prior ack "
                "likely never landed. Skipping re-processing — investigate."
            )
            return False

        return True

    # ------------------------------------------------------------------
    # Job pipeline
    # ------------------------------------------------------------------

    async def _run_job_steps(self, job_data: Dict[str, Any]) -> None:
        """Run the actual download → extract → analyze → mark-completed pipeline.

        Failures are routed through ``_handle_failure`` which decides between
        re-enqueue and DLQ.  Catastrophic failures inside the failure handler
        re-raise so the surrounding ``_run_job`` leaves the job in the
        processing list for boot-time recovery.
        """
        document_id = job_data['documentId']
        storage_path = job_data['storagePath']
        progress = ProgressPublisher(self.redis_client, document_id)

        try:
            with tempfile.TemporaryDirectory(prefix="rfp_") as workdir:
                await self.storage_service.mark_processing(document_id)
                await progress.publish("uploaded")

                logger.info(f"Downloading PDF from {storage_path}")
                with tracer.start_as_current_span(
                    "pdf.download",
                    attributes={"storage_path": storage_path},
                ):
                    pdf_path = await self.pdf_service.download_pdf(
                        storage_path, workdir=workdir
                    )

                logger.info("Extracting text from PDF")
                await progress.publish("extracting_text")
                # pdfplumber is sync + CPU-bound — keep it off the event loop
                # so /healthz and other async tasks stay responsive.
                with tracer.start_as_current_span("pdf.extract") as extract_span:
                    extracted_text = await asyncio.to_thread(
                        self.pdf_service.extract_text, pdf_path
                    )
                    extract_span.set_attribute("text.length", len(extracted_text))
                logger.info(f"Extracted {len(extracted_text)} characters")

                logger.info("Starting LLM analysis (4 categories)...")
                with tracer.start_as_current_span(
                    "llm.analyze_rfp",
                    attributes={"document_id": document_id},
                ) as llm_span:
                    analysis_results = await self.llm_service.analyze_rfp(
                        document_id=document_id,
                        full_text=extracted_text,
                        progress_publisher=progress,
                    )
                    llm_span.set_attribute(
                        "llm.total_tokens", int(analysis_results.total_tokens)
                    )
                    llm_span.set_attribute(
                        "llm.total_cost_usd", float(analysis_results.total_cost_usd)
                    )

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

                logger.info(
                    f"Analysis complete: {analysis_results.processing_time_seconds:.1f}s, "
                    f"${analysis_results.total_cost_usd:.4f}, "
                    f"{analysis_results.get_success_rate():.0f}% success"
                )

                with tracer.start_as_current_span("supabase.mark_completed"):
                    await self.storage_service.mark_completed(
                        document_id=document_id,
                        analysis_results=analysis_results,
                        llm_usage=llm_usage,
                    )

                await progress.publish("completed")
                logger.info(f"Job {document_id} completed successfully")

        except Exception as exc:
            await self._handle_failure(job_data, progress, exc)

    # ------------------------------------------------------------------
    # Failure routing: re-enqueue vs. DLQ
    # ------------------------------------------------------------------

    def _is_retryable(self, exc: BaseException) -> bool:
        return isinstance(exc, _RETRYABLE_EXCEPTIONS)

    async def _handle_failure(
        self,
        job_data: Dict[str, Any],
        progress: ProgressPublisher,
        exc: Exception,
    ) -> None:
        """Decide whether to re-enqueue the job or send it to the DLQ.

        - Retryable + budget remaining → bump attempts, push to head of main
          queue, document stays ``processing``.
        - Otherwise → mark failed *first*, then push DLQ envelope. The order
          matters: a DLQ entry without a `failed` row is unrecoverable, so
          we'd rather have a `failed` row without a DLQ entry (operator
          can investigate by document_id).
        """
        document_id = job_data['documentId']
        attempts = int(job_data.get('attempts') or 1)
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error(
            f"Job {document_id} attempt {attempts} failed: {error_msg}",
            exc_info=True,
        )

        retryable = self._is_retryable(exc)
        if retryable and attempts < WORKER_MAX_JOB_ATTEMPTS:
            await self._re_enqueue_for_retry(job_data)
            logger.info(
                f"Re-enqueued document {document_id} for retry "
                f"(attempt {attempts}/{WORKER_MAX_JOB_ATTEMPTS})"
            )
            return

        # No retry budget left, or non-retryable failure → DLQ flow.
        try:
            await progress.publish_error(error_msg)
        except RedisError:
            pass  # Best-effort

        try:
            with tracer.start_as_current_span("supabase.mark_failed"):
                await self.storage_service.mark_failed(document_id, error_msg)
        except Exception as db_error:
            # mark_failed must succeed before we push DLQ — a DLQ entry
            # without a failed DB row is the worst outcome (PRD invariant).
            # Re-raise so the job stays in the processing list and gets
            # recovered on next boot.
            logger.error(
                f"mark_failed for {document_id} raised {type(db_error).__name__}: "
                f"{db_error}. Skipping DLQ push; leaving job in processing list."
            )
            raise

        await self._push_to_dlq(job_data, error_msg)
        logger.error(
            f"Document {document_id} sent to DLQ after {attempts} attempt(s)"
        )

    async def _re_enqueue_for_retry(self, job_data: Dict[str, Any]) -> None:
        """Push the job (with bumped attempts) back to the head of the queue."""
        await self.redis_client.lpush(self.queue_name, json.dumps(job_data))

    async def _push_to_dlq(self, job_data: Dict[str, Any], last_error: str) -> None:
        """Wrap the original payload in the DLQ envelope and push it."""
        envelope = {
            "payload": {k: v for k, v in job_data.items() if k != "attempts"},
            "attempts": int(job_data.get("attempts") or 1),
            "last_error": last_error,
            "failed_at": datetime.now(timezone.utc).isoformat(),
            "worker_id": self.worker_id,
        }
        await self.redis_client.lpush(self.dlq_name, json.dumps(envelope))

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
