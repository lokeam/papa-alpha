"""Tests for RFPWorker.process_job (PRD a)."""

import json
import pytest

from config import WORKER_MAX_JOB_ATTEMPTS
from exceptions import AnalysisFailedError
from tests.conftest import make_job, job_json
from tests.fakes import FakeLLMService


# ---------------------------------------------------------------------------
# 1. Happy path: completes and acks
# ---------------------------------------------------------------------------

async def test_process_job_happy_path_completes_and_acks(
    worker, redis_client, storage_service, llm_service
):
    """Foundation test.  Healthy fakes → doc status=completed, processing list empty."""
    doc_id = "happy-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Simulate: job is in the processing list (as it would be after BLMOVE)
    await redis_client.lpush(worker.processing_list, raw)

    job_data = make_job(doc_id)
    try:
        await worker.process_job(job_data)
    finally:
        await worker._ack(raw)

    # Assert: document completed
    assert storage_service.documents[doc_id]["status"] == "completed"
    assert storage_service.documents[doc_id]["analysis_results"] is not None

    # Assert: processing list is empty (acked)
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0

    # Assert: LLM was called
    assert llm_service.call_count == 1


# ---------------------------------------------------------------------------
# 2. LLM failure marks failed and acks
# ---------------------------------------------------------------------------

async def test_process_job_llm_failure_marks_failed_and_acks(
    worker, redis_client, storage_service
):
    """FakeLLMService raises → doc status=failed with error message,
    processing list empty.  NOT completed with None sections."""
    doc_id = "fail-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Inject a failing LLM service
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=RuntimeError("LLM quota exhausted"),
    )

    await redis_client.lpush(worker.processing_list, raw)

    job_data = make_job(doc_id)
    try:
        await worker.process_job(job_data)
    finally:
        await worker._ack(raw)

    # Assert: document is failed, not completed
    assert storage_service.documents[doc_id]["status"] == "failed"
    assert "LLM quota exhausted" in storage_service.documents[doc_id]["error_message"]
    assert storage_service.documents[doc_id]["analysis_results"] is None

    # Assert: processing list empty
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0


# ---------------------------------------------------------------------------
# 3. Acks processing list in finally (even when mark_completed raises)
# ---------------------------------------------------------------------------

async def test_process_job_acks_processing_list_in_finally(
    worker, redis_client, storage_service
):
    """If mark_completed raises, the processing list is still acked."""
    doc_id = "ack-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Make mark_completed blow up
    async def exploding_mark_completed(*args, **kwargs):
        raise RuntimeError("Supabase timeout")

    storage_service.mark_completed = exploding_mark_completed

    await redis_client.lpush(worker.processing_list, raw)

    job_data = make_job(doc_id)
    try:
        await worker.process_job(job_data)
    finally:
        await worker._ack(raw)

    # Assert: processing list still empty (acked despite the error)
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0


# ---------------------------------------------------------------------------
# 4. AnalysisFailedError surfaces category name in error message
# ---------------------------------------------------------------------------

async def test_process_job_analysis_failed_error_includes_category(
    worker, redis_client, storage_service
):
    """AnalysisFailedError on the *final* retry → document failed with
    category-bearing error message and a DLQ entry."""
    doc_id = "cat-fail-001"
    storage_service.seed(doc_id)

    cause = RuntimeError("rate limit exceeded")
    worker.llm_service = FakeLLMService(
        behavior="raise",
        error=AnalysisFailedError("risks", cause),
    )

    # Submit on the last allowed attempt so the failure routes to DLQ.
    job_data = make_job(doc_id, attempts=WORKER_MAX_JOB_ATTEMPTS - 1)
    raw = json.dumps(job_data)
    await redis_client.lpush(worker.processing_list, raw)

    try:
        await worker.process_job(job_data)
    finally:
        await worker._ack(raw)

    assert storage_service.documents[doc_id]["status"] == "failed"
    error_msg = storage_service.documents[doc_id]["error_message"]
    assert "risks" in error_msg
    assert "rate limit exceeded" in error_msg

    # And the envelope landed in the DLQ.
    dlq_entries = await redis_client.lrange(worker.dlq_name, 0, -1)
    assert len(dlq_entries) == 1
    envelope = json.loads(dlq_entries[0])
    assert envelope["payload"]["documentId"] == doc_id
    assert envelope["attempts"] == WORKER_MAX_JOB_ATTEMPTS
