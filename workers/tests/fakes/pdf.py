"""Fake PDFService — minimal spy for testing."""

from typing import Optional


class FakePDFService:
    """Returns canned text; tracks calls for assertions."""

    def __init__(
        self,
        extracted_text: str = "This is a sample RFP document text for testing.",
    ):
        self.extracted_text = extracted_text
        self.download_calls: list[str] = []
        self.extract_calls: list[str] = []
        self.cleanup_calls: list[str] = []

    def download_pdf(self, storage_path: str) -> str:
        self.download_calls.append(storage_path)
        return "/tmp/fake_rfp.pdf"

    def extract_text(self, pdf_path: str) -> str:
        self.extract_calls.append(pdf_path)
        return self.extracted_text

    def cleanup_temp_file(self, pdf_path: str) -> None:
        self.cleanup_calls.append(pdf_path)
