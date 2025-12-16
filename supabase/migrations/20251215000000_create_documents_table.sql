-- Create documents table with embedded analysis results
-- This uses a single table approach since:
-- 1:1 relationship (one document = one analysis)
-- Always query them together after processing
-- Simpler code with no JOINs needed
-- Nullable analysis fields represent the actual state during processing

CREATE TABLE documents (
  -- Primary id
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Doc metadata, saved immediately after upload
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Analysis results (NULL until analysis completes)
  small_business_accessible BOOLEAN,
  small_business_reasoning TEXT,
  identified_risks JSONB,
  clarifying_questions JSONB,
  subcontracting_opportunities JSONB,

  -- Raw LLM response for debugging
  raw_llm_response JSONB,
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);


-- Index for filtering by status
CREATE INDEX idx_documents_status ON documents(status);

-- Index for sorting by creation time
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Auto update timestamp upon change
-- Run w/ fn owner's privilges, only look in public schema for fns
-- Guarantee call to pg_catalog.now() for consistent behavior
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table documentation:
COMMENT ON TABLE documents IS 'Stores uploaded RFP documents and their analysis results. Uses single table approach for 1:1 relationship.';
COMMENT ON COLUMN documents.status IS 'Current processing status: pending (uploaded), processing (analyzing), completed (done), failed (error)';
COMMENT ON COLUMN documents.identified_risks IS 'Array of risk objects from LLM analysis';
COMMENT ON COLUMN documents.clarifying_questions IS 'Array of question objects from LLM analysis';
