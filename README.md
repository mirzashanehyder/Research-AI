# ResearchHub AI

A full-stack **agentic research platform** that lets academics discover, import, analyse, and chat with academic papers — powered by Groq (Llama 3.3 70B), FAISS vector search, and a FastAPI + React 19 frontend.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React 19)                      │
│  Login · Dashboard · SearchPapers · Workspace · AIChat          │
│  AITools · UploadPDF · DocSpace                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / REST  (JWT Bearer)
┌────────────────────────▼────────────────────────────────────────┐
│                   FastAPI  (Python 3.11)                        │
│                                                                 │
│  Routers                 Agents                Utils            │
│  ────────────────        ──────────────────    ──────────────── │
│  /auth                   ImportAgent           RAGEngine        │
│  /workspaces             PDFAnalysisAgent      (FAISS + ST)     │
│  /papers                 DiscoveryAgent                         │
│  /search         ──▶     LiteratureAgent       Groq Client      │
│  /chat           ──▶     GapAgent              (llama-3.3-70b)  │
│  /ai-tools               CitationAgent                          │
│  /documents              RecommendationAgent   PDFProcessor     │
│                                                (pdfplumber)     │
└──────────┬──────────────────────────────────┬───────────────────┘
           │                                  │
    ┌──────▼──────┐                   ┌───────▼────────┐
    │ PostgreSQL  │                   │  FAISS indexes  │
    │ (SQLAlchemy │                   │  (per-workspace │
    │  2.0 async) │                   │   .index files) │
    └─────────────┘                   └────────────────┘
```

### RAG Chat data flow

```
User message
    │
    ▼
POST /chat
    │── FAISS search  (top-5 chunks, workspace-scoped)
    │── build_context() → excerpts + citation list
    │── Groq API  (llama-3.3-70b-versatile, strict academic prompt)
    ▼
AI response + citations → stored as Conversation row → returned to UI
```

### Research Discovery data flow

```
GET /search?q=…&workspace_id=…
    │
    ▼
ResearchDiscoveryAgent
    ├── arXiv API           (httpx async)
    ├── Semantic Scholar API
    ├── PubMed API
    ├── CrossRef API
    ├── IEEE Xplore API
    ├── Springer API
    ├── ACM API
    └── Selenium fallback per source  (run_in_executor, headless Chromium)
    │
    └── _deduplicate()  (fuzzywuzzy 85 % threshold)
    ▼
List[PaperResult] → JSON response
```

---

## Milestones shipped

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Project scaffold (FastAPI + Vite, Docker skeleton) | ✅ |
| 2 | Database models (SQLAlchemy 2.0 async) + Pydantic schemas | ✅ |
| 3 | Auth (JWT + bcrypt) + core routers | ✅ |
| 4 | RAG engine (FAISS + sentence-transformers) + chat + PDF upload | ✅ |
| 5 | ResearchDiscoveryAgent (7 APIs + 7 Selenium fallbacks) + /search | ✅ |
| 6 | 6 AI agents (literature, gap, citation, comparison, summary, recommendation) + /ai-tools | ✅ |
| 7 | Complete React frontend — 10 pages, dark mode, TanStack Query | ✅ |
| 8 | Docker Compose + Dockerfile + .gitignore + README | ✅ |

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 20+ |
| PostgreSQL | 15+ (or Docker) |
| Groq API key | free at console.groq.com |

Optional (for Selenium scraping fallbacks without Docker):
- Google Chrome / Chromium 120+

---

## Local development setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd ResearchAI

# Create backend .env
cp backend/.env.example backend/.env
# Edit backend/.env — at minimum set DATABASE_URL and GROQ_API_KEY
```

`backend/.env` minimum:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/researchai
SECRET_KEY=change-me-min-32-chars
GROQ_API_KEY=gsk_...
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API: http://localhost:8000  
Interactive docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Docker (recommended)

```bash
# 1. Configure secrets
cp backend/.env.example backend/.env
# Set GROQ_API_KEY (and any optional API keys) in backend/.env

# 2. Build and start everything
docker compose up --build

# 3. Without the selenium-hub container
docker compose up --build db backend frontend
```

| Service | URL |
|---------|-----|
| Frontend (React dev) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Selenium Hub | http://localhost:4444 |

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | ✅ | JWT signing secret (32+ random chars) |
| `GROQ_API_KEY` | ✅ | Groq API key — llama-3.3-70b-versatile |
| `IEEE_API_KEY` | optional | IEEE Xplore API key (falls back to Selenium) |
| `SPRINGER_API_KEY` | optional | Springer Nature API key |
| `SEMANTIC_SCHOLAR_API_KEY` | optional | Semantic Scholar API key |
| `CHROME_BIN` | auto (Docker) | Path to chromium binary |
| `CHROMEDRIVER_PATH` | auto (Docker) | Path to chromedriver binary |

---

## API reference

Full interactive docs at **http://localhost:8000/docs** (Swagger UI).

```
POST /auth/register          Create account
POST /auth/login             Get JWT token

GET  /workspaces             List workspaces
POST /workspaces             Create workspace
PUT  /workspaces/{id}        Update workspace
DEL  /workspaces/{id}        Delete workspace

GET  /search?q=&workspace_id= Discover papers across 7 sources

GET  /papers?workspace_id=   List imported papers
POST /import                 Import a paper into a workspace
POST /upload                 Upload PDF → extract → chunk → embed
DEL  /papers/{id}            Remove paper from workspace + FAISS index

POST /chat                   RAG chat (workspace-grounded, citations)
GET  /history?workspace_id=  Conversation history

POST /summary                Summarise selected papers
POST /review                 Generate a literature review
POST /research-gaps          Identify research gaps
POST /citations              Format citations (IEEE / APA / MLA / Chicago)
POST /compare                Compare papers in a structured table
POST /recommend              Suggest adjacent research topics

GET  /documents?workspace_id= List documents
POST /documents              Create document
PUT  /documents/{id}         Update document
DEL  /documents/{id}         Delete document
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI 0.104 |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Database | PostgreSQL 15 |
| Auth | python-jose JWT + passlib bcrypt |
| LLM | Groq — llama-3.3-70b-versatile |
| Vector search | FAISS IndexFlatL2, 384-dim |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 |
| PDF parsing | pdfplumber → PyPDF2 fallback |
| Web scraping | Selenium headless Chromium + webdriver-manager |
| HTTP client | httpx (async) |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Routing | react-router-dom v7 |
| Data fetching | TanStack Query v5 |
| HTTP client (FE) | Axios |
| Container | Docker Compose |

---

## Troubleshooting

**Backend won't start — "relation does not exist"**  
The lifespan handler calls `create_all` at startup. Verify the DB is reachable and `DATABASE_URL` is correct.

**Groq 401 — authentication failed**  
Check that `GROQ_API_KEY` in `backend/.env` starts with `gsk_` and is not expired.

**FAISS import error on Windows**  
`faiss-cpu` wheels are available for Python 3.11 on Windows. If install fails:
```bash
pip install faiss-cpu --extra-index-url https://download.pytorch.org/whl/cpu
```

**Selenium returns empty results**  
Selenium fallbacks require Chrome/Chromium. In Docker the image installs Chromium automatically. Locally, webdriver-manager downloads a matching driver — ensure Chrome is installed.

**"No papers in workspace" after PDF upload**  
Check backend logs. If both pdfplumber and PyPDF2 fail to extract text (e.g. scanned-image-only PDF), the chunk count will be 0.

**CORS errors in the browser**  
Add your frontend origin to the `origins` list in `backend/main.py`.

**Dark mode doesn't persist after refresh**  
Dark mode is stored in `localStorage` under the key `theme`. Ensure the browser isn't clearing storage between sessions.
