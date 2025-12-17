"""RFP Worker - orchestrates job processing"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from redis import Redis
from supabase import create_client, Client

from config import (
    REDIS_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    QUEUE_NAME,
    QUEUE_POLL_TIMEOUT,
    STORAGE_BUCKET,
    DEFAULT_LLM_MODEL,
)
from services import PDFService, StorageService, LLMService
from utils import ProgressPublisher

logger = logging.getLogger(__name__)


class RFPWorker:
    """Worker that processes RFP analysis jobs from Redis queue"""

    def __init__(self):
        """Initialize worker with service dependencies"""
        self.redis_client: Optional[Redis] = None
        self.supabase_client: Optional[Client] = None
        self.queue_name = QUEUE_NAME

        # Services (initialized after connect())
        self.pdf_service: Optional[PDFService] = None
        self.storage_service: Optional[StorageService] = None
        self.llm_service: Optional[LLMService] = None

        # Validate environment
        if not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not provided")

    def connect(self):
        """Connect to Redis and Supabase"""
        # Connect to Redis
        self.redis_client = Redis.from_url(REDIS_URL, decode_responses=True)
        logger.info(f"Connected to Redis at {REDIS_URL}")

        # Connect to Supabase
        self.supabase_client = create_client(
            SUPABASE_URL.rstrip('/') + '/',  # NOTE: Ensure trailing slash for proper API endpoint
            SUPABASE_SERVICE_ROLE_KEY
        )
        logger.info(f"Connected to Supabase at {SUPABASE_URL}")

        # Initialize services
        self.pdf_service = PDFService(self.supabase_client, STORAGE_BUCKET)
        self.storage_service = StorageService(self.supabase_client)
        self.llm_service = LLMService() # Uses OPENAI_API_KEY from config

    def disconnect(self):
        """Disconnect from Redis and Supabase"""
        if self.redis_client:
            self.redis_client.close()
            logger.info("Disconnected from Redis")

    async def process_job(self, job_data: Dict[str, Any]):
        """Process single RFP analysis job (async)

        Accepts:
            job_data: Job data containing documentId, storagePath, filename
        """
        document_id = job_data.get('documentId')
        storage_path = job_data.get('storagePath')
        filename = job_data.get('filename')

        logger.info(f"Processing job for document {document_id}: {filename}")

        # Initialize progress publisher
        progress = ProgressPublisher(self.redis_client, document_id)

        pdf_path = None

        try:
            # Mark as processing
            self.storage_service.mark_processing(document_id)
            progress.publish("uploaded")

            # Step 1: Download PDF
            logger.info(f"Downloading PDF from {storage_path}")
            pdf_path = self.pdf_service.download_pdf(storage_path)

            # Step 2: Extract text
            logger.info("Extracting text from PDF")
            progress.publish("extracting_text")
            extracted_text = self.pdf_service.extract_text(pdf_path)
            logger.info(f"Extracted {len(extracted_text)} characters")

            # Step 3: Run LLM analysis (async) - LLMService will publish progress
            logger.info("Starting LLM analysis (4 categories)...")
            analysis_results = await self.llm_service.analyze_rfp(
                document_id=document_id,
                full_text=extracted_text,
                progress_publisher=progress
            )

            # Step 4: Prepare LLM usage metrics
            # Calculate input/output tokens from cost breakdown
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
                "categories_completed": analysis_results.get_success_rate(),
                "partial_results": analysis_results.partial_results,
            }

            # Step 5: Update database with results
            logger.info(
                f"Analysis complete: {analysis_results.processing_time_seconds:.1f}s, "
                f"${analysis_results.total_cost_usd:.4f}, "
                f"{analysis_results.get_success_rate():.0f}% success"
            )

            self.storage_service.mark_completed(
                document_id=document_id,
                analysis_results=analysis_results,  # Pydantic model (will be serialized)
                llm_usage=llm_usage
            )

            # Publish completion
            progress.publish("completed")
            logger.info(f"Job {document_id} completed successfully")

        except Exception as e:
            error_msg = f"Error processing job {document_id}: {str(e)}"
            logger.error(error_msg, exc_info=True)

            # Publish error to progress channel
            try:
                progress.publish_error(error_msg)
            except:
                pass  # Don't fail if progress publish fails

            # Mark as failed in database
            try:
                self.storage_service.mark_failed(document_id, error_msg)
            except Exception as db_error:
                logger.error(f"Failed to update error status: {db_error}")

        finally:
            # Clean up temp file
            if pdf_path:
                self.pdf_service.cleanup_temp_file(pdf_path)

    def poll_queue(self):
        """Poll Redis queue for jobs (blocking with timeout)"""
        try:
            # BRPOP blocks until a job is available or timeout reached
            result = self.redis_client.brpop(self.queue_name, timeout=QUEUE_POLL_TIMEOUT)

            if result:
                queue_name, job_json = result
                job_data = json.loads(job_json)

                # Run async process_job in event loop
                asyncio.run(self.process_job(job_data))

        except Exception as e:
            logger.error(f"Error polling queue: {e}")

    def run(self):
        """Main worker loop - polls queue and processes jobs"""
        logger.info("Worker started, polling queue...")

        # NOTE: Import used here to avoid circular dependency with main module
        from main import graceful_shutdown_requested

        while not graceful_shutdown_requested:
            try:
                self.poll_queue()
            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt")
                break
            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                # Continue running despite errors

        logger.info("Worker shutting down...")