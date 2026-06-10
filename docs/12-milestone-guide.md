# 12 — Milestone Guide

## Overview

8 milestones, each with a clear goal, verification step, and the Claude Code prompt to use.
Complete them in order — each one depends on the previous.

---

## Milestone 1: Project Setup & Structure
**Estimated time:** 30 minutes
**Goal:** Empty project with all folders, package.json, requirements.txt, Tailwind configured

### Steps
1. Open VS Code in your project root
2. Open Claude Code terminal
3. Paste **MILESTONE 1** prompt from `docs/11-claude-code-prompts.md`
4. Let it create all folders and files

### Verify
```bash
# Should show all folders
ls backend/
ls backend/models/
ls frontend/src/pages/

# Should install without errors
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

### Done When
- [ ] All folders exist as in `02-folder-structure.md`
- [ ] `pip install` completes without errors
- [ ] `npm install` completes without errors
- [ ] `tailwind.config.js` has `darkMode: 'class'`

---

## Milestone 2: Database Models
**Estimated time:** 45 minutes
**Goal:** All 8 SQLAlchemy models + Pydantic schemas + database.py

### Steps
1. Paste **MILESTONE 2** prompt into Claude Code
2. Review each model file created

### Verify
```bash
cd backend
source venv/bin/activate
python -c "from database import Base; print('DB OK')"
python -c "from models.user import User; print('User model OK')"
python -c "from models.paper import Paper; print('Paper model OK')"
```

### Done When
- [ ] All 8 model files created with no import errors
- [ ] Pydantic schemas in `backend/schemas/`
- [ ] `PaperResult` schema has all 8 fields (title, authors, abstract, publication_date, source_website, source_type, url, doi)

---

## Milestone 3: Auth + Core Backend
**Estimated time:** 1 hour
**Goal:** Working JWT auth, workspace CRUD, FastAPI app running

### Steps
1. Start PostgreSQL (local or Docker: `docker-compose up -d db`)
2. Update `backend/.env` with your database URL + JWT secret
3. Paste **MILESTONE 3** prompt into Claude Code
4. Run the backend

### Verify
```bash
cd backend && uvicorn main:app --reload
# → "Application startup complete"
# Open http://localhost:8000/docs

# Test registration
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}'
# → {"message": "User registered successfully", "user_id": 1}

# Test login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
# → {"access_token": "eyJ...", "token_type": "bearer", "role": "researcher"}
```

### Done When
- [ ] Backend starts without errors
- [ ] `/docs` shows all router endpoints
- [ ] Registration returns user_id
- [ ] Login returns JWT token
- [ ] Creating a workspace with token works

---

## Milestone 4: RAG Engine + PDF Pipeline
**Estimated time:** 1.5 hours
**Goal:** PDF upload works, chat returns workspace-grounded responses

### Steps
1. Add your `GROQ_API_KEY` to `backend/.env`
2. Paste **MILESTONE 4** prompt into Claude Code

### Verify
```bash
# Test PDF extraction
python -c "
from utils.pdf_processor import extract_text, chunk_text
text = extract_text('test.pdf')  # use any PDF
chunks = chunk_text(text)
print(f'Extracted {len(chunks)} chunks')
"

# Test RAG engine
python -c "
from utils.rag_engine import rag_engine
rag_engine.add_chunks(1, [{'text': 'This paper studies transformers.', 'paper_id': 1, 'paper_title': 'Test', 'authors': ['Author'], 'source_website': 'arXiv', 'source_type': 'API'}])
results = rag_engine.search('transformers', 1)
print('Search results:', results)
"

# Test chat endpoint (need a paper imported first)
# Import via /import, then POST /chat
```

### Done When
- [ ] PDF upload endpoint works (returns chunk count)
- [ ] RAG search returns relevant chunks
- [ ] Chat endpoint returns workspace-grounded response
- [ ] Response includes citations (paper title, source, via)

---

## Milestone 5: Research Discovery Agent
**Estimated time:** 2 hours
**Goal:** Search page returns real papers from academic databases

### Steps
1. Paste **MILESTONE 5** prompt into Claude Code
2. Optional: add IEEE_API_KEY or SPRINGER_API_KEY to .env

### Verify
```bash
# Test arXiv (no API key needed)
curl "http://localhost:8000/search?q=transformer+attention&workspace_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return 10+ papers with source_website="arXiv", source_type="API"

# Check deduplication works
# Same paper shouldn't appear twice in results
```

### Done When
- [ ] `/search` returns real papers (not mocked)
- [ ] At least arXiv + Semantic Scholar + CrossRef working
- [ ] Results show correct source_website and source_type badges
- [ ] Deduplication removes near-duplicate titles

---

## Milestone 6: All 7 AI Agents
**Estimated time:** 2 hours
**Goal:** All AI tools return formatted, workspace-grounded outputs

### Steps
1. Make sure you have 2+ papers imported in a workspace
2. Paste **MILESTONE 6** prompt into Claude Code

### Verify
```bash
TOKEN="your_jwt_token"
WS_ID=1

# Test literature review
curl -X POST http://localhost:8000/review \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": '$WS_ID', "topic": "machine learning"}'
# → Should return 5-section review citing your papers

# Test citations
curl -X POST http://localhost:8000/citations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paper_id": 1}'
# → Should return IEEE, APA, MLA, Chicago formats

# Test research gaps
curl -X POST http://localhost:8000/research-gaps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workspace_id": '$WS_ID'}'
# → Should return 3+ gaps with justification
```

### Done When
- [ ] Summary generates per-paper breakdown (objective/methodology/results/conclusion)
- [ ] Literature review has all 5 sections
- [ ] Research gaps reference actual paper content
- [ ] Citations formatted correctly in all 4 styles
- [ ] Comparison generates markdown table
- [ ] Recommendations explain why each topic is relevant

---

## Milestone 7: Frontend
**Estimated time:** 3 hours
**Goal:** All 10 pages functional, connected to backend, dark mode working

### Steps
1. Create `frontend/.env` with `VITE_API_URL=http://localhost:8000`
2. Paste **MILESTONE 7** prompt into Claude Code
3. Run: `cd frontend && npm run dev`

### Verify
- Open http://localhost:5173
- [ ] Login page renders with split layout
- [ ] Can register + login → redirected to Home
- [ ] Dashboard shows workspaces
- [ ] Search returns paper cards with all 8 fields
- [ ] Paper cards show correct [Source] and [Via] badges
- [ ] Import button works
- [ ] Workspace page shows imported papers
- [ ] AI Chat returns responses with citations
- [ ] AI Tools page shows 6 tool cards
- [ ] Dark mode toggle works + persists on refresh
- [ ] Mobile responsive (test with browser devtools)

---

## Milestone 8: Docker + Deploy
**Estimated time:** 1 hour
**Goal:** Entire app runs with `docker-compose up`

### Steps
1. Paste **MILESTONE 8** prompt into Claude Code
2. Test Docker build

### Verify
```bash
# Stop any local services first
docker-compose down

# Build and start everything
docker-compose up -d

# Check logs
docker-compose logs -f backend
# → "Application startup complete"
docker-compose logs -f db
# → "database system is ready to accept connections"

# Test
curl http://localhost:8000/health
# → {"status": "healthy"}

open http://localhost:5173
```

### Done When
- [ ] `docker-compose up -d` starts all services
- [ ] Backend accessible at :8000
- [ ] Database persists between restarts (volume mounted)
- [ ] README has complete setup instructions

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` | Check venv is activated, pip install -r requirements.txt |
| `asyncpg.exceptions.ConnectionRefusedError` | PostgreSQL not running. Start it or `docker-compose up -d db` |
| CORS error in browser | Check backend/main.py allow_origins includes localhost:5173 |
| `401 Unauthorized` | Token expired. Log in again. Check ACCESS_TOKEN_EXPIRE_MINUTES in .env |
| FAISS `assert d == self.d` | Embedding dimension mismatch. Recreate FAISS index. |
| Selenium TimeoutException | Site blocked bot. Skip source gracefully. Check 15s timeout. |
| Groq `AuthenticationError` | Check GROQ_API_KEY in .env. Key starts with `gsk_` |
| `ImportError: no module named 'fuzz'` | `pip install fuzzywuzzy python-Levenshtein` |
| Empty RAG results | Papers not embedded yet. Upload PDF or import paper with content. |
| `Table already exists` | Normal — SQLAlchemy uses `create_all` which is idempotent |
