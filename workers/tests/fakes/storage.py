"""Fake StorageService — in-memory state machine mirroring the real schema."""

from typing import Any, Dict, Optional, Union
from pydantic import BaseModel


class FakeStorageService:
    """In-memory document store for testing.

    Mirrors the real StorageService interface (mark_processing, mark_completed,
    mark_failed). Tests assert on self.documents after running the worker.
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

    def mark_processing(self, document_id: str) -> None:
        self._ensure_exists(document_id)
        self.documents[document_id]["status"] = "processing"

    def mark_completed(
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

    def mark_failed(self, document_id: str, error_message: str) -> None:
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
