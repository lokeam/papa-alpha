"""Tests for Phase 5 — Supabase async migration with per-call timeouts.

Covers:
- SUPABASE_TIMEOUT_SECONDS config knob exists.
- StorageService and PDFService raise asyncio.TimeoutError when their
  Supabase calls exceed the timeout window.
- asyncio.TimeoutError is in the worker's retryable set, so it consumes
  the retry budget rather than landing straight in the DLQ.
- Worker offloads pdfplumber via asyncio.to_thread (extract_text runs in
  a different thread from the event loop).
- Storage and PDF services exist in async form (no sync ``def`` left in
  the worker call sites).
"""

import asyncio
import inspect
import json
import threading

import pytest

import config as config_module
import worker as worker_module
from config import DLQ_NAME, QUEUE_NAME, WORKER_MAX_JOB_ATTEMPTS
from services.pdf_service import PDFService
from services.storage_service import StorageService
from tests.conftest import make_job


# ---------------------------------------------------------------------------
# 1. Config knob is wired
# ---------------------------------------------------------------------------


def test_supabase_timeout_config_present():
    assert hasattr(config_module, "SUPABASE_TIMEOUT_SECONDS")
    assert isinstance(config_module.SUPABASE_TIMEOUT_SECONDS, int)
    assert config_module.SUPABASE_TIMEOUT_SECONDS > 0


def test_supabase_timeout_default_is_30_when_env_unset(monkeypatch):
    """Acceptance: timeout value is configurable via env var; default is 30s."""
    monkeypatch.delenv("SUPABASE_TIMEOUT_SECONDS", raising=False)
    import importlib

    reloaded = importlib.reload(config_module)
    try:
        assert reloaded.SUPABASE_TIMEOUT_SECONDS == 30
    finally:
        importlib.reload(config_module)


# ---------------------------------------------------------------------------
# 2. Async surface — methods that the worker awaits are coroutines
# ---------------------------------------------------------------------------


def test_storage_service_methods_are_async():
    for name in ("get_status", "update_document", "mark_processing",
                 "mark_completed", "mark_failed"):
        attr = getattr(StorageService, name)
        assert inspect.iscoroutinefunction(attr), f"{name} must be async"


def test_pdf_service_download_is_async_extract_stays_sync():
    assert inspect.iscoroutinefunction(PDFService.download_pdf)
    # Acceptance: pdfplumber stays sync; the worker offloads it via to_thread.
    assert not inspect.iscoroutinefunction(PDFService.extract_text)


# ---------------------------------------------------------------------------
# 3. asyncio.TimeoutError is retryable
# ---------------------------------------------------------------------------


def test_timeout_error_is_classified_as_retryable():
    assert asyncio.TimeoutError in worker_module._RETRYABLE_EXCEPTIONS


# ---------------------------------------------------------------------------
# 4. StorageService raises asyncio.TimeoutError when a call hangs
# ---------------------------------------------------------------------------


class _HangingExecuteBuilder:
    """Postgrest-style chainable stub whose execute() never resolves."""

    def table(self, _name):  # noqa: D401
        return self

    def select(self, *_args, **_kwargs):
        return self

    def update(self, *_args, **_kwargs):
        return self

    def eq(self, *_args, **_kwargs):
        return self

    def limit(self, *_args, **_kwargs):
        return self

    async def execute(self):
        await asyncio.Event().wait()  # never set


async def test_storage_get_status_raises_timeout_error_when_call_hangs(monkeypatch):
    """A hung Supabase call raises asyncio.TimeoutError after the budget elapses."""
    # Patch at the import location — the service captures the value at import time.
    monkeypatch.setattr("services.storage_service.SUPABASE_TIMEOUT_SECONDS", 0.01)

    storage = StorageService(_HangingExecuteBuilder())

    with pytest.raises(asyncio.TimeoutError):
        await storage.get_status("doc-001")


async def test_storage_update_document_raises_timeout_error_when_call_hangs(monkeypatch):
    monkeypatch.setattr("services.storage_service.SUPABASE_TIMEOUT_SECONDS", 0.01)

    storage = StorageService(_HangingExecuteBuilder())

    with pytest.raises(asyncio.TimeoutError):
        await storage.update_document("doc-001", status="processing")


# ---------------------------------------------------------------------------
# 5. PDFService raises asyncio.TimeoutError when storage download hangs
# ---------------------------------------------------------------------------


class _HangingStorageClient:
    """Stub that mimics the async storage client surface used by PDFService."""

    class _FromBucket:
        async def download(self, _path):
            await asyncio.Event().wait()  # never resolves

    class _Storage:
        def from_(self, _bucket):
            return _HangingStorageClient._FromBucket()

    storage = _Storage()


async def test_pdf_download_raises_timeout_error_when_storage_hangs(tmp_path, monkeypatch):
    monkeypatch.setattr("services.pdf_service.SUPABASE_TIMEOUT_SECONDS", 0.01)

    service = PDFService(_HangingStorageClient(), "documents")

    with pytest.raises(asyncio.TimeoutError):
        await service.download_pdf("uploads/x.pdf", workdir=str(tmp_path))


# ---------------------------------------------------------------------------
# 6. Timeout in the worker pipeline burns the retry budget (not the DLQ)
# ---------------------------------------------------------------------------


class _TimeoutOnFirstCallStorage:
    """Storage fake that raises asyncio.TimeoutError on the first mark_processing."""

    def __init__(self):
        self.documents: dict = {}
        self.calls = 0

    def seed(self, document_id: str, status: str = "pending") -> None:
        self.documents[document_id] = {
            "status": status,
            "analysis_results": None,
            "llm_usage": None,
            "error_message": None,
        }

    async def get_status(self, document_id):
        return self.documents.get(document_id, {}).get("status")

    async def mark_processing(self, document_id):
        self.calls += 1
        raise asyncio.TimeoutError("supabase mark_processing timed out")

    async def mark_completed(self, document_id, analysis_results, llm_usage):
        # Should never be reached in this test
        raise AssertionError("mark_completed should not be called")

    async def mark_failed(self, document_id, error_message):
        self.documents.setdefault(document_id, {})["status"] = "failed"
        self.documents[document_id]["error_message"] = error_message


async def test_worker_treats_supabase_timeout_as_retryable(
    worker, redis_client
):
    """A timeout on the first attempt re-enqueues the job rather than DLQing."""
    storage = _TimeoutOnFirstCallStorage()
    storage.seed("retry-on-timeout")
    worker.storage_service = storage

    await worker.process_job(make_job("retry-on-timeout"))

    # Document still 'pending' — never made it past mark_processing
    assert storage.documents["retry-on-timeout"]["status"] == "pending"

    # Job re-enqueued at the head of the main queue with attempts bumped.
    queued = await redis_client.lrange(QUEUE_NAME, 0, -1)
    assert len(queued) == 1
    assert json.loads(queued[0])["attempts"] == 1

    # DLQ untouched — retry budget is what should burn first.
    assert await redis_client.llen(DLQ_NAME) == 0


async def test_worker_dlqs_after_retry_budget_exhausted_on_timeout(
    worker, redis_client
):
    """Submit on the last attempt: a timeout sends the job to the DLQ and
    flips the document to ``failed``."""
    storage = _TimeoutOnFirstCallStorage()
    storage.seed("timeout-exhausted")
    worker.storage_service = storage

    job = make_job("timeout-exhausted", attempts=WORKER_MAX_JOB_ATTEMPTS - 1)
    await worker.process_job(job)

    assert storage.documents["timeout-exhausted"]["status"] == "failed"
    assert await redis_client.llen(QUEUE_NAME) == 0
    dlq = await redis_client.lrange(DLQ_NAME, 0, -1)
    assert len(dlq) == 1
    envelope = json.loads(dlq[0])
    assert "TimeoutError" in envelope["last_error"]
    assert envelope["attempts"] == WORKER_MAX_JOB_ATTEMPTS


# ---------------------------------------------------------------------------
# 7. extract_text is offloaded to a worker thread
# ---------------------------------------------------------------------------


class _ThreadCapturingPDFService:
    """PDFService stand-in that records the thread extract_text runs on."""

    def __init__(self):
        self.download_calls: list[str] = []
        self.extract_calls: list[str] = []
        self.extract_thread_id: int | None = None

    async def download_pdf(self, storage_path: str, workdir: str) -> str:
        self.download_calls.append(storage_path)
        return f"{workdir}/fake.pdf"

    def extract_text(self, pdf_path: str) -> str:
        self.extract_calls.append(pdf_path)
        self.extract_thread_id = threading.get_ident()
        return "extracted text"


async def test_worker_offloads_extract_text_to_a_thread(
    worker, storage_service
):
    """Acceptance: pdfplumber extraction does not block the event loop —
    the worker calls it via asyncio.to_thread, so it lands on a different
    thread from the loop."""
    storage_service.seed("thread-001")
    pdf = _ThreadCapturingPDFService()
    worker.pdf_service = pdf

    main_thread = threading.get_ident()

    await worker.process_job(make_job("thread-001"))

    assert pdf.extract_thread_id is not None
    assert pdf.extract_thread_id != main_thread, (
        "extract_text ran on the event-loop thread; pdfplumber would block /healthz"
    )
