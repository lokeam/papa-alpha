# Papa Alpha

**Papa Alpha** is a full-stack demonstration [RFP](https://www.investopedia.com/terms/r/request-for-proposal.asp) _procurement assistant_ powered by [GPT-4o-mini](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/) showcasing AI-driven document analysis for government IT procurement. 🏛️ 💻 The app analyzes RFP documents to identify risks, accessibility barriers, clarifying questions, and subcontracting opportunities—helping procurement teams improve solicitation quality before release.

## Screenshots

<img width="668" alt="pa_dashboard" src="https://github.com/user-attachments/assets/654910c7-3258-4f4e-84df-80ec9f922ae3" />
<img width="668" alt="pa_scope_page" src="https://github.com/user-attachments/assets/ccda6031-5be6-4a11-94e4-d27856484dba" />
<img width="668" alt="pa_scope_page_expanded" src="https://github.com/user-attachments/assets/1adf6bc4-5bb1-4b75-98bf-81ebf31ca834" />


## Architecture

### Frontend (Next.js 16 + TypeScript)
- **Framework**: Next.js 16 with App Router, React 19, TypeScript
- **Styling**: TailwindCSS 4 with custom design system
- **State Management**: React hooks with custom adapters for data transformation
- **Real-time Updates**: Redis pub/sub for live analysis progress tracking
- **Database**: Supabase (PostgreSQL) for document storage and analysis results

### Backend (Python + FastAPI)
- **Worker Service**: Async Python worker processing RFP analysis jobs
- **Queue**: Redis-backed job queue with blocking pop pattern
- **PDF Processing**: PyPDF2 + pdfplumber for text extraction
- **LLM Integration**: OpenAI GPT-4o-mini with structured JSON output
- **Analysis Categories**:
  - **Identified Risks**: Ambiguous language, evaluation criteria issues, [compliance gaps](https://loopio.com/blog/proposal-compliance-matrix/)
  - **Small Business Accessibility**: Barrier analysis with [0-10 scoring system](https://www.rfp.wiki/content/how-to-evaluate-rfp-responses-and-score-vendors-objectively)
  - **Clarifying Questions**: [Predicted vendor confusion](https://rfpplus.com/how-to-improve-your-rfp-vendor-selection-process/) with urgency categorization
  - **Subcontracting Opportunities**: Discrete work package identification

### Infrastructure
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Storage**: Supabase Storage for PDF documents
- **Queue & Pub/Sub**: Redis 7
- **Containerization**: Docker Compose for local development

## Key Features

### 1. Document Upload & Processing
- PDF upload with validation (max 50MB)
- Async job queue prevents concurrent analysis
- Real-time progress updates via Redis pub/sub
- Automatic text extraction and metadata parsing

### 2. Multi-Category Analysis
Parallel LLM analysis across four categories:
- **Risks**: Identifies ambiguous language, contradictions, and compliance issues with severity ratings
- **Accessibility**: Scores small business accessibility (0-10) based on insurance, experience, and qualification barriers
- **Questions**: Predicts vendor clarification questions with HIGH/MEDIUM/LOW urgency
- **Subcontracting**: Maps discrete work packages to NAICS codes with value estimates

### 3. Interactive Dashboard
- Summary cards with at-a-glance metrics
- Drill-down views for each analysis category
- List/detail pattern with side panels for item inspection
- Filtering, sorting, and accordion organization
- Cost tracking with token usage and processing time

### 4. Anti-Hallucination Prompt Engineering
Comprehensive strategies implemented:
- Structured JSON schemas with strict validation
- Chain-of-thought reasoning requirements
- Citation requirements (exact quotes + page numbers)
- Confidence scoring (0-100%) for each finding
- [Self-critique loops](https://arxiv.org/html/2512.15053) before output finalization
- Few-shot examples with edge case coverage

See [`workers/prompt_engineering.md`](workers/prompt_engineering.md) for detailed prompt specifications.

## Tech Stack

**Frontend**
- Next.js 16.0.8 (App Router)
- React 19.2.1
- TypeScript 5
- TailwindCSS 4
- Supabase JS Client 2.87.3
- IORedis 5.8.2 (pub/sub)

**Backend**
- Python 3.11+
- FastAPI 0.109.0
- Pydantic 2.5.0 (data validation)
- OpenAI 1.10.0 (GPT-4o-mini)
- Supabase Python Client 2.3.0
- Redis 5.0.0
- PyPDF2 3.0.0 + pdfplumber 0.10.0

**Infrastructure**
- Supabase (PostgreSQL + Storage + Auth)
- Redis 7 (Alpine)
- Docker Compose

## Project Structure

```
papa-alpha/
├── frontend/                 # Next.js application
│   ├── app/
│   │   ├── api/             # API routes (upload, documents, active jobs)
│   │   ├── dashboard/       # Analysis dashboard with scope drill-downs
│   │   ├── lib/             # Services, adapters, hooks, types
│   │   ├── upload/          # PDF upload page
│   │   └── processing/      # Real-time progress tracking
│   └── components/          # Reusable UI components
├── workers/                 # Python worker service
│   ├── models/              # Pydantic models for analysis results
│   ├── prompts/             # LLM prompt templates
│   ├── services/            # LLM, PDF, storage services
│   ├── worker.py            # Main worker loop
│   └── prompt_engineering.md # Prompt specifications
├── supabase/
│   └── migrations/          # Database schema migrations
└── docker-compose.yml       # Local development stack
```

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- Supabase CLI (for local development)
- OpenAI API key

### Environment Setup

1. **Clone and install dependencies**:
```bash
# Frontend
cd frontend
npm install

# Workers
cd ../workers
pip install -r requirements.txt
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Required variables:
```bash
# Supabase
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=your-openai-api-key
```

3. **Start local Supabase**:
```bash
supabase start
supabase db reset  # Apply migrations
```

4. **Start Redis and workers**:
```bash
docker-compose up -d
```

5. **Start frontend**:
```bash
cd frontend
npm run dev
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Development Tools

- **Redis Commander**: [http://localhost:8081](http://localhost:8081) - Visual Redis debugging
- **Supabase Studio**: [http://localhost:54323](http://localhost:54323) - Database management

## Usage Flow

1. **Upload RFP**: Navigate to `/upload` and select a PDF document
2. **Processing**: Real-time progress updates as worker extracts text and runs LLM analysis
3. **Dashboard**: View summary with 4 analysis categories
4. **Drill-down**: Click any category to explore detailed findings
5. **Export**: Review suggestions and export recommendations

## Analysis Pipeline

```
PDF Upload → Queue Job → Download PDF → Extract Text → LLM Analysis (4 categories) → Store Results → Publish Completion
```

**Phase 1** (Parallel):
- Risks Analysis
- Accessibility Analysis
- Subcontracting Analysis

**Phase 2** (Sequential):
- Questions Analysis (uses risks as context)

**Cost Tracking**:
- Per-category token usage
- Total cost in USD
- Processing time metrics

## Database Schema

### `documents` table
```sql
- id (uuid, primary key)
- filename (text)
- storage_path (text)
- status (enum: pending, processing, completed, failed)
- analysis_results (jsonb) -- Full analysis output
- llm_usage (jsonb) -- Token counts and costs
- created_at, updated_at (timestamps)
```

### Storage Buckets
- `documents`: PDF file storage with RLS policies

## API Endpoints

### Frontend API Routes
- `POST /api/upload` - Upload PDF and queue analysis job
- `GET /api/documents/active` - Check for active processing jobs
- `GET /api/documents/[id]` - Fetch document and analysis results
- `GET /api/progress/[id]` - SSE endpoint for real-time progress

## Prompt Engineering

The application implements comprehensive anti-hallucination strategies:

1. **Structured Output**: JSON schemas with strict validation
2. **Chain-of-Thought**: Explicit reasoning steps required
3. **Citations**: Exact quotes + page numbers mandatory
4. **Confidence Scoring**: 0-100% for each finding
5. **Self-Critique**: Model reviews output before finalizing
6. **Few-Shot Examples**: 2-3 examples per category
7. **Explicit Constraints**: What NOT to do clearly specified
8. **Grounding**: Must quote exact RFP text, cannot infer

See [`workers/prompt_engineering.md`](workers/prompt_engineering.md) for complete specifications.

## Testing

```bash
# Frontend type checking
cd frontend
npm run build

# Worker validation
cd workers
python scripts/validate_progress.py
```

## Deployment Considerations

- **Frontend**: Deploy to Vercel with environment variables
- **Workers**: Deploy to container platform (AWS ECS, GCP Cloud Run)
- **Database**: Supabase Cloud (production tier)
- **Redis**: Managed Redis (AWS ElastiCache, Redis Cloud)
- **Monitoring**: Add structured logging and error tracking
- **Scaling**: Horizontal worker scaling based on queue depth

## Cost Optimization

- **Model**: GPT-4o-mini selected for cost efficiency (~$0.15-0.60 per analysis)
- **Parallel Processing**: 3 of 4 categories run concurrently
- **Token Tracking**: Per-category usage monitoring
- **Caching**: Consider caching extracted text for re-analysis

## License

This is a demonstration project for technical evaluation purposes.

## Documentation

- [Prompt Engineering Specifications](workers/prompt_engineering.md)
- [Database Migrations](supabase/migrations/)
- [API Documentation](frontend/app/api/)

---

**Note**: This application is designed as a technical demonstration of AI-powered document analysis for government procurement workflows. It showcases modern full-stack architecture, async job processing, real-time updates, and production-grade prompt engineering techniques.
