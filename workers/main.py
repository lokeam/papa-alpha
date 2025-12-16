"""Papa-Alpha RFP Analysis Worker

Background worker for processing RFP documents with LLM analysis.
"""

import os
import sys
import json
import signal
import logging
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any
from redis import Redis
from supabase import create_client, Client
import pdfplumber


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Global flag for graceful shutdown
graceful_shutdown_requested = False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    global graceful_shutdown_requested
    logger.info(f"Received signal {signum}, starting graceful shutdown...")
    graceful_shutdown_requested = True

class RFPWorker:
    """Worker that processes RFP analysis jobs from Redis queue"""

    def __init__(self):
        """Init worker w/ Redis + Supabase connections"""
        self.redis_client: Optional[Redis] = None
        self.supabase_client: Optional[Client] = None
        self.queue_name = "rfp-analysis-queue"

        # Get env vars
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.supabase_url = os.getenv("SUPABASE_URL", "http://localhost:54321")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not self.supabase_key:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not provided")

    def connect(self):
        """Establish connections to Redis + Supabase"""
        try:
            # Connect to Redis
            self.redis_client = Redis.from_url(self.redis_url, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"Connected to Redis at {self.redis_url}")

            # Connect to Supabase
            self.supabase_client = create_client(self.supabase_url, self.supabase_key)
            logger.info(f"Connected to Supabase at {self.supabase_url}")

        except Exception as e:
            logger.error(f"Failed to connect to Redis or Supabase: {e}")
            raise

    def disconnect(self):
        """Gracefully close connections"""
        if self.redis_client:
            self.redis_client.close()
            logger.info("Disconnected from Redis")

    def download_pdf(self, storage_path: str) -> str:
        """Download PDF from Supabase Storage to temporary file
        Accepts:
            storage_path: Path in Supabase Storage (e.g. 'uploads/file.pdf)

        Returns:
            Path to downloaded temporary file

        Raises:
            Exception if download fails
        """
        try:
            logger.info(f"Downloading PDF from storage: {storage_path}")

            # Download file from Supabase Storage
            response = self.supabase_client.storage.from_('documents').download(storage_path)

            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_file.write(response)
            temp_file.close()

            logger.info(f"PDF downloaded to: {temp_file.name}")
            return temp_file.name

        except Exception as e:
            logger.error(f"Failed to download PDF from {storage_path}: {e}")
            raise

    def extract_text(self, pdf_path: str) -> str:
        """Extract text from PDF file
        Accepts:
            pdf_path: Path to PDF file
        Returns:
            Extracted text from PDF
        Raises:
            Exception if extraction fails
        """
        try:
            logger.info(f"Extracting text from PDF: {pdf_path}")

            extracted_text_arr = []

            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                logger.info(f"PDF has {total_pages} pages")

                for page_num, page in enumerate(pdf.pages, start=1):
                    page_text = page.extract_text()

                    if page_text:
                        extracted_text_arr.append(page_text)
                        logger.debug(f"Extracted {len(page_text)} chars from page {page_num}")
                    else:
                        logger.warning(f"No text found on page {page_num}")

            full_text = "\n\n".join(extracted_text_arr)

            if not full_text.strip():
                raise ValueError("No text could be extracted from PDF")

            logger.info(f"Extracted {len(full_text)} total characters from {total_pages} pages")
            return full_text

        except Exception as e:
            logger.error(f"Failed to extract from {pdf_path}: {e}")
            raise
        finally:
            # Clean up temp file
            try:
                if os.path.exists(pdf_path):
                    os.unlink(pdf_path)
                    logger.debug(f"Cleaned up temp file: {pdf_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temp file {pdf_path}: {e}")


    def process_job(self, job_data: Dict[str, Any]):
        """Process single RFP analysis job"""
        document_id = job_data.get('documentId')
        storage_path = job_data.get('storagePath')
        filename = job_data.get('filename')

        logger.info(f"Processing job for document {document_id}: {filename}")

        pdf_path = None

        try:
            # Download pdf + extract text
            pdf_path = self.download_pdf(storage_path)
            extracted_text = self.extract_text(pdf_path)

            logger.info(f"Text extraction complete: {len(extracted_text)} characters")
            logger.info(f"Preview: {extracted_text[:200]}...")

            # TODO: Call ChatGPT API
            # TODO: Update db with results


            # NOTE: log job received for now
            logger.info(f"Job received {document_id} - {storage_path}")
            logger.info("TODO: Implement PDF processing, LLM analysis, and DB update")


        except Exception as e:
            logger.error(f"Error processing job {document_id}: {e}")
            # TODO: Update document status to 'error' in db

    def poll_queue(self):
        """Poll Redis queue for jobs (blocking w/ timeout)"""
        try:
            # BRPOP blocks until a job is either available or 5sec timeout reached
            result = self.redis_client.brpop(self.queue_name, timeout=5)

            if result:
                queue_name, job_json = result
                job_data = json.loads(job_json)
                return job_data

            return None

        except Exception as e:
            logger.error(f"Error polling queue: {e}")
            return None

    def run(self):
        """Main worker loop. Polls queue and processes jobs"""
        logger.info("Worker started, polling queue...")

        while not graceful_shutdown_requested:
            try:
                # Poll for next job
                job_data = self.poll_queue()

                if job_data:
                    self.process_job(job_data)
                else:
                    # No job available, timeout occured. Normal behavior, continue polling
                    pass

            except KeyboardInterrupt:
                logger.info("Received keyboard interrupt")
                break

            except Exception as e:
                logger.error(f"Unexpected error in worker loop: {e}")
                # Carry on running despite errors

        logger.info("Worker shutting down...")

if __name__ == "__main__":
    # Register signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and run worker
    worker = RFPWorker()

    try:
        worker.connect()
        worker.run()

    except Exception as e:
        logger.error(f"Worker failed: {e}")
        sys.exit(1)

    finally:
        worker.disconnect()
        logger.info("Worker stopped")
