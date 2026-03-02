# Refinery — CLAUDE.md

AI-powered manuscript analysis and refinement platform ("Where Prose Becomes Perfect").

---

## Project Overview

Refinery is a full-stack web application that uses the Anthropic Claude API to perform
craft-level analysis of long-form prose manuscripts (novels, dissertations, screenplays,
etc.). Users upload manuscripts and run one or more analysis modules that return scored
feedback and actionable suggestions.

---

## Tech Stack

| Layer      | Technology                                           |
|------------|------------------------------------------------------|
| Backend    | Python 3.12, FastAPI, SQLAlchemy (async), Alembic    |
| AI         | Anthropic Claude API (`anthropic` SDK)               |
| Database   | PostgreSQL 16 (asyncpg driver)                       |
| Cache/Queue| Redis 7, Celery                                      |
| Payments   | Stripe                                               |
| Frontend   | React 18, Vite, Tailwind CSS, React Router v6        |
| Containers | Docker / docker-compose                              |

---

## Repository Layout

```
Refinery/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, middleware, router mounts
│   │   ├── config.py            # Pydantic-settings Settings class (reads .env)
│   │   ├── api/routes/          # One file per route group (auth, manuscripts, analysis, …)
│   │   ├── core/
│   │   │   ├── database.py      # Async SQLAlchemy engine + session + Base
│   │   │   └── security.py      # JWT creation/verification, password hashing
│   │   ├── models/              # SQLAlchemy ORM models (user, manuscript, analysis, enterprise)
│   │   └── services/            # Business logic + Claude integrations
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root router + protected/public route wrappers
│   │   ├── components/          # Feature-scoped component directories
│   │   ├── context/             # React context providers (AuthContext)
│   │   └── services/            # Axios API client helpers
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── docker-compose.yml
```

---

## Development Setup

### Prerequisites
- Docker & docker-compose **or** Python 3.12 + Node 20 + PostgreSQL 16 + Redis 7
- An Anthropic API key

### Quickstart (Docker)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set ANTHROPIC_API_KEY (and optionally Stripe keys)

docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# API docs: http://localhost:8000/docs
```

### Local (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in ANTHROPIC_API_KEY and DATABASE_URL etc.
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

> The backend's CORS allow-list includes both `http://localhost:3000` and
> `http://localhost:5173`.

---

## Environment Variables

All backend configuration lives in `backend/.env` (see `.env.example`).
Key variables:

| Variable              | Purpose                                      |
|-----------------------|----------------------------------------------|
| `DATABASE_URL`        | Async PostgreSQL URL (`postgresql+asyncpg://…`) |
| `DATABASE_SYNC_URL`   | Sync PostgreSQL URL (used by Alembic)        |
| `REDIS_URL`           | Redis connection string                      |
| `SECRET_KEY`          | JWT signing secret — **change in production**|
| `ANTHROPIC_API_KEY`   | Required for all analysis features           |
| `CLAUDE_MODEL`        | Defaults to `claude-sonnet-4-5-20250929`     |
| `STRIPE_SECRET_KEY`   | Optional — enables payment routes            |
| `DEBUG`               | Set to `true` for SQLAlchemy echo logging    |

---

## API Design Conventions

- Base path: `/api/v1` (set by `settings.API_PREFIX`).
- Route handlers return **plain dicts or Pydantic models directly** — there is no
  envelope wrapper (`api_response()` etc.).
- Authentication: OAuth2 Bearer JWT. Obtain a token via `POST /api/v1/auth/login`
  (form-data: `username`, `password`).
- Dependency `get_current_user` (from `app.core.security`) is used in every
  protected endpoint via FastAPI's `Depends`.
- Database sessions are provided by `get_db` (from `app.core.database`), which
  commits on success and rolls back on exception.

### Route files

| File             | Prefix                  | Description                              |
|------------------|-------------------------|------------------------------------------|
| `auth.py`        | `/api/v1/auth`          | Signup, login, profile, tier upgrade     |
| `manuscripts.py` | `/api/v1/manuscripts`   | Upload (docx/pdf/txt/rtf), list, get, delete |
| `analysis.py`    | `/api/v1/analysis`      | Run and retrieve analysis modules        |
| `reports.py`     | `/api/v1/reports`       | Generate polished PDF/HTML reports       |
| `exports.py`     | `/api/v1/exports`       | Export annotated manuscript files        |
| `advisor.py`     | `/api/v1/advisor`       | Advisor–student workflow (Academic/Advisor tiers) |
| `enterprise.py`  | `/api/v1/enterprise`    | Org management, RBAC, batch actions, webhooks |
| `payments.py`    | `/api/v1/payments`      | Stripe checkout and webhook handling     |

---

## User Tiers & Feature Access

| Tier         | Analysis modules available                                             |
|--------------|------------------------------------------------------------------------|
| `free`       | X-Ray, Intelligence Engine, Prose Refinery                             |
| `pro`        | + Voice Isolation, Pacing Architect, Character Arc, Revision Center    |
| `academic`   | + Argument Coherence, Citation Architecture, Academic Voice            |
| `advisor`    | Same as academic + advisor–student management                          |
| `enterprise` | All modules + Acquisition Score, org management, batch workflows       |

Tier access for each analysis type is defined in `TIER_ACCESS` dict inside
`backend/app/api/routes/analysis.py`.

---

## Analysis Modules (Services)

Each module lives in `backend/app/services/` and is called from `analysis.py`:

| Module                  | Service file                  | Key function                      |
|-------------------------|-------------------------------|-----------------------------------|
| X-Ray / Intelligence    | `intelligence_engine.py`      | `run_manuscript_xray()`           |
| Prose Refinery          | `prose_refinery.py`           | `run_prose_analysis()`            |
| Voice Isolation         | `voice_isolation.py`          | `run_voice_analysis()`            |
| Pacing Architect        | `pacing_architect.py`         | `run_pacing_analysis()`           |
| Character Arc           | `character_arc.py`            | `run_character_arc_analysis()`    |
| Revision Center         | `revision_center.py`          | `aggregate_edit_queue()`          |
| Argument Coherence      | `argument_coherence.py`       | `run_argument_analysis()`         |
| Citation Architecture   | `citation_architecture.py`    | `run_citation_analysis()`         |
| Academic Voice          | `academic_voice.py`           | `run_academic_voice_analysis()`   |
| Acquisition Score       | `acquisition_score.py`        | `compute_acquisition_score()`     |

The shared Anthropic client is obtained via `get_claude_client()` in
`services/claude_client.py`.

---

## Database Models

| Model              | File                     | Notes                                      |
|--------------------|--------------------------|--------------------------------------------|
| `User`             | `models/user.py`         | Includes `UserTier` enum, Stripe fields    |
| `Manuscript`       | `models/manuscript.py`   | Stores `raw_text` + `chapters_json`        |
| `AnalysisResult`   | `models/analysis.py`     | Per-module scores + `results_json` blob    |
| `Organization`     | `models/enterprise.py`   | Enterprise org with `webhook_api_key`      |
| `OrgMembership`    | `models/enterprise.py`   | RBAC roles: reader, editor, director, admin|
| `Annotation`       | `models/enterprise.py`   | Inline manuscript comments                 |
| `ManuscriptDecision` | `models/enterprise.py` | 4-stage decision workflow                  |
| `AdvisorAssignment`| `models/enterprise.py`   | Advisor–student linking                    |
| `InvitationCode`   | `models/enterprise.py`   | Time-limited invite codes                  |

The database schema is created automatically on startup via
`Base.metadata.create_all` in `core/database.py → init_db()`.

---

## Frontend Structure

React components are organised by feature under `frontend/src/components/`:

- `Auth/` — Login, Signup
- `Dashboard/` — User dashboard
- `Upload/` — Single file upload
- `Analysis/` — ManuscriptView, ProcessingView
- `IntelligenceEngine/`, `ProseRefinery/`, `VoiceIsolation/`, `PacingArchitect/`,
  `CharacterArc/`, `RevisionCenter/` — Feature views (Pro+)
- `Academic/` — ArgumentCoherenceView, CitationArchitectureView, AcademicVoiceView,
  AdvisorDashboardView
- `Enterprise/` — TriageDashboardView, BatchUploadView, ReaderReportView,
  RejectionLetterView, DecisionWorkflowView
- `Export/` — ExportModal
- `Landing/` — LandingPage (public marketing page)
- `Layout/` — App shell / navigation

Authentication state is managed via `context/AuthContext.jsx`.

Frontend API calls go to `http://localhost:8000/api/v1` in development; adjust
`VITE_API_URL` or the Vite proxy for other environments.

---

## Building & Running Tests

There is currently no automated test suite. To validate the backend manually:

```bash
# Start dependencies
docker-compose up db redis -d

# Run backend
cd backend
uvicorn app.main:app --reload

# Interactive API docs
open http://localhost:8000/docs
```

To build the frontend for production:

```bash
cd frontend
npm run build   # output in frontend/dist/
```

---

## Supported Manuscript File Types

`.docx`, `.pdf`, `.txt`, `.rtf` — parsed by `services/manuscript_parser.py`.

Word-count limits:
- Free tier: 50,000 words
- Pro+ tiers: 200,000 words
- Max upload size: 50 MB (configurable via `MAX_UPLOAD_SIZE_MB`)
