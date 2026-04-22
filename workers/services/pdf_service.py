"""PDF download and text extraction service (async download, threaded extract)."""

import asyncio
import logging
import os
from pathlib import Path

import pdfplumber
from supabase import AsyncClient

from config import SUPABASE_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


class PDFService:
    """Handles PDF download (async) and text extraction (CPU-bound, threaded).

    Storage downloads are bounded by ``SUPABASE_TIMEOUT_SECONDS``.  The
    pdfplumber extraction stays synchronous and is offloaded by the caller
    via ``asyncio.to_thread`` so the event loop (and the health endpoint)
    stay responsive while a large PDF is being parsed.
    """

    def __init__(self, supabase_client: AsyncClient, storage_bucket: str):
        self.supabase = supabase_client
        self.bucket = storage_bucket

    async def download_pdf(self, storage_path: str, workdir: str) -> str:
        """Download PDF from Supabase Storage into the supplied workdir.

        The Supabase download is bounded by ``SUPABASE_TIMEOUT_SECONDS``;
        the file write is offloaded to a worker thread so a slow disk does
        not block the event loop.

        Raises:
            asyncio.TimeoutError: if the download exceeds the timeout.
            Exception: any other download/IO failure.
        """
        logger.info(f"Downloading PDF from storage: {storage_path}")

        try:
            response = await asyncio.wait_for(
                self.supabase.storage.from_(self.bucket).download(storage_path),
                timeout=SUPABASE_TIMEOUT_SECONDS,
            )

            filename = os.path.basename(storage_path) or "rfp.pdf"
            pdf_path = Path(workdir) / filename
            await asyncio.to_thread(pdf_path.write_bytes, response)

            logger.info(f"PDF downloaded to: {pdf_path}")
            return str(pdf_path)

        except asyncio.TimeoutError:
            logger.error(
                f"Download of {storage_path} timed out after {SUPABASE_TIMEOUT_SECONDS}s"
            )
            raise
        except Exception as e:
            logger.error(f"Failed to download PDF from {storage_path}: {e}")
            raise

    def extract_text(self, pdf_path: str) -> str:
        """Extract text from a local PDF (synchronous, CPU-bound).

        Callers MUST run this through ``asyncio.to_thread`` from an async
        context — pdfplumber is blocking and would otherwise stall the
        event loop and the health endpoint.
        """
        logger.info(f"Extracting text from PDF: {pdf_path}")

        try:
            extracted_text_arr = []

            with pdfplumber.open(pdf_path) as pdf:
                page_count = len(pdf.pages)
                logger.info(f"PDF has {page_count} pages")

                for i, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        extracted_text_arr.append(text)
                        logger.debug(f"Extracted {len(text)} chars from page {i}")

            full_text = "\n\n".join(extracted_text_arr)
            logger.info(f"Extracted {len(full_text)} total characters from {page_count} pages")

            if not full_text.strip():
                raise ValueError("No text found in PDF")

            logger.info(f"Text extraction complete: {len(full_text)} characters")
            logger.info(f"Preview: {full_text[:200]}...")

            return full_text

        except Exception as e:
            logger.error(f"Failed to extract text from {pdf_path}: {e}")
            raise
