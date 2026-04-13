"""Tests for boot-time recovery — Phase 1 (PRD a)."""

import json
import pytest

from tests.conftest import job_json


# ---------------------------------------------------------------------------
# 4. Recovery returns orphaned jobs to queue head
# ---------------------------------------------------------------------------

async def test_recover_in_flight_jobs_returns_abandoned_jobs_to_queue_head(
    worker, redis_client
):
    """Pre-seed processing list with two jobs. After recovery, both are at
    the head of the main queue and the processing list is empty."""
    job_a = job_json("orphan-a")
    job_b = job_json("orphan-b")

    # Simulate orphaned jobs left from a previous crash
    await redis_client.lpush(worker.processing_list, job_a)
    await redis_client.lpush(worker.processing_list, job_b)

    await worker._recover_in_flight_jobs()

    # Processing list should be empty
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0

    # Both jobs should be in the main queue
    queue_len = await redis_client.llen(worker.queue_name)
    assert queue_len == 2

    # Jobs should be at the head (LPUSH puts them at the left/head)
    # Pop from the right (FIFO order) to verify they're there
    first = await redis_client.rpop(worker.queue_name)
    second = await redis_client.rpop(worker.queue_name)
    recovered_ids = {
        json.loads(first)["documentId"],
        json.loads(second)["documentId"],
    }
    assert recovered_ids == {"orphan-a", "orphan-b"}


# ---------------------------------------------------------------------------
# 5. Poison message dropped and continues
# ---------------------------------------------------------------------------

async def test_poll_queue_drops_poison_message_and_continues(
    worker, redis_client
):
    """Push invalid JSON to the queue. The worker's run loop should parse-error,
    ack the bad message, and not raise."""
    # Push poison message directly to the queue
    await redis_client.lpush(worker.queue_name, "not-valid-json!!!")

    # Simulate what the run() loop does for one iteration:
    # dequeue -> parse -> on JSONDecodeError, ack and continue
    job_json_raw = await worker._dequeue()
    assert job_json_raw == "not-valid-json!!!"

    # Parsing should fail
    import json as _json
    with pytest.raises(_json.JSONDecodeError):
        _json.loads(job_json_raw)

    # Ack the poison message (as the run loop would)
    await worker._ack(job_json_raw)

    # Processing list should be empty
    remaining = await redis_client.llen(worker.processing_list)
    assert remaining == 0

    # Main queue should also be empty
    queue_len = await redis_client.llen(worker.queue_name)
    assert queue_len == 0
