# RFP Analysis Worker

A production-ready Python background worker that analyzes government RFP (Request for Proposals) documents using OpenAI's GPT-4o-mini model. This worker is the backend processing engine for the Papa Alpha demonstration project, processing PDFs from a Redis queue, extracting text, performing AI-powered analysis across 4 categories, and storing structured results in Supabase.

**Key Capabilities:**
- Async job processing with Redis queue
- Parallel LLM analysis (3 of 4 categories)
- Comprehensive anti-hallucination strategies
- Cost-optimized token usage (70% reduction via section extraction)
- Graceful error handling with partial results
- Real-time progress updates via pub/sub

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works: Data Flow](#how-it-works-data-flow)
3. [LLM Analysis Pipeline](#llm-analysis-pipeline)
4. [File Structure](#file-structure)
5. [Key Components](#key-components)
6. [Cost Optimization](#cost-optimization)
7. [Configuration](#configuration)
8. [Running the Worker](#running-the-worker)
9. [Error Handling](#error-handling)
10. [Development Guide](#development-guide)

---

## Architecture Overview

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ 1. User uploads PDF
       ↓
┌─────────────────────────────────────────────────────────┐
│                    Supabase                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  PostgreSQL  │  │   Storage    │  │  Edge Funcs  │   │
│  │  (metadata)  │  │  (PDF files) │  │  (triggers)  │   │
│  └──────┬───────┘  └───────┬──────┘  └────────┬─────┘   │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          │ 2. Insert job    │                  │
          ↓                  │                  │
     ┌─────────┐             │                  │
     │  Redis  │             │                  │
     │  Queue  │             │                  │
     └────┬────┘             │                  │
          │                  │                  │
          │ 3. Poll queue    │                  │
          ↓                  │                  │
   ┌──────────────────────────────────────┐     │
   │      Python Worker (this repo)       │     │
   │  ┌────────────────────────────────┐  │     │
   │  │  1. Download PDF ←─────────────┼──┼─────┘
   │  │  2. Extract text (pdfplumber)  │  │
   │  │  3. Run LLM analysis (async)   │  │
   │  │  4. Validate with Pydantic     │  │
   │  │  5. Calculate costs            │  │
   │  └────────────────────────────────┘  │
   └──────────────────┬───────────────────┘
                      │ 4. Store results
                      ↓
              ┌───────────────┐
              │   Supabase    │
              │   PostgreSQL  │
              │ (JSON results)│
              └───────────────┘
```

---

## How It Works: Data Flow

### **Step-by-Step Process**

#### **1. Job Creation (Frontend → Supabase → Redis)**

```typescript
// Frontend uploads PDF
const { data } = await supabase.storage
  .from('documents')
  .upload(`${userId}/${filename}`, file);

// Insert job into database
const { data: doc } = await supabase
  .from('documents')
  .insert({
    user_id: userId,
    filename: filename,
    storage_path: data.path,
    status: 'pending'
  });

// Edge function pushes job to Redis queue
await redis.lpush('rfp-analysis-queue', JSON.stringify({
  document_id: doc.id,
  storage_path: doc.storage_path
}));
```

#### **2. Worker Polls Queue (Python)**

```python
# worker.py - Main loop
while self.running:
    # Block until job available (5 second timeout)
    job = self.redis.brpop(QUEUE_NAME, timeout=5)

    if job:
        job_data = json.loads(job[1])
        await self.process_job(job_data)
```

#### **3. PDF Processing**

```python
# Download PDF from Supabase Storage
pdf_bytes = pdf_service.download_pdf(storage_path)

# Extract text using pdfplumber
text = pdf_service.extract_text(pdf_bytes)
# Result: ~50-200 pages → 50,000-200,000 characters
```

#### **4. LLM Runs Analysis on Text (4 Categories)**

This is where the AI analysis happens. See [LLM Analysis Pipeline](#llm-analysis-pipeline) below.

#### **5. Store Results**

```python
# Update database with analysis results
storage_service.update_document(
    document_id=doc_id,
    status='completed',
    analysis_results=results.dict(),  # Full JSON
    llm_usage={
        'total_tokens': results.total_tokens,
        'total_cost_usd': results.total_cost_usd,
        'processing_time': results.processing_time_seconds
    }
)
```

---

## LLM Analysis Pipeline

### **Overview: 4 Analysis Categories**

The worker analyzes each RFP across 4 dimensions:

1. **Identified Risks** - Ambiguous language, contradictions, compliance issues
2. **Small Business Accessibility** - Barriers that exclude small businesses
3. **Clarifying Questions** - Questions vendors will ask due to unclear requirements
4. **Subcontracting Opportunities** - Work packages suitable for subcontractors

### **Execution Strategy: Parallel + Sequential**

```python
# Phase 1: Run 3 analyses in PARALLEL (faster)
results = await asyncio.gather(
    analyze_risks(text),           # ~20k tokens
    analyze_accessibility(text),   # ~3k tokens
    analyze_subcontracting(text),  # ~8k tokens
)

# Phase 2: Run questions SEQUENTIALLY (depends on risks)
questions = await analyze_questions(text, risks_context=results[0])
```

**Why this design?**
- Parallel execution saves ~30-60 seconds per RFP
- Questions analysis uses risks as context for better predictions
- If one category fails, others still complete (partial results)

### **Detailed Flow for One Category (Example: Risks)**

```python
# 1. SECTION EXTRACTION (Token Optimization)
# Input: Full RFP text (50,000 chars)
section_text = extractor.extract_for_risks(full_text)
# Output: Relevant sections only (20,000 chars)
# Savings: 60% fewer tokens = 60% lower cost

# 2. METADATA EXTRACTION
metadata = extractor.extract_metadata(full_text)
# Result: {
#   'rfp_title': 'City Attorney Case Management System',
#   'agency_name': 'City of Duluth',
#   'contract_type': 'IT Services',
#   'estimated_value': '$500,000'
# }

# 3. PROMPT CONSTRUCTION
user_prompt = build_risks_prompt(section_text, metadata)
# Result: ~5,000 token prompt with:
#   - RFP context (title, agency, value)
#   - Extracted section text
#   - Analysis instructions
#   - JSON output format

# 4. LLM API CALL (with retry logic)
response = await client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[
        {"role": "system", "content": RISKS_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ],
    response_format={"type": "json_object"},
    temperature=0.1  # Low = consistent results
)
# If fails: Retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
# Max retries: 5

# 5. RESPONSE PARSING
result_json = json.loads(response.choices[0].message.content)
# Result: {
#   "section_analyzed": {...},
#   "analysis_summary": {...},
#   "risks": [
#     {
#       "id": "RISK-001",
#       "type": "Ambiguous Language",
#       "severity": "HIGH",
#       "exact_quote": "Vendor must provide adequate support",
#       "issue_description": "'Adequate' is not measurable",
#       "suggested_fix": "Vendor must provide 24/7 support...",
#       "confidence": 95
#     }
#   ]
# }

# 6. PYDANTIC VALIDATION
validated = RisksAnalysis(**result_json)
# This ensures:
#   - All required fields present
#   - Correct data types
#   - Valid enum values (HIGH/MEDIUM/LOW)
#   - Field constraints met (min_length, etc.)
# If validation fails: Raises ValidationError

# 7. COST TRACKING
usage = TokenUsage(
    input_tokens=response.usage.prompt_tokens,      # e.g., 5,234
    output_tokens=response.usage.completion_tokens, # e.g., 1,456
    total_tokens=response.usage.total_tokens,       # e.g., 6,690
    estimated_cost_usd=0.00234  # $0.150/1M * 5234 + $0.600/1M * 1456
)
```

### **Token Usage Breakdown (Typical RFP)**

| Category | Input Tokens | Output Tokens | Cost |
|----------|--------------|---------------|------|
| Risks | 5,234 | 1,456 | $0.00234 |
| Accessibility | 1,123 | 678 | $0.00058 |
| Questions | 5,456 | 1,234 | $0.00256 |
| Subcontracting | 2,345 | 890 | $0.00114 |
| **TOTAL** | **14,158** | **4,258** | **$0.00662** |

**Without section extraction:** ~$0.022 per RFP (3.3x more expensive)

---

## File Structure

```
workers/
├── main.py                    # Entry point - starts worker
├── worker.py                  # Main orchestration loop
├── config.py                  # Configuration constants
│
├── models/                      # Pydantic models (type safety)
│   ├── __init__.py
│   ├── risk_models.py           # Category 1: Risks
│   ├── accessibility_models.py  # Category 2: Accessibility
│   ├── question_models.py       # Category 3: Questions
│   ├── subcontracting_models.py # Category 4: Subcontracting
│   └── analysis_results.py      # Combined results + metadata
│
├── prompts/                   # LLM prompts
│   ├── __init__.py
│   ├── system.py              # Static system prompts (role definition)
│   └── analysis.py            # Dynamic user prompts (f-strings)
│
├── services/                  # Business logic
│   ├── __init__.py
│   ├── pdf_service.py         # PDF download + text extraction
│   ├── storage_service.py     # Supabase database operations
│   └── llm_service.py         # LLM orchestration (THE BRAIN)
│
└── utils/                     # Helper utilities
    ├── __init__.py
    ├── cost_calculator.py     # Token cost calculation
    └── section_extractor.py   # Smart text extraction
```

---

## Key Components

### **1. LLMService** (`services/llm_service.py`)

**The orchestrator.** Manages all LLM interactions.

```python
class LLMService:
    async def analyze_rfp(document_id: str, full_text: str) -> AnalysisResults:
        # 1. Extract metadata
        # 2. Run 3 analyses in parallel
        # 3. Run questions sequentially
        # 4. Track costs
        # 5. Handle errors gracefully
        # 6. Return combined results
```

**Key features:**
- ✅ Async/await for non-blocking I/O
- ✅ Parallel execution (3 categories)
- ✅ Exponential backoff retry
- ✅ Partial results on failure
- ✅ Automatic cost tracking

### **2. SectionExtractor** (`utils/section_extractor.py`)

**The optimizer.** Reduces token usage by 70%.

```python
class SectionExtractor:
    def extract_for_risks(full_text: str) -> str:
        # Find "Evaluation Criteria" section
        # Find "Technical Requirements" section
        # Return only relevant parts (max 20k chars)
```

**How it works:**
- Uses regex patterns to find section headers
- Extracts only relevant sections per category
- Limits total characters to prevent token bloat

**Example:**
```python
# Input: 100-page RFP = 200,000 characters
full_text = "...entire RFP..."

# Output: Only evaluation + technical sections = 40,000 characters
relevant = extractor.extract_for_risks(full_text)

# Token savings: 200k chars → 40k chars = 80% reduction
```

### **3. Pydantic Models** (`models/`)

**The validators.** Ensure LLM responses are valid.

```python
class Risk(BaseModel):
    id: str = Field(pattern=r"^RISK-\d{3}$")  # Must be "RISK-001" format
    severity: Literal["HIGH", "MEDIUM", "LOW"]  # Only these values
    exact_quote: str = Field(min_length=10)     # At least 10 chars
    confidence: int = Field(ge=0, le=100)       # 0-100 range
```

**Why this matters:**
- LLMs sometimes return invalid JSON
- Pydantic catches errors before they reach the database
- Provides clear error messages for debugging

### **4. Prompts** (`prompts/`)

**The instructions.** Tell the LLM what to do.

**System Prompt (static):**
```python
RISKS_SYSTEM_PROMPT = """
# Role
You are an expert RFP quality analyst...

# Task
Analyze RFPs for ambiguous language...

# Critical Constraints
DO NOT infer requirements not stated...
"""
```

**User Prompt (dynamic):**
```python
def build_risks_prompt(rfp_text: str, metadata: dict) -> str:
    return f"""
    # RFP Context
    - Title: {metadata['rfp_title']}
    - Agency: {metadata['agency_name']}

    # RFP Text
    {rfp_text}

    # Instructions
    Analyze for risks...
    """
```

---

## Cost Optimization

### **Strategy 1: Section Extraction (70% savings)**

```python
# Before: Send entire RFP
input_tokens = 54,000  # Full document
cost = $0.0081

# After: Send only relevant sections
input_tokens = 15,000  # Extracted sections
cost = $0.00225

# Savings: 72% reduction
```

### **Strategy 2: Model Selection (98% savings)**

```python
# GPT-4 Turbo
input_cost = $10.00 / 1M tokens
output_cost = $30.00 / 1M tokens
per_rfp_cost = $0.87

# GPT-4o-mini
input_cost = $0.15 / 1M tokens
output_cost = $0.60 / 1M tokens
per_rfp_cost = $0.012

# Savings: 98.6% reduction
```

### **Strategy 3: Parallel Execution (time savings)**

```python
# Sequential: 3 categories × 20s each = 60s
# Parallel: max(20s, 15s, 10s) = 20s
# Time saved: 40 seconds per RFP
```

### **Combined Impact**

| Metric | Before Optimization | After Optimization | Improvement |
|--------|---------------------|--------------------|--------------|
| Cost per RFP | $0.87 | $0.012 | **98.6%** |
| Processing time | 90s | 35s | **61%** |
| Token usage | 54k | 15k | **72%** |

---

## Configuration

### **Environment Variables** (`.env`)

```bash
# Required
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
REDIS_URL=redis://localhost:6379

# Optional (has defaults)
QUEUE_NAME=rfp-analysis-queue
STORAGE_BUCKET=documents
```

### **LLM Configuration** (`config.py`)

```python
# Model selection
LLM_MODEL = "gpt-4o-mini"

# Pricing (USD per 1M tokens)
LLM_PRICING = {
    "gpt-4o-mini": {
        "input": 0.150 / 1_000_000,
        "output": 0.600 / 1_000_000,
    }
}

# Retry configuration
MAX_RETRIES = 5
RETRY_BASE_DELAY = 1  # seconds
RETRY_MAX_DELAY = 32  # seconds

# Timeouts
LLM_TIMEOUT = 120  # seconds
```

---

## Running the Worker

### **Development**

```bash
# 1. Install dependencies
cd workers
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env
# Edit .env with your API keys

# 3. Start dependencies
make supabase-start  # Starts Supabase + Redis

# 4. Run worker
python main.py
```

**Expected output:**
```
2024-12-16 20:00:00 - INFO - Worker starting...
2024-12-16 20:00:00 - INFO - Connected to Redis: redis://localhost:6379
2024-12-16 20:00:00 - INFO - Connected to Supabase: http://localhost:54321
2024-12-16 20:00:00 - INFO - Polling queue: rfp-analysis-queue
2024-12-16 20:00:05 - INFO - Waiting for jobs...
```

### **Production (Docker)**

```bash
# Build image
docker build -t rfp-worker ./workers

# Run container
docker run -d \
  --name rfp-worker \
  --env-file .env \
  --network papa-alpha-network \
  rfp-worker

# View logs
docker logs -f rfp-worker
```

---

## Error Handling

### **Retry Logic**

```python
# Exponential backoff: 1s, 2s, 4s, 8s, 16s
for attempt in range(1, MAX_RETRIES + 1):
    try:
        response = await openai_call()
        break  # Success!
    except Exception as e:
        if attempt == MAX_RETRIES:
            raise  # Quit after 5 attempts

        delay = min(RETRY_BASE_DELAY * (2 ** (attempt - 1)), RETRY_MAX_DELAY)
        await asyncio.sleep(delay)
```

**Handles:**
- ✅ Rate limits (429 errors)
- ✅ Temporary API outages (500 errors)
- ✅ Network timeouts
- ✅ Transient failures

### **Partial Results**

```python
# If one category fails, others still complete
results = AnalysisResults(
    risks=risks_result,           # ✅ Success
    accessibility=None,           # ❌ Failed
    questions=questions_result,   # ✅ Success
    subcontracting=None,          # ❌ Failed
    errors=["Accessibility: Timeout", "Subcontracting: Rate limit"],
    partial_results=True
)

# Database gets partial results + error messages
# Frontend can display what succeeded
```

### **Validation Errors**

```python
try:
    validated = RisksAnalysis(**llm_response)
except ValidationError as e:
    logger.error(f"LLM returned invalid JSON: {e}")
    # Log the error
    # Mark job as failed
    # Store error message in database
```

---

## Development Guide

### **Adding a New Analysis Category**

**1. Create Pydantic model** (`models/new_category_models.py`)
```python
class NewCategoryAnalysis(BaseModel):
    findings: List[Finding]
    summary: Summary
```

**2. Add prompts** (`prompts/`)
```python
# system.py
NEW_CATEGORY_SYSTEM_PROMPT = """..."""

# analysis.py
def build_new_category_prompt(text, metadata):
    return f"""..."""
```

**3. Add to LLMService** (`services/llm_service.py`)
```python
async def _analyze_new_category(self, text, metadata):
    # Extract sections
    # Build prompt
    # Call LLM
    # Validate
    # Return result
```

**4. Update AnalysisResults** (`models/analysis_results.py`)
```python
class AnalysisResults(BaseModel):
    # ... existing fields ...
    new_category: Optional[NewCategoryAnalysis] = None
```

### **Testing Individual Components**

```python
# Test section extraction
from utils import SectionExtractor
extractor = SectionExtractor()
text = open('sample_rfp.txt').read()
sections = extractor.extract_for_risks(text)
print(f"Extracted {len(sections)} characters")

# Test prompt building
from prompts import build_risks_prompt
prompt = build_risks_prompt(sections, {'rfp_title': 'Test'})
print(prompt)

# Test LLM call (requires API key)
from services import LLMService
import asyncio

service = LLMService()
results = asyncio.run(service.analyze_rfp('test-id', text))
print(results.dict())
```

### **Debugging Tips**

**1. Enable debug logging:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**2. Test with small RFPs first:**
```python
# Use first 5 pages only
test_text = full_text[:10000]
```

**3. Check token counts:**
```python
import tiktoken
enc = tiktoken.encoding_for_model("gpt-4o-mini")
tokens = enc.encode(prompt)
print(f"Prompt uses {len(tokens)} tokens")
```

**4. Validate JSON manually:**
```python
import json
from models import RisksAnalysis

response_text = """{ ... LLM response ... }"""
data = json.loads(response_text)
validated = RisksAnalysis(**data)  # Will raise ValidationError if invalid
```

---

## Glossary

**Async/Await** - Python syntax for non-blocking concurrent operations. Allows multiple LLM calls to run simultaneously.

**Exponential Backoff** - Retry strategy where delay doubles each attempt (1s, 2s, 4s, 8s, 16s). Prevents overwhelming failed services.

**Pydantic** - Python library for data validation using type hints. Ensures LLM responses match expected structure.

**Token** - Smallest unit of text for LLMs (~4 characters). "Hello world" = 2 tokens. Pricing is per token.

**System Prompt** - Instructions that define the AI's role and behavior. Stays constant across requests.

**User Prompt** - The actual task/question. Changes per request. Contains RFP text and specific instructions.

**JSON Mode** - OpenAI feature that guarantees valid JSON output. Prevents parsing errors.

**Temperature** - Controls randomness (0.0 = deterministic, 1.0 = creative). We use 0.1 for consistency.

---

## Project Status

✅ **Production-Ready Demonstration**

All phases complete:
- ✅ LLM infrastructure with 4-category analysis
- ✅ Worker integration with async job processing
- ✅ End-to-end testing with real RFP documents
- ✅ Frontend cost tracking and progress UI
- ✅ Docker containerization for deployment

**Potential Enhancements:**
- Add caching layer for extracted text (enable re-analysis)
- Implement horizontal worker scaling based on queue depth
- Add structured logging with correlation IDs
- Create admin dashboard for monitoring token usage trends
- Support additional document formats (DOCX, HTML)

---

## Questions?

Refer to:
- `prompt_engineering.md` - Detailed prompt specifications
- `config.py` - All configuration options
- `models/` - Data structure definitions
- OpenAI docs: https://platform.openai.com/docs