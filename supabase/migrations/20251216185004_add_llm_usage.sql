-- WHAT: Add LLM usage tracking to documents table
-- WHEN: 2025-12-16
-- WHY: Track OpenAI API usage metrics (tokens, cost, model) for internal monitoring


-- Add llm_usage column to store LLM metrics as JSONB
ALTER TABLE documents
ADD COLUMN llm_usage JSONB DEFAULT NULL;

COMMENT ON COLUMN documents.llm_usage IS
'LLM usage metrics for internal cost tracking and optimization. Structure: {
  "model": "gpt-4-turbo-preview",
  "input_tokens": 8234,
  "output_tokens": 1567,
  "total_tokens": 9801,
  "estimated_cost_usd": 0.14,
  "duration_seconds": 3.2,
  "timestamp": "2025-12-16T16:05:14.123Z"
}';

-- Index for querying by model - used for cost analysis
CREATE INDEX idx_documents_llm_usage_model ON documents
USING GIN ((llm_usage -> 'model'));

-- DEV NOTES: example queries for cost analysis
--
-- Grab total cost across all documents:
-- SELECT SUM((llm_usage->>'estimated_cost_usd')::decimal) as total_cost FROM documents WHERE llm_usage IS NOT NULL;
--
-- Get average tokens per document?
-- SELECT AVG((llm_usage->>'total_tokens')::integer) as avg_tokens FROM documents WHERE llm_usage IS NOT NULL;
--
-- Get documents by model:
-- SELECT id, filename, llm_usage->>'model' as model, llm_usage->>'estimated_cost_usd' as cost
-- FROM documents WHERE llm_usage->>'model' = 'gpt-4-turbo-preview';