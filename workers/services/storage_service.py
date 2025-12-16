"""Supabase storage and database service"""

import logging
from typing import Dict, Any, Optional
from supabase import Client

logger = logging.getLogger(__name__)

class StorageService:
  """Handles Supabase database operations"""

  def __init__(self, supabase_client: Client):
    """Initialize storage service

    Accept:
        supabase_client: Supabase client instance
    """
    self.supabase = supabase_client


  def update_document(
    self,
    document_id: str,
    status: Optional[str] = None,
    analysis_results: Optional[Dict[str, Any]] = None,
    llm_usage: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None
  ) -> None:
    """Update document in database
    Accepts:
        document_id: UUID of document
        status: New status ('processing', 'complete', 'error')
        analysis_results: LLM analysis results
        llm_usage: LLM usage metrics
        error_message: Error message if status is 'error'

    Raises:
        Exception: If update fails
    """
    try:
        update_data = {}

        if status:
            update_data["status"] = status

        if analysis_results:
            update_data["analysis_results"] = analysis_results

        if llm_usage:
            update_data["llm_usage"] = llm_usage

        if error_message:
            update_data["error_message"] = error_message

        logger.info(f"Updating document {document_id}: {list(update_data.keys())}")

        response = self.supabase.table("documents").update(update_data).eq("id", document_id).execute()

        affected_rows = len(response.data) if response.data else 0
        logger.info(f"✓ Document {document_id} updated successfully (rows: {affected_rows})")

    except Exception as e:
        logger.error(f"Failed to update document {document_id}: {e}")
        raise