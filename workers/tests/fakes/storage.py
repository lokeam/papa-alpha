"""Fake StorageService — in-memory state machine mirroring the real schema.

Mirrors the (now async) public surface of services.storage_service.StorageService
so worker code can ``await self.storage_service.mark_*`` against the fake.
"""

from typing import Any, Dict, Optional, Union

from pydantic import BaseModel


class FakeStorageService:
    """In-memory document store for testing.

    Methods that the worker awaits are async; helpers used only inside the
    test (``seed``, ``_ensure_exists``) stay synchronous.
    """

    def __init__(self):
        self.documents: Dict[str, Dict[str, Any]] = {}

    def seed(self, document_id: str, status: str = "pending") -> None:
        """Pre-populate a document row for a test."""
        self.documents[document_id] = {
            "status": status,
            "analysis_results": None,
            "llm_usage": None,
            "error_message": None,
        }

    async def get_status(self, document_id: str) -> Optional[str]:
        row = self.documents.get(document_id)
        if row is None:
            return None
        return row.get("status")

    async def update_document(
        self,
        document_id: str,
        status: Optional[str] = None,
        analysis_results: Optional[Any] = None,
        llm_usage: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        self._ensure_exists(document_id)
        if status is not None:
            self.documents[document_id]["status"] = status
        if analysis_results is not None:
            if isinstance(analysis_results, BaseModel):
                self.documents[document_id]["analysis_results"] = analysis_results.model_dump(mode="json")
            else:
                self.documents[document_id]["analysis_results"] = analysis_results
        if llm_usage is not None:
            self.documents[document_id]["llm_usage"] = llm_usage
        if error_message is not None:
            self.documents[document_id]["error_message"] = error_message

    async def mark_processing(self, document_id: str) -> None:
        self._ensure_exists(document_id)
        self.documents[document_id]["status"] = "processing"

    async def mark_completed(
        self,
        document_id: str,
        analysis_results: Union[Dict[str, Any], BaseModel],
        llm_usage: Dict[str, Any],
    ) -> None:
        self._ensure_exists(document_id)
        if isinstance(analysis_results, BaseModel):
            self.documents[document_id]["analysis_results"] = analysis_results.model_dump(mode="json")
        else:
            self.documents[document_id]["analysis_results"] = analysis_results
        self.documents[document_id]["llm_usage"] = llm_usage
        self.documents[document_id]["status"] = "completed"

    async def mark_failed(self, document_id: str, error_message: str) -> None:
        self._ensure_exists(document_id)
        self.documents[document_id]["status"] = "failed"
        self.documents[document_id]["error_message"] = error_message

    def _ensure_exists(self, document_id: str) -> None:
        if document_id not in self.documents:
            self.documents[document_id] = {
                "status": "pending",
                "analysis_results": None,
                "llm_usage": None,
                "error_message": None,
            }
