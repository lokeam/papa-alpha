"""RFP Worker - orchestrates job processing"""

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
from services.pdf_service import PDFService
from services.storage_service import StorageService
from utils.cost_calculator import CostCalculator

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
        self.cost_calculator = CostCalculator()

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

    def disconnect(self):
        """Disconnect from Redis and Supabase"""
        if self.redis_client:
            self.redis_client.close()
            logger.info("Disconnected from Redis")

    def process_job(self, job_data: Dict[str, Any]):
        """Process single RFP analysis job

        Args:
            job_data: Job data containing documentId, storagePath, filename
        """
        document_id = job_data.get('documentId')
        storage_path = job_data.get('storagePath')
        filename = job_data.get('filename')

        logger.info(f"Processing job for document {document_id}: {filename}")

        pdf_path = None

        try:
            # Download PDF
            pdf_path = self.pdf_service.download_pdf(storage_path)

            # Extract text
            extracted_text = self.pdf_service.extract_text(pdf_path)

            # TODO - Analyze with LLM
            logger.info("TODO: Call ChatGPT API for analysis")

            # Test cost calculation (will be replaced with actual LLM usage)
            test_usage = self.cost_calculator.calculate(
                model=DEFAULT_LLM_MODEL,
                input_tokens=8234,
                output_tokens=1567,
                duration_seconds=3.2
            )
            logger.info(f"Test LLM cost calculation: {test_usage}")

            # TODO - Update database with results
            logger.info("TODO: Update database with analysis results")

            logger.info(f"✓ Job {document_id} processed successfully")

        except Exception as e:
            logger.error(f"Error processing job {document_id}: {e}")
            # TODO: Update document status to 'error' in database

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
                import json
                job_data = json.loads(job_json)
                self.process_job(job_data)

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