# CLAUDE.md — Refinery

## Project Overview

**Refinery** is an AI-powered manuscript analysis and refinement SaaS platform. Its tagline is "Where Prose Becomes Perfect." It operates at full-manuscript scale — holding an entire 80,000-word document in memory simultaneously — to provide editorial intelligence across three distinct product lines.

The repository is currently in the **pre-development phase**. Design documents are complete; no source code exists yet. This file captures the architecture, conventions, and workflows that development should follow.

---

## Product Lines

| Product Line | Primary Customer | Pricing |
|---|---|---|
| **Indie Author** (Free / Pro) | Self-published novelists, genre fiction writers | Free / $29/mo / $249/yr |
| **Academic** | Graduate students, doctoral candidates, dissertation advisors | $29/mo (student) / $79/mo (advisor) |
| **Enterprise Publishing** | Acquisition editors, literary agencies, academic publishers | $500–$2,500+/mo |

All three product lines share a common backend (the **Refinery Intelligence Engine**) with distinct frontends and feature gates.

---

## Tech Stack

### Backend
- **Framework**: Flask or FastAPI (Python)
- **AI Layer**: Anthropic Claude API (long-context, full-document processing)
- **Async Processing**: Celery for manuscript analysis jobs
- **Database**: PostgreSQL 15 (users, manuscripts, analysis results, audit logs)
- **Graph Database**: Neo4j (character relationship graph, scene cross-reference, timeline nodes)
- **File Storage**: S3 or MinIO (raw manuscript files, processed text, exports)
- **Cache / Queue**: Redis 7 (job queues, session cache, rate limit counters)
- **Auth**: JWT (stateless), OAuth (institutional SSO)
- **Text Extraction**: `python-docx` (`.docx`), `pdfplumber` (`.pdf`), `striprtf` (`.rtf`)
- **PDF Generation**: ReportLab

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state; polling interval 5000ms on analysis status
- **Error Handling**: React ErrorBoundary per module view

### Security
- TLS 1.3 in transit
- AES-256 at rest
- SOC 2 Type II roadmap
- GDPR / CCPA compliant; manuscript content never used for model training without explicit opt-in
- Zero-retention option for Enterprise (manuscripts deleted within 24 hours of analysis)
- FERPA compliance for Academic institutional tier

---

## Six Core Analysis Modules

All product lines share these modules (access gated by tier):

| # | Module | Core Function |
|---|---|---|
| 1 | **Manuscript Intelligence Engine** | Duplication detection, character census, timeline mapping, lexical fingerprint, metaphor density heatmap |
| 2 | **Voice Isolation Lab** | Dialogue extraction, voice fingerprinting, jargon bleed detection, blind voice test, similarity scoring |
| 3 | **Pacing Architect** | Chapter-level action/emotion beat mapping, tension curve, breathing space flags, slow zone flags |
| 4 | **Character Arc Workshop** | Arc tracking (Want/Fear/Belief/Behavior), transformation validation, alternative arc generation |
| 5 | **Prose Refinery** | Tic detection, filter word analysis, show-vs-tell flagging, sentence rhythm profiling |
| 6 | **Revision Command Center** | Prioritized edit queue (aggregates all modules), batch implementation, diff preview, version branching, regression detection |

**Academic-specific additions**: Argument Coherence Engine (replaces Pacing Architect), Citation & Source Architecture, Academic Voice Calibration, Dissertation Committee Report Generator, Advisor Dashboard.

**Enterprise-specific additions**: Acquisition Score (composite 0–100), Triage Dashboard, Multi-Editor Annotation Layer, Reader Report Generator, Rejection Letter AI Drafting, Batch Upload (up to 500 files), Webhook/REST API ingestion.

---

## System Architecture

### High-Level Architecture

```
Browser (React 18 + TypeScript + Tailwind)
        |
        v
API Gateway (Flask/FastAPI) — /api/v1/
        |
        +---> PostgreSQL 15 (primary data)
        |
        +---> Redis 7 (cache / Celery queue)
        |
        +---> Celery Workers (async manuscript processing)
        |         |
        |         +---> S3/MinIO (file storage)
        |         |
        |         +---> Claude API (AI analysis)
        |         |
        |         +---> Neo4j (manuscript graph)
        |
        +---> JWT Auth / OAuth SSO
```

### Manuscript Analysis Data Flow

1. **Upload**: User uploads file via React. Client-side validation (file type + max 5MB).
2. **Ingest**: API writes raw bytes to S3/MinIO; creates `Manuscript` record in PostgreSQL with `status=PENDING`; returns `manuscript_id`.
3. **Text Extraction**: Celery worker extracts clean text (`python-docx`, `pdfplumber`, `striprtf`).
4. **Chapter Detection**: Priority order: explicit heading styles → "Chapter N" patterns → all-caps short lines → 3+ consecutive blank lines before capitalized line → fallback: treat as single chapter.
5. **Text Normalization**: Smart quotes → straight quotes for internal processing; restored on export.
6. **AI Analysis**: Structured prompt templates per module; full document passed to Claude API; sliding window chunking for manuscripts exceeding context limits (2,000-token overlap between chunks; merge with deduplication).
7. **Result Storage**: Module results stored in PostgreSQL; cached—if manuscript version unchanged since last run, return cached result.
8. **Polling**: Frontend polls `/api/v1/manuscripts/{id}/status` every 5 seconds (TanStack Query `refetchInterval`); stops on `COMPLETE` or `ERROR`.

---

## API Structure

All endpoints versioned under `/api/v1/`. Authentication via `Bearer` token in `Authorization` header.

**Standard response envelope**:
```json
{
  "success": true,
  "data": {...},
  "error": null,
  "meta": { "request_id": "...", "timestamp": "..." }
}
```

### Core Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `POST /auth/register` | POST | None | Create user account; returns JWT + refresh token |
| `POST /auth/login` | POST | None | Email/password login; returns JWT + refresh token |
| `POST /auth/refresh` | POST | Refresh token | Issue new JWT |
| `GET /users/me` | GET | JWT | Return authenticated user profile and tier |
| `POST /manuscripts` | POST | JWT | Upload new manuscript; returns `manuscript_id` |
| `GET /manuscripts` | GET | JWT | List all manuscripts for authenticated user |
| `GET /manuscripts/{id}` | GET | JWT | Get manuscript metadata and processing status |
| `GET /manuscripts/{id}/status` | GET | JWT | Polling endpoint; returns status + % complete |
| `POST /manuscripts/{id}/analyze` | POST | JWT | Trigger analysis |
| `GET /manuscripts/{id}/analysis/{module}` | GET | JWT | Get module analysis result |
| `POST /manuscripts/{id}/export` | POST | JWT | Generate export file |
| `POST /api/v1/enterprise/batches` | POST | JWT | Trigger batch analysis |
| `POST /api/v1/manuscripts/{id}/reports/reader` | POST | JWT | Generate reader report PDF |
| `POST /webhooks/submission` | POST | API key | Enterprise webhook receiver |

---

## Data Models (PostgreSQL)

Key tables:

- **users**: id, email, password_hash, tier, created_at, ...
- **manuscripts**: id, user_id, title, status (PENDING/EXTRACTING/ANALYZING/COMPLETE/ERROR), word_count, chapter_count, s3_key, created_at, last_analyzed_at
- **analysis_results**: id, manuscript_id, module, result_json, version, created_at
- **edit_queue_items**: id, manuscript_id, module, severity (HIGH/MEDIUM/LOW), finding, suggestion, status (PENDING/ACCEPTED/REJECTED)
- **advisor_assignments**: id, advisor_user_id, student_user_id, created_at *(Academic tier only)*
- **enterprise_batches**: id, organization_id, manuscript_ids[], status, created_at

---

## AI Prompt Architecture

Each module uses a structured prompt template:

1. **System Prompt**: Defines AI role as professional developmental editor. Specifies exact output JSON schema. Instructs the model to return ONLY valid JSON with no prose preamble.
2. **Context Block**: Full manuscript text + metadata (title, word count, chapter list, character census).
3. **Task Block**: Module-specific analysis instructions with field definitions.
4. **Output Schema**: Inline JSON schema specification in the prompt to constrain response format.

**Token management**:
- Cache results when manuscript version is unchanged.
- Sliding window chunking for large manuscripts: 2,000-token overlap between chunks; merge results with deduplication.

---

## Accepted File Formats

| Format | Parser |
|---|---|
| `.docx` | `python-docx` (primary format) |
| `.pdf` | `pdfplumber` |
| `.txt` | Plain text; chapter detection via blank line + capitalized header heuristic |
| `.rtf` | `striprtf` (converts to `.txt` before processing) |

**Max file size**: 5MB (client-side validation enforced).

---

## Tier Feature Access Matrix

| Feature | Indie Free | Indie Pro | Academic | Enterprise |
|---|---|---|---|---|
| Manuscript Intelligence Engine | Limited | Full | Full | Full |
| Voice Isolation Lab | — | Full (w/ Blind Test) | Adapted | Full |
| Pacing Architect | Limited | Full | — (replaced) | Full |
| Character Arc Workshop | — | Full | Full | Full |
| Prose Refinery | — | Full | Full | Full |
| Revision Command Center | Limited | Full | Full | Full |
| Argument Coherence Engine | — | — | Full | — |
| Advisor Dashboard | — | — | Full (Advisor+) | — |
| Acquisition Score + Triage | — | — | — | Full |
| Multi-Editor Annotation | — | — | — | Full |
| Batch Upload (up to 500) | — | — | — | Full |
| Export to .docx (tracked changes) | — | Pro gate | Full | Full |
| Free analyses/month | 3 | Unlimited | Unlimited | Unlimited |

---

## Performance Requirements

| Requirement | Target |
|---|---|
| Manuscript X-ray diagnostic | < 90 seconds for manuscripts up to 120K words |
| Full module analysis | < 3 minutes for standard manuscript length |
| Academic full dissertation analysis | < 5 minutes for 100K-word document |
| Enterprise Acquisition Score + reader report | < 5 minutes per manuscript |
| Advisor dashboard load | < 3 seconds for up to 10 active student manuscripts |
| New user first meaningful insight | Within 10 minutes of upload |
| System uptime (Enterprise SLA) | 99.9% |
| Analysis status polling interval | 5 seconds |
| Auto-save interval | Every 60 seconds |
| Version history retention | 30 days |

---

## Testing Requirements

| Component | Coverage Target |
|---|---|
| Text extraction pipeline | 95% |
| Chapter detection heuristics | 90% |
| Character entity extraction | 85% |
| Acquisition Score algorithm | 95% |
| Authentication & authorization | 100% |
| File size + type validation | 100% |
| Analysis result storage + retrieval | 90% |

### Key Test Cases to Implement

- Valid `.docx`; corrupted file; zero chapters detected; 200K-word file; special characters; smart quotes; RTL text edge cases
- Novel with 20 named characters; single POV manuscript; manuscript with no dialogue; character with multiple name aliases
- Concurrent analysis runs; result versioning; cache hit vs. cache miss; partial module completion
- End-to-end pipeline error injection at each stage (verify graceful degradation and error state UI)
- Multi-user enterprise scenario: 3 editors annotating same manuscript simultaneously; verify no annotation conflicts or data loss

---

## MVP Sprint Plan

12-week Alpha MVP build: 6 two-week sprints.

| Sprint | Weeks | Goal | Key Deliverables |
|---|---|---|---|
| Sprint 1 | 1–2 | Foundation | User registration, login, file upload to S3; auth flow 100% passing |
| Sprint 2 | 3–4 | Ingestion + Graph | `.docx` upload → extracted text with correct chapter segmentation; Neo4j character graph; status polling end-to-end |
| Sprint 3 | 5–6 | Core Analysis I | Full analysis of 80K-word test manuscript in <3 min; results stored and retrievable via API; module scores computed |
| Sprint 4 | 7–8 | Core Analysis II | Voice and Pacing modules; Academic module with test dissertation; no regressions |
| Sprint 5 | 9–10 | Dashboard + Demo | End-to-end flow (upload → analyze → dashboard → export) for all three product types |
| Sprint 6 | 11–12 | Polish + Beta Prep | Stripe integration; mobile responsive; Sentry error logging; beta user onboarding |

**Beta milestones** (post-Sprint 6): Pacing Architect scene-level annotations, Character Arc Workshop basic tracking.

---

## MVP Exit / Pitchable Criteria

The MVP is considered pitchable when the founder can walk an investor through a live demo without hitting a blocking error.

### Indie Author Checklist
- Upload `.docx` and receive processing confirmation
- Health Dashboard loads with all 5 dimension scores
- Manuscript Intelligence Engine finds a planted duplicate chapter
- Filter word counts accurate vs. manual count in Word
- Voice Isolation Lab extracts dialogue for 3 named characters correctly
- Pacing Architect pulse graph renders for 30+ chapter manuscript
- Revision Command Center: accepting an item removes it from pending queue
- Export: clean `.docx` downloads and opens in Word without corruption
- Free vs. Pro gating: locked modules show upgrade prompt, not error
- Stripe checkout completes in test mode

### Enterprise Checklist
- Batch upload of 10 manuscripts processes without error
- Acquisition Score generated with score breakdown visible
- Triage queue sorts correctly by Acquisition Score; genre filter works
- Two editor accounts annotating same manuscript simultaneously without conflict
- Decision workflow advances with role gating enforced
- Reader Report PDF generated with auto-populated synopsis and findings
- Rejection letter AI draft generated with manuscript-specific references
- Webhook endpoint receives test POST and creates manuscript record correctly
- Full agency demo completable in <8 minutes without interruption

---

## Development Conventions

### API Design
- All endpoints under `/api/v1/`
- Standard JSON response envelope for all responses (see above)
- Bearer token authentication on all authenticated endpoints
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity, 500 Internal Server Error

### AI Integration
- Never call the Claude API synchronously in request handlers — always dispatch to Celery
- Cache module results: check `analysis_results` table before calling Claude API
- Always validate that the AI response is valid JSON before storing
- Log all Claude API calls (tokens used, latency, model version) for cost tracking

### Error Handling
- Analysis errors set `manuscript.status = ERROR`; store error message; surface error card in UI with "Try Again" button
- Log all exceptions to Sentry
- Never expose raw stack traces to the client

### File Handling
- Validate file type and size client-side before upload (max 5MB; accepted: `.docx`, `.txt`, `.pdf`, `.rtf`)
- Re-validate server-side before storing
- Write raw bytes to S3/MinIO before any processing
- Never process files synchronously in the API request handler

### Frontend
- Each module view wrapped in a React `ErrorBoundary`; module errors must not crash the full dashboard
- Polling uses TanStack Query `refetchInterval: 5000`; stop polling on `status === 'COMPLETE' || status === 'ERROR'`
- Pro-gated features show upgrade prompt UI, never an error state

### Security
- Sanitize all user inputs
- Never log manuscript content
- Enforce tier-based feature access server-side (never rely on client-side gating alone)
- Enterprise multi-editor: validate role permissions server-side on every state transition in the decision workflow

---

## Key Documents

| File | Description |
|---|---|
| `Refinery_FDD_v1.pdf` | Functional Design Document v1.0 — full screen specs, API contracts, data models, sprint plan, QA requirements |
| `Refinery_RDD_v1.pdf` | Requirements Definition Document v1.0 — product requirements, pricing, competitive positioning, risk register |
| `README.md` | Minimal project description |
| `Gemini_Generated_Image_8kbe3u8kbe3u8kbe.png` | Brand/product image asset |

---

## Development Roadmap

| Phase | Timeline | Success Criteria |
|---|---|---|
| Alpha MVP | Weeks 1–12 | End-to-end analysis <3 min; NPS >40 from beta; 0 critical security issues |
| Beta | Weeks 13–24 | 500+ beta users; 2 institutional pilots active; $75K+ Kickstarter; module completion rate >60% |
| V1 Launch | Month 7–9 | 1,000+ paying users; 1 enterprise pilot signed; MRR $25K+; <2% churn |
| V1.5 | Month 10–15 | 3+ enterprise clients; 2+ institutional academic licenses; 5,000+ users; MRR $75K+ |
| V2.0 | Month 16–20 | 10,000+ users; enterprise ARR $500K+; SOC 2 audit initiated |

---

## Acquisition Score Algorithm (Enterprise)

Composite 0–100 score. Default weights:

| Component | Weight | Source Module |
|---|---|---|
| Structural Integrity | 25% | Manuscript Intelligence Engine — duplication penalty + chapter coherence; >20% duplicate content = 0 in this component |
| Voice Distinctiveness | 20% | Voice Isolation Lab |
| Pacing Quality | 20% | Pacing Architect — tension curve shape; ideal: rising tension with breathing spaces; flat/inverted curves score <40 |
| Prose Craft | 20% | Prose Refinery — filter word density + show-vs-tell ratio + tic frequency (inverse scoring) |
| Narrative Originality | 15% | Cross-module AI holistic assessment of premise originality vs. genre tropes |

---

*Document generated: February 2026. Source: Refinery_FDD_v1.pdf and Refinery_RDD_v1.pdf.*
