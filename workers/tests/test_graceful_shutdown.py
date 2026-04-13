"""Tests for graceful shutdown — Phase 2 (PRD a)."""

import asyncio
import json

import pytest

from tests.conftest import job_json, make_job
from tests.fakes import FakeLLMService


# ---------------------------------------------------------------------------
# 1. SIGTERM mid-job: finishes current job, then exits
# ---------------------------------------------------------------------------

async def test_shutdown_mid_job_finishes_and_exits(
    worker, redis_client, storage_service
):
    """When shutdown is requested while a job is running, the worker
    finishes the job (acks it) and then exits the run loop."""
    doc_id = "shutdown-finish-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Use a slow LLM so we can trigger shutdown mid-job
    slow_llm = FakeLLMService(behavior="slow", delay=0.3)
    worker.llm_service = slow_llm

    # Enqueue the job
    await redis_client.lpush(worker.queue_name, raw)

    async def trigger_shutdown_after_start():
        """Wait for the LLM call to begin, then request shutdown."""
        await slow_llm.started.wait()
        worker._shutdown.set()

    # Run worker and shutdown trigger concurrently
    await asyncio.gather(
        worker.run(),
        trigger_shutdown_after_start(),
    )

    # Job should be completed and acked
    assert storage_service.documents[doc_id]["status"] == "completed"
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0


# ---------------------------------------------------------------------------
# 2. SIGTERM with grace period exceeded: force-exits, job stays in processing list
# ---------------------------------------------------------------------------

async def test_shutdown_grace_period_exceeded_leaves_job_in_processing_list(
    worker, redis_client, storage_service, monkeypatch
):
    """When the in-flight job exceeds the grace period after shutdown,
    the worker exits and the job remains in the processing list for
    recovery on next boot."""
    doc_id = "shutdown-timeout-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Use a very slow LLM that will exceed the grace period
    slow_llm = FakeLLMService(behavior="slow", delay=60)
    worker.llm_service = slow_llm

    # Set a tiny grace period for testing (0.2s)
    monkeypatch.setattr("worker.WORKER_SHUTDOWN_GRACE_SECONDS", 0.2)

    # Enqueue the job
    await redis_client.lpush(worker.queue_name, raw)

    async def trigger_shutdown_after_start():
        await slow_llm.started.wait()
        worker._shutdown.set()

    await asyncio.gather(
        worker.run(),
        trigger_shutdown_after_start(),
    )

    # Job should NOT be acked — it should remain in the processing list
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 1

    # Document should NOT be marked completed (still processing)
    assert storage_service.documents[doc_id]["status"] == "processing"


# ---------------------------------------------------------------------------
# 3. Shutdown before any job: exits immediately
# ---------------------------------------------------------------------------

async def test_shutdown_before_any_job_exits_cleanly(worker, redis_client):
    """If shutdown is set before any job arrives, the run loop exits
    without processing anything."""
    # Set shutdown immediately
    worker._shutdown.set()

    # run() should return promptly
    await asyncio.wait_for(worker.run(), timeout=2.0)


# ---------------------------------------------------------------------------
# 4. Shutdown mid-first-job: second queued job is not processed
# ---------------------------------------------------------------------------

async def test_shutdown_stops_after_current_job_does_not_pick_up_next(
    worker, redis_client, storage_service
):
    """Two jobs are queued. Shutdown arrives during the first. The worker
    finishes job 1, exits the loop, and never touches job 2."""
    doc_a = "shutdown-multi-a"
    doc_b = "shutdown-multi-b"
    raw_a = job_json(doc_a)
    raw_b = job_json(doc_b)
    storage_service.seed(doc_a)
    storage_service.seed(doc_b)

    slow_llm = FakeLLMService(behavior="slow", delay=0.3)
    worker.llm_service = slow_llm

    # LPUSH puts items at the left; BLMOVE pops from the right.
    # Push A first so it sits at the right and is dequeued first.
    await redis_client.lpush(worker.queue_name, raw_a)
    await redis_client.lpush(worker.queue_name, raw_b)

    async def trigger_shutdown_after_start():
        await slow_llm.started.wait()
        worker._shutdown.set()

    await asyncio.gather(
        worker.run(),
        trigger_shutdown_after_start(),
    )

    # Job A should be completed
    assert storage_service.documents[doc_a]["status"] == "completed"

    # Job B should still be pending (never processed)
    assert storage_service.documents[doc_b]["status"] == "pending"

    # Job B should still be in the main queue
    queue_len = await redis_client.llen(worker.queue_name)
    assert queue_len == 1


# ---------------------------------------------------------------------------
# 5. Shutdown with job that finishes just within grace period
# ---------------------------------------------------------------------------

async def test_shutdown_job_completes_within_grace_period(
    worker, redis_client, storage_service, monkeypatch
):
    """Job takes some time but finishes before the grace period — it
    should be acked and the document marked completed."""
    doc_id = "shutdown-just-in-time-001"
    raw = job_json(doc_id)
    storage_service.seed(doc_id)

    # Job takes 0.2s, grace period is 2s — plenty of time
    slow_llm = FakeLLMService(behavior="slow", delay=0.2)
    worker.llm_service = slow_llm
    monkeypatch.setattr("worker.WORKER_SHUTDOWN_GRACE_SECONDS", 2.0)

    await redis_client.lpush(worker.queue_name, raw)

    async def trigger_shutdown_after_start():
        await slow_llm.started.wait()
        worker._shutdown.set()

    await asyncio.gather(
        worker.run(),
        trigger_shutdown_after_start(),
    )

    # Job should be completed and acked
    assert storage_service.documents[doc_id]["status"] == "completed"
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0
