"""Shared fixtures for worker tests."""

import json
import sys
from pathlib import Path

import fakeredis.aioredis
import pytest
import pytest_asyncio

# Add the workers directory to sys.path so imports work like they do at runtime.
_workers_dir = str(Path(__file__).resolve().parent.parent)
if _workers_dir not in sys.path:
    sys.path.insert(0, _workers_dir)

from worker import RFPWorker
from tests.fakes import FakeStorageService, FakeLLMService, FakePDFService


@pytest_asyncio.fixture
async def redis_client():
    """Per-test async fakeredis instance."""
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.flushall()
    await client.aclose()


@pytest.fixture
def storage_service():
    return FakeStorageService()


@pytest.fixture
def llm_service():
    return FakeLLMService()


@pytest.fixture
def pdf_service():
    return FakePDFService()


@pytest_asyncio.fixture
async def worker(redis_client, storage_service, llm_service, pdf_service):
    """Fully-wired RFPWorker with all fakes injected."""
    w = RFPWorker(
        redis_client=redis_client,
        storage_service=storage_service,
        llm_service=llm_service,
        pdf_service=pdf_service,
    )
    return w


def make_job(document_id: str = "test-doc-001", **overrides) -> dict:
    """Build a minimal valid job payload."""
    job = {
        "documentId": document_id,
        "storagePath": f"uploads/{document_id}.pdf",
        "filename": f"{document_id}.pdf",
    }
    job.update(overrides)
    return job


def job_json(document_id: str = "test-doc-001", **overrides) -> str:
    """Build a minimal valid job payload as a JSON string."""
    return json.dumps(make_job(document_id, **overrides))
