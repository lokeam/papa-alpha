"""Supabase storage and database service (async, with per-call timeouts)."""

import asyncio
import logging
from typing import Any, Dict, Optional, Union

from pydantic import BaseModel
from supabase import AsyncClient

from config import SUPABASE_TIMEOUT_SECONDS
from exceptions import StorageError

logger = logging.getLogger(__name__)


class StorageService:
    """Async wrapper around Supabase database operations.

    Every Supabase call is bounded by ``SUPABASE_TIMEOUT_SECONDS``.  On
    timeout the underlying ``asyncio.TimeoutError`` propagates so the
    worker's retry classifier can route it as retryable.
    """

    def __init__(self, supabase_client: AsyncClient):
        self.supabase = supabase_client

    async def get_status(self, document_id: str) -> Optional[str]:
        """Fetch the current status for a document.

        Returns None if the row does not exist.

        Raises:
            asyncio.TimeoutError: if the call exceeds SUPABASE_TIMEOUT_SECONDS.
            StorageError: if the underlying Supabase call fails for another reason.
        """
        try:
            response = await asyncio.wait_for(
                self.supabase
                .table("documents")
                .select("status")
                .eq("id", document_id)
                .limit(1)
                .execute(),
                timeout=SUPABASE_TIMEOUT_SECONDS,
            )
            rows = response.data or []
            if not rows:
                return None
            return rows[0].get("status")
        except asyncio.TimeoutError:
            logger.error(f"get_status({document_id}) timed out after {SUPABASE_TIMEOUT_SECONDS}s")
            raise
        except Exception as e:
            logger.error(f"Failed to fetch status for {document_id}: {e}")
            raise StorageError(f"get_status({document_id}) failed: {e}") from e

    async def update_document(
        self,
        document_id: str,
        status: Optional[str] = None,
        analysis_results: Optional[Union[Dict[str, Any], BaseModel]] = None,
        llm_usage: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Update document in database.

        Raises:
            asyncio.TimeoutError: if the call exceeds SUPABASE_TIMEOUT_SECONDS.
            StorageError: if the underlying Supabase call fails for another reason.
        """
        try:
            update_data: Dict[str, Any] = {}

            if status:
                update_data["status"] = status

            if analysis_results is not None:
                if isinstance(analysis_results, BaseModel):
                    update_data["analysis_results"] = analysis_results.model_dump(mode="json")
                else:
                    update_data["analysis_results"] = analysis_results

            if llm_usage:
                update_data["llm_usage"] = llm_usage

            if error_message is not None:
                update_data["error_message"] = error_message

            logger.info(f"Updating document {document_id}: {list(update_data.keys())}")

            response = await asyncio.wait_for(
                self.supabase
                .table("documents")
                .update(update_data)
                .eq("id", document_id)
                .execute(),
                timeout=SUPABASE_TIMEOUT_SECONDS,
            )

            affected_rows = len(response.data) if response.data else 0
            logger.info(f"✓ Document {document_id} updated successfully (rows: {affected_rows})")

        except asyncio.TimeoutError:
            logger.error(f"update_document({document_id}) timed out after {SUPABASE_TIMEOUT_SECONDS}s")
            raise
        except StorageError:
            raise
        except Exception as e:
            logger.error(f"Failed to update document {document_id}: {e}")
            raise StorageError(f"update_document({document_id}) failed: {e}") from e

    async def mark_processing(self, document_id: str) -> None:
        """Mark document as processing."""
        await self.update_document(document_id, status="processing")

    async def mark_completed(
        self,
        document_id: str,
        analysis_results: Union[Dict[str, Any], BaseModel],
        llm_usage: Dict[str, Any],
    ) -> None:
        """Mark document as completed with results."""
        await self.update_document(
            document_id=document_id,
            status="completed",
            analysis_results=analysis_results,
            llm_usage=llm_usage,
        )

    async def mark_failed(self, document_id: str, error_message: str) -> None:
        """Mark document as failed with error message."""
        await self.update_document(
            document_id=document_id,
            status="failed",
            error_message=error_message,
        )
