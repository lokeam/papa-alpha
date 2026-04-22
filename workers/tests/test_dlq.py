"""Tests for workers/dlq.py operator tooling.

We exercise the same functions the Makefile shells out to: list/replay/purge.
Both Redis and Supabase are stubbed via monkeypatching the private connection
helpers so we can run end-to-end without external services.
"""

import json
from datetime import datetime, timezone
from typing import List, Optional

import fakeredis
import pytest

import dlq as dlq_module
from config import DLQ_NAME, QUEUE_NAME
from tests.fakes import FakeStorageService


def _envelope(document_id: str, attempts: int = 3, last_error: str = "boom") -> str:
    return json.dumps({
        "payload": {
            "documentId": document_id,
            "storagePath": f"uploads/{document_id}.pdf",
            "filename": f"{document_id}.pdf",
        },
        "attempts": attempts,
        "last_error": last_error,
        "failed_at": datetime.now(timezone.utc).isoformat(),
        "worker_id": "test-worker",
    })


@pytest.fixture
def fake_redis():
    """Sync fakeredis matching the sync redis client used by dlq.py."""
    client = fakeredis.FakeRedis(decode_responses=True)
    yield client
    client.flushall()


@pytest.fixture
def fake_storage():
    return FakeStorageService()


@pytest.fixture(autouse=True)
def stub_connections(monkeypatch, fake_redis, fake_storage):
    """Replace dlq's connection factories with in-memory fakes."""
    monkeypatch.setattr(dlq_module, "_redis_client", lambda: fake_redis)
    monkeypatch.setattr(dlq_module, "_storage_service", lambda: fake_storage)


# ---------------------------------------------------------------------------
# list
# ---------------------------------------------------------------------------

def test_list_prints_empty_when_dlq_has_no_entries(fake_redis, capsys):
    rc = dlq_module.list_entries()
    captured = capsys.readouterr()
    assert rc == 0
    assert "empty" in captured.out


def test_list_prints_one_summary_line_per_entry(fake_redis, capsys):
    fake_redis.lpush(DLQ_NAME, _envelope("doc-a"))
    fake_redis.lpush(DLQ_NAME, _envelope("doc-b", attempts=1, last_error="json bad"))

    rc = dlq_module.list_entries()
    out = capsys.readouterr().out

    assert rc == 0
    assert "doc-a" in out
    assert "doc-b" in out
    assert "json bad" in out


# ---------------------------------------------------------------------------
# replay
# ---------------------------------------------------------------------------

def test_replay_resets_status_re_enqueues_and_removes_from_dlq(
    fake_redis, fake_storage, capsys
):
    doc_id = "replay-001"
    fake_storage.seed(doc_id, status="failed")
    fake_storage.documents[doc_id]["error_message"] = "old failure"
    fake_redis.lpush(DLQ_NAME, _envelope(doc_id))

    rc = dlq_module.replay(doc_id)
    out = capsys.readouterr().out

    assert rc == 0
    assert "Replayed" in out

    assert fake_storage.documents[doc_id]["status"] == "pending"

    queue_contents = fake_redis.lrange(QUEUE_NAME, 0, -1)
    assert len(queue_contents) == 1
    payload = json.loads(queue_contents[0])
    assert payload["documentId"] == doc_id
    assert payload["attempts"] == 0  # fresh budget

    # DLQ entry gone.
    assert fake_redis.llen(DLQ_NAME) == 0


def test_replay_returns_nonzero_when_no_entry_for_document(fake_redis, capsys):
    rc = dlq_module.replay("missing-001")
    err = capsys.readouterr().err
    assert rc == 1
    assert "missing-001" in err


# ---------------------------------------------------------------------------
# purge
# ---------------------------------------------------------------------------

def test_purge_removes_dlq_entry_without_re_enqueuing(
    fake_redis, fake_storage, capsys
):
    doc_id = "purge-001"
    fake_storage.seed(doc_id, status="failed")
    fake_redis.lpush(DLQ_NAME, _envelope(doc_id))

    rc = dlq_module.purge(doc_id)
    out = capsys.readouterr().out

    assert rc == 0
    assert "Purged" in out
    assert fake_redis.llen(DLQ_NAME) == 0
    assert fake_redis.llen(QUEUE_NAME) == 0
    # Document row stays failed.
    assert fake_storage.documents[doc_id]["status"] == "failed"


def test_purge_returns_nonzero_when_no_entry_for_document(fake_redis, capsys):
    rc = dlq_module.purge("missing-002")
    err = capsys.readouterr().err
    assert rc == 1
    assert "missing-002" in err
