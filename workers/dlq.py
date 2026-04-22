"""Dead-letter-queue operator tooling.

Backs the ``dlq-list`` / ``dlq-replay`` / ``dlq-purge`` Make targets.  Not a
full CLI — just a thin dispatch layer so the Makefile has a single Python
invocation per target.

Envelope shape (written by ``RFPWorker._push_to_dlq``):
    {
        "payload":    { "documentId": ..., "storagePath": ..., "filename": ... },
        "attempts":   <int>,
        "last_error": <str>,
        "failed_at":  <iso8601 utc>,
        "worker_id":  <str>,
    }
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any, Dict, List, Optional, Tuple

import redis as sync_redis
from supabase import create_async_client

from config import (
    DLQ_NAME,
    QUEUE_NAME,
    REDIS_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
)
from services.storage_service import StorageService


# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------

def _redis_client() -> sync_redis.Redis:
    return sync_redis.Redis.from_url(REDIS_URL, decode_responses=True)


def _storage_service() -> StorageService:
    """Build a StorageService backed by an AsyncClient.

    The CLI runs synchronously and bridges into the async StorageService via
    ``asyncio.run`` at each call site.
    """
    client = asyncio.run(
        create_async_client(
            SUPABASE_URL.rstrip("/") + "/",
            SUPABASE_SERVICE_ROLE_KEY,
        )
    )
    return StorageService(client)


# ---------------------------------------------------------------------------
# Envelope helpers
# ---------------------------------------------------------------------------

def _iter_entries(redis_client: sync_redis.Redis) -> List[Tuple[int, str, Dict[str, Any]]]:
    """Return every DLQ entry as (index, raw_json, parsed_envelope)."""
    raw_entries = redis_client.lrange(DLQ_NAME, 0, -1)
    parsed: List[Tuple[int, str, Dict[str, Any]]] = []
    for idx, raw in enumerate(raw_entries):
        try:
            envelope = json.loads(raw)
        except json.JSONDecodeError:
            envelope = {"_unparseable": True, "_raw": raw}
        parsed.append((idx, raw, envelope))
    return parsed


def _find_by_document_id(
    redis_client: sync_redis.Redis,
    document_id: str,
) -> Optional[Tuple[str, Dict[str, Any]]]:
    """Return (raw_json, envelope) for the first matching entry, else None."""
    for _, raw, envelope in _iter_entries(redis_client):
        payload = envelope.get("payload") or {}
        if payload.get("documentId") == document_id:
            return raw, envelope
    return None


# ---------------------------------------------------------------------------
# Operator commands
# ---------------------------------------------------------------------------

def list_entries() -> int:
    """Print every DLQ entry, one per line, as JSON."""
    redis_client = _redis_client()
    entries = _iter_entries(redis_client)

    if not entries:
        print(f"{DLQ_NAME} is empty")
        return 0

    print(f"{DLQ_NAME} contains {len(entries)} entr{'y' if len(entries) == 1 else 'ies'}:")
    for idx, _, envelope in entries:
        payload = envelope.get("payload") or {}
        summary = {
            "index": idx,
            "documentId": payload.get("documentId"),
            "filename": payload.get("filename"),
            "attempts": envelope.get("attempts"),
            "last_error": envelope.get("last_error"),
            "failed_at": envelope.get("failed_at"),
            "worker_id": envelope.get("worker_id"),
        }
        print(json.dumps(summary))
    return 0


def replay(document_id: str) -> int:
    """Re-enqueue a DLQ entry: reset doc to pending, push payload, drop entry."""
    redis_client = _redis_client()
    found = _find_by_document_id(redis_client, document_id)
    if found is None:
        print(f"No DLQ entry found for document {document_id}", file=sys.stderr)
        return 1

    raw, envelope = found
    payload = dict(envelope.get("payload") or {})
    if not payload.get("documentId"):
        print(
            f"DLQ entry for {document_id} is missing payload.documentId — refusing to replay",
            file=sys.stderr,
        )
        return 1

    storage = _storage_service()
    asyncio.run(
        storage.update_document(document_id, status="pending", error_message="")
    )

    payload["attempts"] = 0
    redis_client.lpush(QUEUE_NAME, json.dumps(payload))

    removed = redis_client.lrem(DLQ_NAME, 1, raw)
    if removed == 0:
        print(
            f"Warning: DLQ entry for {document_id} disappeared before removal",
            file=sys.stderr,
        )

    print(f"Replayed {document_id}: re-enqueued to {QUEUE_NAME}, removed from {DLQ_NAME}")
    return 0


def purge(document_id: str) -> int:
    """Drop a DLQ entry without re-enqueuing.  Document row stays ``failed``."""
    redis_client = _redis_client()
    found = _find_by_document_id(redis_client, document_id)
    if found is None:
        print(f"No DLQ entry found for document {document_id}", file=sys.stderr)
        return 1

    raw, _ = found
    removed = redis_client.lrem(DLQ_NAME, 1, raw)
    if removed == 0:
        print(
            f"DLQ entry for {document_id} disappeared before removal",
            file=sys.stderr,
        )
        return 1

    print(f"Purged {document_id} from {DLQ_NAME}")
    return 0


# ---------------------------------------------------------------------------
# CLI dispatch (Makefile-only entry point)
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m dlq",
        description="Operator tooling for the RFP analysis dead-letter queue",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="Print every DLQ entry")

    replay_p = sub.add_parser("replay", help="Re-enqueue a DLQ entry by document_id")
    replay_p.add_argument("document_id")

    purge_p = sub.add_parser("purge", help="Drop a DLQ entry without re-enqueuing")
    purge_p.add_argument("document_id")

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    args = _build_parser().parse_args(argv)
    if args.command == "list":
        return list_entries()
    if args.command == "replay":
        return replay(args.document_id)
    if args.command == "purge":
        return purge(args.document_id)
    return 2  # argparse should already have rejected this


if __name__ == "__main__":
    sys.exit(main())
