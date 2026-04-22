"""Fake PDFService — minimal spy for testing.

``download_pdf`` is async to match services.pdf_service.PDFService.
``extract_text`` stays synchronous and is offloaded by the worker via
``asyncio.to_thread`` at the call site.
"""


class FakePDFService:
    """Returns canned text; tracks calls for assertions."""

    def __init__(
        self,
        extracted_text: str = "This is a sample RFP document text for testing.",
    ):
        self.extracted_text = extracted_text
        self.download_calls: list[str] = []
        self.extract_calls: list[str] = []

    async def download_pdf(self, storage_path: str, workdir: str) -> str:
        self.download_calls.append(storage_path)
        return f"{workdir}/fake_rfp.pdf"

    def extract_text(self, pdf_path: str) -> str:
        self.extract_calls.append(pdf_path)
        return self.extracted_text
