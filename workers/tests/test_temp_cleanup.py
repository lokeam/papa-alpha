"""Tests for temp-file lifecycle in process_job (PRD c §5.8).

The contract: every file written during a job lives inside a per-job
TemporaryDirectory that is cleaned up on every exit path — including
exceptions raised before any path is returned.
"""

import os
from pathlib import Path
from typing import Optional

import pytest

from tests.conftest import make_job
from tests.fakes import FakePDFService


class WorkdirTrackingPDFService(FakePDFService):
    """FakePDFService that actually writes a file inside the supplied workdir.

    Lets tests assert on the workdir's existence after process_job returns.
    """

    def __init__(
        self,
        *,
        extracted_text: str = "sample text",
        raise_in_download: Optional[Exception] = None,
        raise_in_download_after_write: Optional[Exception] = None,
    ):
        super().__init__(extracted_text=extracted_text)
        self.raise_in_download = raise_in_download
        self.raise_in_download_after_write = raise_in_download_after_write
        self.workdirs_seen: list[str] = []

    async def download_pdf(self, storage_path: str, workdir: str) -> str:
        self.download_calls.append(storage_path)
        self.workdirs_seen.append(workdir)

        if self.raise_in_download is not None:
            raise self.raise_in_download

        path = Path(workdir) / "rfp.pdf"
        path.write_bytes(b"%PDF-1.4 stub")

        if self.raise_in_download_after_write is not None:
            raise self.raise_in_download_after_write

        return str(path)


# ---------------------------------------------------------------------------
# 1. Happy path: workdir is created, used, then cleaned up
# ---------------------------------------------------------------------------

async def test_process_job_cleans_up_workdir_on_success(
    worker, redis_client, storage_service
):
    doc_id = "tmp-happy-001"
    storage_service.seed(doc_id)

    tracker = WorkdirTrackingPDFService()
    worker.pdf_service = tracker

    await worker.process_job(make_job(doc_id))

    assert len(tracker.workdirs_seen) == 1
    workdir = tracker.workdirs_seen[0]
    assert not os.path.exists(workdir), (
        f"workdir {workdir} still exists after job completion"
    )


# ---------------------------------------------------------------------------
# 2. Exception AFTER a file is written: workdir + file are cleaned up
# ---------------------------------------------------------------------------

async def test_process_job_cleans_up_workdir_when_download_raises_after_write(
    worker, redis_client, storage_service
):
    doc_id = "tmp-write-then-raise-001"
    storage_service.seed(doc_id)

    tracker = WorkdirTrackingPDFService(
        raise_in_download_after_write=RuntimeError("boom after write"),
    )
    worker.pdf_service = tracker

    await worker.process_job(make_job(doc_id))

    workdir = tracker.workdirs_seen[0]
    assert not os.path.exists(workdir), (
        f"workdir {workdir} leaked after exception during download"
    )
    # And the document was marked failed (not silently swallowed)
    assert storage_service.documents[doc_id]["status"] == "failed"


# ---------------------------------------------------------------------------
# 3. Exception BEFORE any file is written: workdir still cleaned up
# ---------------------------------------------------------------------------

async def test_process_job_cleans_up_workdir_when_download_raises_before_write(
    worker, redis_client, storage_service
):
    doc_id = "tmp-pre-write-raise-001"
    storage_service.seed(doc_id)

    tracker = WorkdirTrackingPDFService(
        raise_in_download=RuntimeError("boom before write"),
    )
    worker.pdf_service = tracker

    await worker.process_job(make_job(doc_id))

    workdir = tracker.workdirs_seen[0]
    assert not os.path.exists(workdir)
    assert storage_service.documents[doc_id]["status"] == "failed"


# ---------------------------------------------------------------------------
# 4. PDFService.cleanup_temp_file is gone
# ---------------------------------------------------------------------------

def test_pdf_service_no_longer_exposes_cleanup_temp_file():
    """cleanup_temp_file is dead code per PRD §5.8 — confirm it is removed."""
    from services.pdf_service import PDFService

    assert not hasattr(PDFService, "cleanup_temp_file"), (
        "PDFService.cleanup_temp_file should be removed; "
        "TemporaryDirectory now owns lifecycle."
    )


# ---------------------------------------------------------------------------
# 5. download_pdf signature accepts a workdir kwarg
# ---------------------------------------------------------------------------

def test_download_pdf_accepts_workdir_parameter():
    """download_pdf must accept a workdir parameter so the caller can
    own the lifetime of the temp directory."""
    import inspect
    from services.pdf_service import PDFService

    sig = inspect.signature(PDFService.download_pdf)
    assert "workdir" in sig.parameters, (
        f"PDFService.download_pdf must accept a 'workdir' kwarg; "
        f"got parameters: {list(sig.parameters)}"
    )
