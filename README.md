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
- **Docker & Docker Compose** - Container runtime
- **Node.js 20+** - Frontend runtime
- **Supabase CLI** - Local database management
  ```bash
  # macOS
  brew install supabase/tap/supabase

  # Other platforms: https://supabase.com/docs/guides/cli
  ```
- **OpenAI API key** - Required for GPT-4o-mini analysis

### Quick Start

The project uses a Makefile for simplified development workflow and ease of Developer Experience:

**1. First-time setup:**
```bash
make setup
```
This will:
- Check prerequisites (Docker, Node.js, Supabase CLI)
- Create `.env` from `.env.example`
- Install frontend dependencies
- Initialize Supabase
- Create uploads directory

**2. Start Supabase:**
```bash
supabase start
```
Copy the API keys from the output - you'll need them for the next step.

**3. Configure environment variables:**

**a) Create `frontend/.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=YOUR_SB_SECRET_HERE
SUPABASE_PROJECT_ID=papa-alpha

# Redis Local (not Docker)
REDIS_URL=redis://localhost:6379
```

**b) Edit root `.env`:**
```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase (Next.js)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SB_KEY_USED_FOR_YOUR_NEXT_CLIENT

# Worker specific (FastAPI)
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_SERVICE_KEY=YOUR_SB_SECRET_USED_FOR_YOUR_WORKER
SUPABASE_SERVICE_ROLE_KEY=YOUR_SB_SECRET_USED_FOR_YOUR_WORKER

# LLMs
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Redis
REDIS_URL=redis://redis:6379

# Environment
NODE_ENV=development
PYTHON_ENV=development
```

**Important:** Replace the placeholder values:
- `YOUR_SB_SECRET_HERE` - Service role key from `supabase start` output
- `YOUR_SB_KEY_USED_FOR_YOUR_NEXT_CLIENT` - Anon key from `supabase start` output
- `YOUR_SB_SECRET_USED_FOR_YOUR_WORKER` - Service role key (same as above)
- `YOUR_OPENAI_API_KEY_HERE` - Your OpenAI API key

**4. Run database migrations:**
```bash
supabase db reset
```
This applies all migrations and populates your tables. Verify by logging into [Supabase Studio](http://localhost:54323).

**5. Start the frontend:**
```bash
cd frontend
npm run dev
```
Frontend will be available at [http://localhost:3000](http://localhost:3000)

**6. Start the worker (in a separate terminal):**
```bash
make worker-restart
```

Optionally, watch worker logs:
```bash
make worker-logs
```

Access the application at [http://localhost:3000](http://localhost:3000)

### Daily Development

```bash
# Start everything
make start

# Stop everything (preserves data)
make stop

# Restart all services
make restart

# View service health
make health

# Watch worker logs
make worker-logs

# Watch real-time progress updates
make redis-subscribe
```

### Development Tools

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Supabase Studio**: [http://localhost:54323](http://localhost:54323) - Database management
- **Redis Commander**: [http://localhost:8081](http://localhost:8081) - Visual Redis debugging
- **Worker Health**: [http://localhost:8000/health](http://localhost:8000/health)

### Makefile Commands

Run `make help` to see all available commands:

**Setup & Initialization:**
- `make setup` - First-time setup
- `make check-ports` - Verify required ports are available

**Development:**
- `make start` - Start all services
- `make stop` - Stop all services (preserves data)
- `make restart` - Restart all services
- `make reset` - Clean slate (removes all data)

**Individual Services:**
- `make supabase-start` - Start Supabase only
- `make docker-up` - Start Docker services (worker + Redis)
- `make frontend-dev` - Start frontend only

**Monitoring:**
- `make health` - Check service health
- `make logs` - View all Docker logs
- `make worker-logs` - View worker logs
- `make redis-subscribe` - Watch real-time progress updates

**Cleanup:**
- `make clean` - Remove containers (preserves data)
- `make reset` - Remove everything including data

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

## Cost Optimization

- **Model**: GPT-4o-mini selected for cost efficiency (~$0.15-0.60 per analysis)
- **Parallel Processing**: 3 of 4 categories run concurrently
- **Token Tracking**: Per-category usage monitoring
- **Caching**: Consider caching extracted text for re-analysis

## License

This is a demonstration project for technical evaluation purposes.

## Documentation - Frontend, Worker & Prompt Engineering
- [Frontend](docs/frontend_README.md)
- [Python Worker](docs/python_worker_README.md)
- [Prompt Engineering Specifications](docs/prompt_engineering.md)

## Documentation - DB & API
- [Supabase Migrations](supabase/migrations/)
- [API Documentation](frontend/app/api/)

---

**Note**: This application is designed as a technical demonstration of AI-powered document analysis for government procurement workflows. It showcases modern full-stack architecture, async job processing, real-time updates, and production-grade prompt engineering techniques.
