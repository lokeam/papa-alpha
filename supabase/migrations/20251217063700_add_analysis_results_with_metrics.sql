-- WHAT: Add unified analysis_results with denormalized metrics
-- WHEN: 2024-12-17
-- WHY: Store complete LLM analysis in JSONB for flexibility, with extracted metrics for fast queries

BEGIN;

-- ============================================================================
-- 1. Add analysis_results column (source of truth)
-- ============================================================================

ALTER TABLE documents
ADD COLUMN analysis_results JSONB DEFAULT NULL;

COMMENT ON COLUMN documents.analysis_results IS
'Complete LLM analysis results from all 4 categories. Source of truth for analysis data.
Structure: {
  "risks": {"section_analyzed": {...}, "analysis_summary": {...}, "risks": [...]},
  "accessibility": {"accessibility_score": {...}, "barriers": [...]},
  "questions": {"urgency_breakdown": {...}, "questions": [...]},
  "subcontracting": {"analysis_summary": {...}, "opportunities": [...]},
  "partial_results": false,
  "errors": []
}';

-- ============================================================================
-- 2. Add denormalized metric columns (for faster queries)
-- ============================================================================

ALTER TABLE documents
ADD COLUMN small_business_score INTEGER CHECK (small_business_score BETWEEN 0 AND 10),
ADD COLUMN risk_count INTEGER DEFAULT 0,
ADD COLUMN high_risk_count INTEGER DEFAULT 0,
ADD COLUMN question_count INTEGER DEFAULT 0,
ADD COLUMN high_urgency_question_count INTEGER DEFAULT 0,
ADD COLUMN subcontracting_opportunity_count INTEGER DEFAULT 0;

COMMENT ON COLUMN documents.small_business_score IS 'Extracted from analysis_results for fast filtering (0-10 scale)';
COMMENT ON COLUMN documents.risk_count IS 'Total number of identified risks';
COMMENT ON COLUMN documents.high_risk_count IS 'Number of HIGH severity risks';
COMMENT ON COLUMN documents.question_count IS 'Total number of clarifying questions';
COMMENT ON COLUMN documents.high_urgency_question_count IS 'Number of HIGH urgency questions';
COMMENT ON COLUMN documents.subcontracting_opportunity_count IS 'Number of subcontracting opportunities identified';

-- ============================================================================
-- 3. Create trigger function to auto-update metrics
-- ============================================================================

CREATE OR REPLACE FUNCTION update_document_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only update if analysis_results is present
  IF NEW.analysis_results IS NOT NULL THEN

    -- Extract small business score
    NEW.small_business_score := (
      NEW.analysis_results->'accessibility'->'accessibility_analysis'->>'final_score'
    )::NUMERIC::INTEGER;

    -- Extract risk counts
    NEW.risk_count := COALESCE(
      jsonb_array_length(NEW.analysis_results->'risks'->'risks'),
      0
    );

    NEW.high_risk_count := COALESCE(
      jsonb_array_length(
        jsonb_path_query_array(
          NEW.analysis_results,
          '$.risks.risks[*] ? (@.severity == "HIGH")'
        )
      ),
      0
    );

    -- Extract question counts
    NEW.question_count := COALESCE(
      jsonb_array_length(NEW.analysis_results->'questions'->'questions'),
      0
    );

    NEW.high_urgency_question_count := COALESCE(
      jsonb_array_length(
        jsonb_path_query_array(
          NEW.analysis_results,
          '$.questions.questions[*] ? (@.urgency == "HIGH")'
        )
      ),
      0
    );

    -- Extract subcontracting opportunity count
    NEW.subcontracting_opportunity_count := COALESCE(
      jsonb_array_length(NEW.analysis_results->'subcontracting'->'opportunities'),
      0
    );

  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_document_metrics() IS
'Automatically extracts metrics from analysis_results JSONB and populates denormalized columns.
Triggered on INSERT or UPDATE of analysis_results.';

-- ============================================================================
-- 4. Create trigger
-- ============================================================================

CREATE TRIGGER update_document_metrics_trigger
  BEFORE INSERT OR UPDATE OF analysis_results ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_metrics();

-- ============================================================================
-- 5. Backfill analysis_results from old columns (if any completed documents exist)
-- ============================================================================

UPDATE documents
SET analysis_results = jsonb_build_object(
  'risks', COALESCE(identified_risks, '{}'::jsonb),
  'accessibility', jsonb_build_object(
    'accessibility_analysis', jsonb_build_object(
      'final_score', CASE WHEN small_business_accessible THEN 8 ELSE 4 END
    )
  ),
  'questions', COALESCE(clarifying_questions, '{}'::jsonb),
  'subcontracting', COALESCE(subcontracting_opportunities, '{}'::jsonb),
  'partial_results', false,
  'errors', '[]'::jsonb
)
WHERE status = 'completed'
  AND analysis_results IS NULL
  AND (identified_risks IS NOT NULL OR clarifying_questions IS NOT NULL OR subcontracting_opportunities IS NOT NULL);

-- Trigger will automatically populate metric columns from above update

-- ============================================================================
-- 6. Create indexes for performance
-- ============================================================================

-- B-tree indexes for fast filtering/sorting on metrics
CREATE INDEX idx_documents_small_business_score
  ON documents(small_business_score)
  WHERE small_business_score IS NOT NULL;

CREATE INDEX idx_documents_high_risk_count
  ON documents(high_risk_count)
  WHERE high_risk_count > 0;

CREATE INDEX idx_documents_question_count
  ON documents(question_count)
  WHERE question_count > 0;

-- GIN index for flexible JSONB queries
CREATE INDEX idx_documents_analysis_results
  ON documents USING GIN (analysis_results);

-- ============================================================================
-- 7. Keep old columns for backwards compatibility (optional)
-- ============================================================================
-- We're NOT dropping old columns yet to maintain backwards compatibility
-- They can be dropped in a future migration after confirming everything works

-- Future migration to drop old columns:
-- ALTER TABLE documents DROP COLUMN identified_risks;
-- ALTER TABLE documents DROP COLUMN clarifying_questions;
-- ALTER TABLE documents DROP COLUMN subcontracting_opportunities;
-- ALTER TABLE documents DROP COLUMN small_business_accessible;
-- ALTER TABLE documents DROP COLUMN small_business_reasoning;
-- ALTER TABLE documents DROP COLUMN raw_llm_response;

COMMIT;

-- ============================================================================
-- Example queries for verification
-- ============================================================================

-- Query 1: Fast dashboard query using denormalized fields
-- SELECT id, filename, small_business_score, high_risk_count, question_count
-- FROM documents
-- WHERE status = 'completed' AND high_risk_count >= 3
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Query 2: Detailed view using full JSONB
-- SELECT id, filename, analysis_results
-- FROM documents
-- WHERE id = 'some-uuid';

-- Query 3: Flexible JSONB query (no schema change needed)
-- SELECT id, filename
-- FROM documents
-- WHERE analysis_results @> '{"risks": {"analysis_summary": {"overall_risk_level": "HIGH"}}}';

-- Query 4: Verify trigger is working
-- SELECT id, filename, small_business_score, risk_count, high_risk_count
-- FROM documents
-- WHERE analysis_results IS NOT NULL
-- LIMIT 5;