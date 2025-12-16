"""PDF download and text extraction service"""

import os
import tempfile
import logging
from pathlib import Path
from typing import Optional
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

  def download_pdf(self, storage_path: str) -> str:
    """Download PDF from Supabase Storage to temp file
      Accepts:
        storage_path: Path in storage bucket (e.g., "uploads/file.pdf")

      Returns:
        Exception: If download fails
    """
    logger.info(f"Downloading PDF from storage: {storage_path}")

    try:
      # Download file from Supabase Storage
      response = self.supabase.storage.from_(self.bucket).download(storage_path)

      # Create temp file
      temp_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf",
        prefix="rfp_"
      )

      # Write bytes to temp file
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


  def cleanup_temp_file(self, pdf_path: str) -> None:
    """Clean up temporary PDF file

    Accepts:
        pdf_path: Path to the temporary PDF file to delete
    """
    try:
        if os.path.exists(pdf_path):
            os.unlink(pdf_path)
            logger.debug(f"Cleaned up temp file: {pdf_path}")

    except Exception as e:
        logger.warning(f"Failed to clean up temp file {pdf_path}: {e}")