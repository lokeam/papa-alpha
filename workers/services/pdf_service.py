"""PDF download and text extraction service"""

import logging
import os
from pathlib import Path

import pdfplumber
from supabase import Client

logger = logging.getLogger(__name__)


class PDFService:
  """Handles PDF download and text extraction"""

  def __init__(self, supabase_client: Client, storage_bucket: str):
    """Init PDF Service

      Accepts:
        supabase_client: Supabase client instance
        storage_bucket: Name of storage bucket for PDFs
    """
    self.supabase = supabase_client
    self.bucket = storage_bucket

  def download_pdf(self, storage_path: str, workdir: str) -> str:
    """Download PDF from Supabase Storage into the supplied workdir.

      Accepts:
        storage_path: Path in storage bucket (e.g., "uploads/file.pdf")
        workdir: Caller-owned directory; lifecycle is managed by the caller
                 (typically a tempfile.TemporaryDirectory context manager)

      Returns:
        Absolute path to the downloaded PDF inside workdir.

      Raises:
        Exception: If download fails
    """
    logger.info(f"Downloading PDF from storage: {storage_path}")

    try:
      response = self.supabase.storage.from_(self.bucket).download(storage_path)

      filename = os.path.basename(storage_path) or "rfp.pdf"
      pdf_path = Path(workdir) / filename
      pdf_path.write_bytes(response)

      logger.info(f"PDF downloaded to: {pdf_path}")
      return str(pdf_path)

    except Exception as e:
      logger.error(f"Failed to download PDF from {storage_path}: {e}")
      raise

  def extract_text(self, pdf_path: str) -> str:
    """Extract text from PDF file

    Accepts:
        pdf_path: Path to PDF file

    Returns:
        extracted text content

    Raises:
        Exception: if text extraction fails
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
