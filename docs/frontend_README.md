# Frontend Application

Next.js 16 application providing the user interface for Papa Alpha's RFP analysis system. The frontend handles document uploads, displays real-time processing progress, and presents analysis results through an interactive dashboard.

## Architecture Overview

The application follows a layered architecture pattern that separates concerns and makes the codebase maintainable:

```
User Interface (Pages & Components)
         ↓
    Hooks (Data Fetching & State)
         ↓
   Adapters (Data Transformation)
         ↓
Services & Repositories (Business Logic)
         ↓
  External Systems (Supabase, Redis)
```

## Key Concepts

### 1. **Adapters Pattern**
Adapters transform backend data into formats the UI needs. This keeps components simple and decouples them from backend changes.

**Example:** Backend returns `severity: "HIGH"`, adapter converts to `priority: "high"` for UI components.

**Location:** `app/lib/adapters/`
- `analysis-adapter.ts` - Dashboard summary transformations
- `analysis-adapter-scope.ts` - Detail page transformations
- `storage-adapter.ts` - Supabase storage operations
- `queue-adapter.ts` - Redis queue operations

### 2. **Custom Hooks**
Hooks encapsulate data fetching and state management, making it reusable across components.

**Location:** `app/lib/hooks/`
- `useDocumentAnalysis.ts` - Fetches and transforms document analysis data
- `useUpdateProgress.ts` - Real-time progress updates via Server-Sent Events (SSE)

### 3. **Service Layer**
Services contain business logic and orchestrate multiple operations.

**Location:** `app/lib/services/`
- `document-service.ts` - Handles upload workflow: validate → upload → create record → queue job

### 4. **Repository Pattern**
Repositories handle database operations, providing a clean interface to Supabase.

**Location:** `app/lib/repositories/`
- `document-repository.ts` - CRUD operations for documents table

## Data Flow

### Upload Flow
```
User selects PDF
    ↓
DocumentService validates (type, size)
    ↓
StorageAdapter uploads to Supabase Storage
    ↓
DocumentRepository creates database record
    ↓
QueueAdapter pushes job to Redis
    ↓
User redirected to /processing page
```

### Analysis Display Flow
```
Page loads with documentId
    ↓
useDocumentAnalysis hook fetches data
    ↓
Adapters transform backend format to UI format
    ↓
Components render transformed data
```

### Real-time Progress Flow
```
Processing page opens SSE connection
    ↓
Worker publishes progress to Redis
    ↓
API route reads from Redis pub/sub
    ↓
useUpdateProgress hook receives updates
    ↓
Progress bar updates in real-time
```

## Project Structure

```
frontend/
├── app/
│   ├── api/                      # API routes (Next.js Route Handlers)
│   │   ├── upload/              # POST /api/upload - Handle file uploads
│   │   ├── documents/           # GET /api/documents/* - Fetch documents
│   │   └── progress/            # GET /api/progress/[id] - SSE progress stream
│   │
│   ├── lib/                      # Core application logic
│   │   ├── adapters/            # Data transformation layer
│   │   ├── hooks/               # Reusable React hooks
│   │   ├── repositories/        # Database access layer
│   │   ├── services/            # Business logic layer
│   │   ├── utils/               # Helper functions
│   │   └── types.ts             # TypeScript type definitions
│   │
│   ├── dashboard/               # Analysis results pages
│   │   ├── page.tsx             # Main dashboard (summary cards)
│   │   └── [scope]/             # Detail pages (risks, questions, etc.)
│   │       ├── page.tsx         # Scope router
│   │       ├── page-content/    # Content components per scope
│   │       ├── components/      # Shared UI components
│   │       ├── layouts/         # Layout components
│   │       └── side-detail-panels/ # Detail panels for list items
│   │
│   ├── upload/                  # PDF upload page
│   ├── processing/              # Real-time progress page
│   └── page.tsx                 # Home page
│
└── components/                   # Reusable UI components
    ├── file-upload/             # Drag-and-drop file upload
    ├── analysis-progress/       # Progress bar component
    ├── layout/                  # Page layout components
    ├── nav-bar/                 # Navigation
    └── ui/                      # Base UI components (icons, etc.)
```

## Key Pages

### 1. Home (`/`)
Entry point with three options (only "Generate from scope document" is active).

### 2. Upload (`/upload`)
- Drag-and-drop PDF upload
- Validates file type and size (max 50MB)
- Checks for active jobs (prevents concurrent processing)
- Redirects to processing page on success

### 3. Processing (`/processing/[documentId]`)
- Real-time progress updates via SSE
- Shows current step and progress percentage
- Auto-redirects to dashboard when complete

### 4. Dashboard (`/dashboard`)
- Summary cards for 4 analysis categories
- At-a-glance metrics (risk counts, accessibility score)
- Action items and next steps
- Click cards to drill into details

### 5. Scope Detail (`/dashboard/[scope]`)
Dynamic route handling 4 scopes:
- `small-business-accessibility` - Accessibility score and barriers
- `identified-risks` - Risks by severity with suggested fixes
- `clarifying-questions` - Predicted vendor questions by urgency
- `subcontracting-opportunities` - Subcontracting work packages

Each uses a **list/detail pattern**: click item in list to see details in side panel.

## API Routes

### POST `/api/upload`
Handles PDF upload workflow.

**Request:** `multipart/form-data` with `file` field
**Response:** `{ documentId, filename, status }`

### GET `/api/documents/[id]`
Fetches document with analysis results.

**Response:** `DocumentWithAnalysis` object

### GET `/api/documents/active`
Checks for active processing jobs.

**Response:** `{ documentId }` or `{ documentId: null }`

### GET `/api/documents/latest`
Fetches most recent completed document.

**Response:** `DocumentWithAnalysis` object

### GET `/api/progress/[documentId]`
Server-Sent Events stream for real-time progress.

**Response:** Stream of `{ step, progress, message, timestamp }` events

## Type System

The application uses TypeScript for type safety. Key type definitions in `app/lib/types.ts`:

### Backend Types (match Python models)
- `AnalysisResults` - Complete analysis output
- `RisksAnalysis` - Risks category
- `AccessibilityAnalysis` - Accessibility category
- `QuestionsAnalysis` - Questions category
- `SubcontractingAnalysis` - Subcontracting category

### UI Types (component-specific)
- `DashboardSummary` - Extracted metrics for dashboard
- `ActionItem` - High-priority items requiring attention
- `Badge` - Visual indicators (Excellent, Good, Needs Work)

### Adapter Flow
```typescript
// Backend format
interface Risk {
  severity: "HIGH" | "MEDIUM" | "LOW";
  exact_quote: string;
  // ... more fields
}

// UI format (after adapter)
interface ComponentRisk {
  priority: "high" | "medium" | "low";  // lowercase for CSS classes
  preview: string;                      // renamed for clarity
  // ... simplified fields
}
```

## State Management

No global state library (Redux, Zustand) is used. State is managed through:

1. **React hooks** - Local component state
2. **URL params** - Document ID passed via query string
3. **Server state** - Data fetched from API routes

This keeps the application simple and reduces complexity.

## Real-time Updates

Progress updates use **Server-Sent Events (SSE)** instead of WebSockets:

**Why SSE?**
- Simpler than WebSockets (one-way communication is sufficient)
- Automatic reconnection
- Works over HTTP (no special server setup)

**How it works:**
1. Processing page opens SSE connection to `/api/progress/[id]`
2. API route subscribes to Redis pub/sub channel
3. Worker publishes progress updates to Redis
4. API route forwards updates to browser
5. `useUpdateProgress` hook updates UI

## Styling

TailwindCSS 4 with custom design system:
- CSS variables for theme colors (supports dark mode)
- Inline styles for dynamic theming
- No CSS modules or styled-components

**Theme switching:**
```tsx
// Colors adapt to light/dark mode automatically
style={{
  backgroundColor: 'hsl(var(--card))',
  color: 'hsl(var(--foreground))'
}}
```

## Error Handling

Custom error classes in `app/lib/utils/error-handler.ts`:
- `ValidationError` - User input errors (400)
- `StorageError` - Supabase storage errors
- `DatabaseError` - Supabase database errors
- `QueueError` - Redis queue errors

API routes use `handleApiError()` to convert errors to appropriate HTTP responses.

## Development

### Running locally
```bash
cd frontend
npm install
npm run dev
```

Access at [http://localhost:3000](http://localhost:3000)

### Environment variables
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-key
REDIS_URL=redis://localhost:6379
```

### Type generation

**Supabase Auto-Generated Types**

The project uses Supabase CLI to auto-generate TypeScript types from the database schema. This keeps frontend and backend in sync automatically.

```bash
# Using Makefile (recommended):
make types-generate

# Or manually:
cd frontend && npm run types:generate
```

This generates `app/lib/types/database.ts` with type-safe interfaces for:
- Database tables (`documents`, etc.)
- Column types
- Relationships
- Enums

**When to regenerate:**
- After running database migrations (`supabase db reset`)
- After modifying table schemas
- When adding new columns or tables
- If you see TypeScript errors related to database queries

**Benefits:**
- Type safety for Supabase queries
- Auto-completion in IDE
- Catches schema mismatches at compile time
- No manual type definitions needed
- Frontend stays in sync with database changes

## Design Decisions

### Why adapters?
Backend data structures are optimized for LLM output and database storage. UI components need different shapes. Adapters keep both sides clean.

### Why no global state?
The application is primarily read-heavy with simple navigation. URL params and server state are sufficient. Adding Redux/Zustand would be over-engineering.

### Why Server-Sent Events?
Progress updates are one-way (server → client). SSE is simpler than WebSockets and has built-in reconnection.

### Why inline styles?
Theme switching requires dynamic colors. CSS variables + inline styles provide the most flexibility without CSS-in-JS libraries.

## Common Patterns

### Fetching data in a page
```typescript
export default function MyPage() {
  const { data, isLoading, error } = useDocumentAnalysis(documentId);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return <div>{/* render data */}</div>;
}
```

### Transforming backend data
```typescript
// In adapter
export function adaptRiskToComponent(risk: BackendRisk): ComponentRisk {
  return {
    id: risk.id,
    priority: risk.severity.toLowerCase(),
    preview: risk.exact_quote,
    // ... more transformations
  };
}

// In component
const risks = backendRisks.map(adaptRiskToComponent);
```

### Handling API errors
```typescript
try {
  const result = await documentService.uploadAndQueue(file);
  return NextResponse.json(result);
} catch (error) {
  return handleApiError(error); // Converts to appropriate HTTP response
}
```

## Quick Reference

**Need to add a new analysis category?**
1. Add types to `app/lib/types.ts`
2. Create adapter in `app/lib/adapters/`
3. Add content component in `app/dashboard/[scope]/page-content/`
4. Update scope router in `app/dashboard/[scope]/page.tsx`

**Need to modify the upload flow?**
- See `app/lib/services/document-service.ts`

**Need to change how data is displayed?**
- Check adapters in `app/lib/adapters/` first
- Then modify components

**Need to debug SSE connection?**
- Check `app/api/progress/[documentId]/route.ts`
- Check `app/lib/hooks/useUpdateProgress.ts`
- Monitor Redis pub/sub with Redis Commander

---

For backend documentation, see [`python_worker_README.md`](../python_worker_README.md)