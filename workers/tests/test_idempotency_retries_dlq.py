"""Tests for Phase 4 — idempotency, retries, and DLQ flow."""

import json

import pytest

from config import DLQ_NAME, QUEUE_NAME, WORKER_MAX_JOB_ATTEMPTS
from exceptions import AnalysisFailedError, LLMServiceError, StorageError
from tests.conftest import make_job, job_json
from tests.fakes import FakeLLMService


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------

async def test_skips_replay_of_completed_document(
    worker, redis_client, storage_service, llm_service
):
    """A job whose doc is already 'completed' is a no-op: no LLM call, the
    processing list is acked by the caller, no extra DB writes."""
    doc_id = "already-done"
    storage_service.seed(doc_id, status="completed")
    raw = job_json(doc_id)
    await redis_client.lpush(worker.processing_list, raw)

    try:
        await worker.process_job(make_job(doc_id))
    finally:
        await worker._ack(raw)

    assert llm_service.call_count == 0
    assert storage_service.documents[doc_id]["status"] == "completed"
    assert await redis_client.llen(worker.processing_list) == 0


async def test_skips_replay_of_failed_document(
    worker, redis_client, storage_service, llm_service
):
    """A job whose doc is already 'failed' is also a no-op: do not re-process,
    do not flip status, log a warning and move on."""
    doc_id = "already-failed"
    storage_service.seed(doc_id, status="failed")
    storage_service.documents[doc_id]["error_message"] = "earlier failure"
    raw = job_json(doc_id)
    await redis_client.lpush(worker.processing_list, raw)

    try:
        await worker.process_job(make_job(doc_id))
    finally:
        await worker._ack(raw)

    assert llm_service.call_count == 0
    assert storage_service.documents[doc_id]["status"] == "failed"
    # Did not get rewritten by the worker.
    assert storage_service.documents[doc_id]["error_message"] == "earlier failure"


# ---------------------------------------------------------------------------
# Retry budget — retryable failures cycle through the queue
# ---------------------------------------------------------------------------

async def test_retryable_failure_re_enqueues_with_bumped_attempts(
    worker, redis_client, storage_service
):
    """LLMServiceError on attempt 1 → main queue gets the job back with attempts=1
    and the document stays 'processing' (no mark_failed yet)."""
    doc_id = "retry-001"
    storage_service.seed(doc_id)
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=LLMServiceError("rate limited"),
    )

    await worker.process_job(make_job(doc_id))

    # Document was not marked failed — it's still in flight from the queue's POV.
    assert storage_service.documents[doc_id]["status"] == "processing"

    # Job is back at the head of the queue with bumped attempts.
    queue_contents = await redis_client.lrange(QUEUE_NAME, 0, -1)
    assert len(queue_contents) == 1
    re_enqueued = json.loads(queue_contents[0])
    assert re_enqueued["documentId"] == doc_id
    assert re_enqueued["attempts"] == 1

    # DLQ untouched.
    assert await redis_client.llen(DLQ_NAME) == 0


async def test_retryable_failure_at_budget_lands_in_dlq(
    worker, redis_client, storage_service
):
    """When attempts reaches WORKER_MAX_JOB_ATTEMPTS, the DLQ envelope is
    written, the doc is marked failed, and the queue is *not* re-enqueued."""
    doc_id = "retry-exhausted"
    storage_service.seed(doc_id)
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=AnalysisFailedError("risks", RuntimeError("upstream 500")),
    )

    job_data = make_job(doc_id, attempts=WORKER_MAX_JOB_ATTEMPTS - 1)
    await worker.process_job(job_data)

    assert storage_service.documents[doc_id]["status"] == "failed"

    # Main queue is empty — no re-enqueue once the budget is gone.
    assert await redis_client.llen(QUEUE_NAME) == 0

    # DLQ has exactly one envelope, fully populated.
    dlq_raw = await redis_client.lrange(DLQ_NAME, 0, -1)
    assert len(dlq_raw) == 1
    envelope = json.loads(dlq_raw[0])
    assert envelope["payload"]["documentId"] == doc_id
    assert envelope["payload"]["filename"] == f"{doc_id}.pdf"
    assert "attempts" not in envelope["payload"]  # bookkeeping lives on envelope
    assert envelope["attempts"] == WORKER_MAX_JOB_ATTEMPTS
    assert envelope["worker_id"] == worker.worker_id
    assert "risks" in envelope["last_error"]
    assert "upstream 500" in envelope["last_error"]
    assert envelope["failed_at"]  # ISO timestamp present


# ---------------------------------------------------------------------------
# Non-retryable failures bypass the retry budget
# ---------------------------------------------------------------------------

async def test_non_retryable_failure_goes_straight_to_dlq(
    worker, redis_client, storage_service
):
    """JSONDecodeError-style failures should not consume the retry budget —
    they land in the DLQ on the first attempt."""
    doc_id = "poison-001"
    storage_service.seed(doc_id)
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=json.JSONDecodeError("expecting value", "", 0),
    )

    await worker.process_job(make_job(doc_id))

    # Marked failed straight away.
    assert storage_service.documents[doc_id]["status"] == "failed"

    # Nothing re-enqueued.
    assert await redis_client.llen(QUEUE_NAME) == 0

    # DLQ envelope shows attempts=1.
    dlq_raw = await redis_client.lrange(DLQ_NAME, 0, -1)
    assert len(dlq_raw) == 1
    envelope = json.loads(dlq_raw[0])
    assert envelope["attempts"] == 1
    assert "JSONDecodeError" in envelope["last_error"]


# ---------------------------------------------------------------------------
# Invariant: DB row written *before* DLQ push
# ---------------------------------------------------------------------------

async def test_dlq_push_skipped_if_mark_failed_raises(
    worker, redis_client, storage_service
):
    """If mark_failed raises during the DLQ flow, do NOT push to the DLQ —
    re-raise so the job stays in the processing list for boot recovery.
    A DLQ-without-DB-row is the worst outcome and must not be created."""
    doc_id = "mark-failed-fails"
    storage_service.seed(doc_id)

    def exploding_mark_failed(*args, **kwargs):
        raise RuntimeError("Supabase down")

    storage_service.mark_failed = exploding_mark_failed

    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=json.JSONDecodeError("bad", "", 0),
    )

    with pytest.raises(RuntimeError, match="Supabase down"):
        await worker.process_job(make_job(doc_id))

    # DLQ stayed empty because mark_failed never succeeded.
    assert await redis_client.llen(DLQ_NAME) == 0
