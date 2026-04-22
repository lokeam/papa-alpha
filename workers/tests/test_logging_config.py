"""Tests for workers/logging_config.py — JSON logs and contextvar binding."""

import io
import json
import logging
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest
import structlog

# Mirror conftest.py path setup so this test can be loaded standalone too.
_workers_dir = str(Path(__file__).resolve().parent.parent)
if _workers_dir not in sys.path:
    sys.path.insert(0, _workers_dir)

from logging_config import configure_logging


@pytest.fixture(autouse=True)
def _reset_logging_state():
    """Each test gets fresh structlog + stdlib logging state."""
    yield
    structlog.contextvars.clear_contextvars()
    structlog.reset_defaults()
    root = logging.getLogger()
    for h in list(root.handlers):
        root.removeHandler(h)


def _captured_records(buf: io.StringIO) -> list[dict]:
    return [
        json.loads(line)
        for line in buf.getvalue().splitlines()
        if line.strip()
    ]


def test_stdlib_call_emits_json_with_required_fields():
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        logging.getLogger("svc.x").info("hello")

    records = _captured_records(buf)
    assert len(records) == 1
    rec = records[0]
    for field in ("timestamp", "level", "logger", "event"):
        assert field in rec, f"missing {field}: {rec}"
    assert rec["event"] == "hello"
    assert rec["level"] == "info"
    assert rec["logger"] == "svc.x"


def test_worker_id_appears_after_bind():
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        structlog.contextvars.bind_contextvars(worker_id="w-1")
        logging.getLogger("svc.boot").info("boot complete")

    records = _captured_records(buf)
    assert len(records) == 1
    assert records[0]["worker_id"] == "w-1"


def test_document_id_present_only_when_bound():
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        structlog.contextvars.bind_contextvars(worker_id="w-1")

        log = logging.getLogger("svc.job")
        log.info("idle before")  # no document_id

        structlog.contextvars.bind_contextvars(document_id="doc-A")
        log.info("processing")
        structlog.contextvars.unbind_contextvars("document_id")

        log.info("idle after")  # no document_id again

    records = _captured_records(buf)
    assert len(records) == 3
    assert "document_id" not in records[0]
    assert records[1]["document_id"] == "doc-A"
    assert "document_id" not in records[2]
    assert all(r["worker_id"] == "w-1" for r in records)


def test_two_jobs_dont_leak_document_id():
    """Acceptance: jq 'select(.document_id == "<id-1>")' returns only job-1's lines."""
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        structlog.contextvars.bind_contextvars(worker_id="w-1")
        log = logging.getLogger("svc.job")

        # Job 1
        structlog.contextvars.bind_contextvars(document_id="job-1")
        log.info("step a")
        log.info("step b")
        structlog.contextvars.unbind_contextvars("document_id")

        # Job 2
        structlog.contextvars.bind_contextvars(document_id="job-2")
        log.info("only step")
        structlog.contextvars.unbind_contextvars("document_id")

    records = _captured_records(buf)
    job_1 = [r for r in records if r.get("document_id") == "job-1"]
    job_2 = [r for r in records if r.get("document_id") == "job-2"]
    assert len(job_1) == 2
    assert len(job_2) == 1
    # Verify no record carries both — they're separate jobs
    for r in records:
        assert r.get("document_id") in (None, "job-1", "job-2")


def test_structlog_native_call_also_emits_json_with_context():
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        structlog.contextvars.bind_contextvars(worker_id="w-1")
        structlog.get_logger("svc.native").info("ping", extra="data")

    records = _captured_records(buf)
    assert len(records) == 1
    rec = records[0]
    for field in ("timestamp", "level", "logger", "event", "worker_id"):
        assert field in rec, f"missing {field}: {rec}"
    assert rec["event"] == "ping"
    assert rec["extra"] == "data"


def test_configure_logging_is_idempotent():
    """Calling configure_logging twice should not duplicate log lines."""
    buf = io.StringIO()
    with redirect_stdout(buf):
        configure_logging()
        configure_logging()  # second call must not stack handlers
        logging.getLogger("svc.x").info("once")

    records = _captured_records(buf)
    assert len(records) == 1


# ---------------------------------------------------------------------------
# Integration: process_job binds and clears document_id around the job
# ---------------------------------------------------------------------------

import pytest_asyncio  # noqa: E402

from tests.conftest import make_job  # noqa: E402


@pytest_asyncio.fixture
async def configured_worker(worker, storage_service):
    """Worker with happy-path fakes seeded for the doc id used in tests."""
    storage_service.seed("ctx-001")
    return worker


@pytest.mark.asyncio
async def test_process_job_binds_and_unbinds_document_id(configured_worker):
    """document_id is in contextvars during the job and gone after.

    Validates that subsequent jobs (or idle poll-loop log lines) do not
    inherit a stale document_id.
    """
    seen_during_job: dict[str, object] = {}

    original_mark_processing = configured_worker.storage_service.mark_processing

    def spy_mark_processing(doc_id):
        # Snapshot contextvars *during* the job — this runs while
        # process_job is mid-flight.
        seen_during_job.update(structlog.contextvars.get_contextvars())
        return original_mark_processing(doc_id)

    configured_worker.storage_service.mark_processing = spy_mark_processing

    # Sanity: nothing bound before the job
    assert "document_id" not in structlog.contextvars.get_contextvars()

    await configured_worker.process_job(make_job("ctx-001"))

    # During the job, document_id was bound
    assert seen_during_job.get("document_id") == "ctx-001"

    # After the job, document_id is gone (no leak)
    assert "document_id" not in structlog.contextvars.get_contextvars()


@pytest.mark.asyncio
async def test_process_job_unbinds_document_id_on_failure(
    worker, redis_client, storage_service
):
    """Even when the job fails, document_id is unbound in finally."""
    from tests.fakes import FakeLLMService

    doc_id = "ctx-fail-001"
    storage_service.seed(doc_id)
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=RuntimeError("boom"),
    )

    assert "document_id" not in structlog.contextvars.get_contextvars()

    await worker.process_job(make_job(doc_id))

    # After failure path runs (mark_failed), document_id must still be cleared
    assert "document_id" not in structlog.contextvars.get_contextvars()
