"""Supabase storage and database service"""

import logging
from typing import Dict, Any, Optional, Union
from supabase import Client
from pydantic import BaseModel

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
    analysis_results: Optional[Union[Dict[str, Any], BaseModel]] = None,
    llm_usage: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None
  ) -> None:
    """Update document in database

    Accepts:
        document_id: UUID of document
        status: New status ('pending', 'processing', 'completed', 'failed')
        analysis_results: LLM analysis results (dict or Pydantic model)
        llm_usage: LLM usage metrics (tokens, cost, time)
        error_message: Error message if status is 'failed'

    Raises:
        Exception: If update fails
    """
    try:
        update_data = {}

        if status:
            update_data["status"] = status

        if analysis_results:
            # Convert Pydantic model to dict if needed
            if isinstance(analysis_results, BaseModel):
                update_data["analysis_results"] = analysis_results.model_dump(mode='json')
            else:
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

  def mark_processing(self, document_id: str) -> None:
    """Mark document as processing

    Accepts:
        document_id: UUID of document
    """
    self.update_document(document_id, status="processing")

  def mark_completed(
    self,
    document_id: str,
    analysis_results: Union[Dict[str, Any], BaseModel],
    llm_usage: Dict[str, Any]
  ) -> None:
    """Mark document as completed with results

    Accepts:
        document_id: UUID of document
        analysis_results: Complete analysis results
        llm_usage: Token usage and cost metrics
    """
    self.update_document(
      document_id=document_id,
      status="completed",
      analysis_results=analysis_results,
      llm_usage=llm_usage
    )

  def mark_failed(self, document_id: str, error_message: str) -> None:
    """Mark document as failed with error message

    Accepts:
        document_id: UUID of document
        error_message: Error description
    """
    self.update_document(
      document_id=document_id,
      status="failed",
      error_message=error_message
    )