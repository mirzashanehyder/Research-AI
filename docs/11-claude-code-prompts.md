# 11 — Claude Code Prompts (Copy-Paste Ready)

## How to Use Claude Code in VS Code

### Setup
1. Install the **Claude Code** extension in VS Code
2. Open your `ResearchHub-AI/` folder: `code ResearchHub-AI/`
3. Open terminal: `` Ctrl+` ``
4. Launch Claude Code: type `claude` in terminal OR `Ctrl+Shift+P` → "Claude: Open Chat"

### Best Practices
- **Always work in milestone order** — each builds on the previous
- **Open the relevant spec file** alongside Claude Code (split editor)
- **After each milestone**, run the app and verify before moving on
- **Paste the ENTIRE prompt block** — don't summarize it
- If Claude stops midway, say: *"Continue from where you left off"*
- If something is wrong, say: *"The [file] has a bug: [describe]. Fix it."*

---

## MILESTONE 1: Project Setup

```
I'm building ResearchHub AI — a full-stack agentic research platform.

First, set up the complete project structure. Do ALL of the following:

1. Create the exact folder structure from docs/02-folder-structure.md

2. Create backend/requirements.txt with these exact contents:
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
groq>=0.9.0
httpx==0.25.2
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.23
asyncpg==0.29.0
databases[postgresql]==0.8.0
numpy==1.24.3
sentence-transformers==2.2.2
faiss-cpu==1.7.4
PyPDF2==3.0.1
pdfplumber==0.10.3
selenium==4.15.2
webdriver-manager==4.0.1
psycopg2-binary==2.9.9
fuzzywuzzy==0.18.0
python-Levenshtein==0.23.0
requests==2.31.0
aiofiles==23.2.1

3. Create backend/.env.example (safe template, no real keys)

4. Create frontend using Vite + React + TypeScript:
   - Run: npm create vite@latest frontend -- --template react-ts
   - Install: axios, @tanstack/react-query, react-router-dom@6, lucide-react
   - Install dev: tailwindcss, postcss, autoprefixer
   - Initialize Tailwind: npx tailwindcss init -p
   - Set darkMode: 'class' in tailwind.config.js

5. Create all empty placeholder files in the folder structure
   (models/, routers/, agents/, utils/, pages/, components/)

6. Create a README.md at the project root with setup instructions

Show me every file and command. Do not skip anything.
```

---

## MILESTONE 2: Database Models + Connection

```
Now implement ALL database models for ResearchHub AI.

Create the following files with COMPLETE, WORKING SQLAlchemy 2.0 async code.
No stubs, no placeholders — every model fully implemented.

1. backend/database.py
   - Async SQLAlchemy engine using DATABASE_URL from .env
   - AsyncSessionLocal with expire_on_commit=False
   - Base declarative base
   - get_db() async generator for dependency injection

2. backend/models/user.py
   - User model: id, name, email, password_hash, role (researcher|admin enum), created_at
   - relationship to workspaces

3. backend/models/workspace.py
   - Workspace: id, user_id (FK→users), name, description, created_at
   - relationships to user, papers, conversations, documents, research_reports

4. backend/models/paper.py
   - Paper: id, workspace_id (FK), title, authors (JSON), abstract, url, doi,
     publication_date, source_website, source_type, content (Text), created_at
   - relationships to workspace, sources (PaperSource), embeddings (Embedding)

5. backend/models/paper_source.py
   - PaperSource: id, paper_id (FK), source_name, retrieval_method, retrieved_at

6. backend/models/embedding.py
   - Embedding: id, paper_id (FK), chunk_text, chunk_index, embedding (LargeBinary)

7. backend/models/conversation.py
   - Conversation: id, workspace_id (FK), user_message, ai_response, timestamp

8. backend/models/document.py
   - Document: id, workspace_id (FK), title, content, type (enum: pdf|summary|literature_review|note|report), created_at, updated_at

9. backend/models/research_report.py
   - ResearchReport: id, workspace_id (FK), report_type, content, created_at

10. backend/schemas/ folder — create Pydantic schemas for all models:
    - UserCreate, UserLogin, UserResponse
    - WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
    - PaperResult (title, authors, abstract, publication_date, source_website, source_type, url, doi)
    - PaperImport, PaperResponse
    - ChatRequest, ChatResponse
    - DocumentCreate, DocumentUpdate, DocumentResponse

Use SQLAlchemy 2.0 async style throughout. All models import from database.Base.
```

---

## MILESTONE 3: Auth + Core Backend

```
Implement the FastAPI backend for ResearchHub AI.

Create these files with FULLY WORKING code — no stubs or TODOs:

1. backend/utils/auth_utils.py
   - create_access_token(data: dict) → str using python-jose
   - verify_token(token: str) → dict
   - get_current_user(token, db) → User async dependency
   - get_admin_user dependency (checks role == admin)
   - oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

2. backend/utils/groq_client.py
   - groq_client singleton initialized with GROQ_API_KEY
   - MODEL_CONFIG = {model: "llama-3.3-70b-versatile", temperature: 0.3, max_tokens: 2000, top_p: 0.9}
   - SYSTEM_PROMPT constant (the strict academic assistant prompt that:
     answers ONLY from workspace docs, never general knowledge,
     cites paper title + authors + source website + retrieval method,
     uses formal academic tone, highlights conflicting findings)

3. backend/routers/auth.py
   - POST /auth/register: hash password with bcrypt, store user, return user_id
   - POST /auth/login: verify credentials, return JWT token + role
   - Full error handling (duplicate email → 400, wrong password → 401)

4. backend/routers/workspaces.py
   - GET /workspaces: list user's workspaces with paper count
   - POST /workspaces: create workspace
   - PUT /workspaces/{id}: edit (check ownership)
   - DELETE /workspaces/{id}: delete with cascade check

5. backend/main.py
   - FastAPI app with lifespan (create_all tables on startup)
   - CORS middleware for localhost:3000 and localhost:5173
   - Register all routers
   - GET / and GET /health endpoints

After creating all files, show me how to run the backend and test auth endpoints with curl.
```

---

## MILESTONE 4: RAG Engine + PDF Processor

```
Implement the core AI infrastructure for ResearchHub AI.

Create these files with COMPLETE working implementations:

1. backend/utils/pdf_processor.py
   - extract_text(file_path: str) → str
     * Try pdfplumber first (better accuracy)
     * If fails or empty → fallback to PyPDF2
     * Return clean text string
   - chunk_text(text: str, chunk_size=500, overlap=100) → list[str]
     * Word-based chunking with overlap
     * Skip empty chunks

2. backend/utils/rag_engine.py
   - RAGEngine class with:
     * __init__: load SentenceTransformer("all-MiniLM-L6-v2"), init index dicts
     * add_chunks(workspace_id, chunks: list[dict]) → None
       - Each chunk dict: {text, paper_id, paper_title, authors, source_website, source_type}
       - Encode with sentence transformer → add to workspace FAISS index
       - Auto-persist index to ./faiss_indexes/
     * search(query, workspace_id, top_k=5) → list[dict]
       - Encode query → FAISS L2 search → return top_k chunks with metadata
     * build_context(chunks) → str
       - Format: "[Source N]\nPaper: ...\nAuthors: ...\nSource: ...\nVia: ...\nContent: ..."
     * remove_workspace_documents(workspace_id, paper_id) → None
       - Rebuild FAISS index without that paper's chunks
     * _persist_index, _load_all_persisted_indexes
   - Singleton: rag_engine = RAGEngine() at bottom of file

3. backend/routers/chat.py
   - POST /chat: full RAG pipeline
     * Validate workspace ownership
     * rag_engine.search(message, workspace_id, top_k=5)
     * If no chunks → return "I could not find sufficient information..."
     * build_context → call Groq with SYSTEM_PROMPT
     * Store in Conversations table
     * Return {response, sources}
   - GET /history?workspace_id=: return all conversations ordered by timestamp

4. backend/routers/papers.py
   - GET /papers?workspace_id=: list papers
   - POST /import: store PaperResult as Paper, create PaperSource
   - POST /upload: receive PDF multipart, call PDFAnalysisAgent, return chunk count
   - DELETE /papers/{id}: delete paper + rebuild FAISS index

All async, all using get_db dependency, all checking workspace ownership.
```

---

## MILESTONE 5: Research Discovery Agent (Hybrid Search)

```
Implement the ResearchDiscoveryAgent — the most critical agent in ResearchHub AI.

File: backend/agents/discovery_agent.py

REQUIREMENTS:
- Must try 7 sources in priority order
- If API fails OR returns 0 results → Selenium fallback for that source
- Deduplicate by title fuzzy match (85% threshold using fuzzywuzzy)
- Return list[PaperResult] with all 8 fields

IMPLEMENT ALL OF THESE METHODS (no stubs):

API methods (use httpx for async HTTP):
1. _search_arxiv(query) → arXiv Atom XML API
   URL: http://export.arxiv.org/api/query?search_query=all:{query}&max_results=10
   Parse XML, return PaperResult list

2. _search_semantic_scholar(query)
   URL: https://api.semanticscholar.org/graph/v1/paper/search
   Params: query, fields=title,authors,abstract,year,url,externalIds
   Use SEMANTIC_SCHOLAR_API_KEY if set

3. _search_pubmed(query)
   Step 1: esearch → get PMIDs from https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
   Step 2: efetch → get metadata per PMID
   Parse XML/JSON response

4. _search_crossref(query)
   URL: https://api.crossref.org/works?query={query}&rows=10
   Parse JSON response

5. _search_ieee_api(query)
   Skip if IEEE_API_KEY not in env
   URL: https://ieeexploreapi.ieee.org/api/v1/search/articles

6. _search_springer(query)
   Skip if SPRINGER_API_KEY not in env

7. _search_acm(query)
   Use ACM search endpoint

Selenium fallback methods (use SeleniumScraper from utils/scraper.py):
8. _scrape_google_scholar(query)
9. _scrape_ieee_web(query)
10. _scrape_researchgate(query)
11. _scrape_springer_web(query)
12. _scrape_acm_web(query)
13. _scrape_sciencedirect(query)
14. _scrape_pubmed_web(query)

Also implement:
- backend/utils/scraper.py — SeleniumScraper class with headless Chrome
- backend/routers/search.py — GET /search endpoint calling this agent

Every method must handle exceptions gracefully and return empty list on failure.
Set source_website and source_type correctly on every PaperResult.
```

---

## MILESTONE 6: All 7 AI Agent Modules

```
Implement the remaining 6 AI agents for ResearchHub AI.

All agents: fully implemented .run() methods, no stubs, use groq_client + SYSTEM_PROMPT.

1. backend/agents/import_agent.py — PaperImportAgent
   - run(paper_data, workspace_id, db)
   - Check for duplicates (by title fuzzy match OR doi) in workspace
   - Create Paper + PaperSource records
   - If paper has content → chunk and add to rag_engine
   - Return saved Paper

2. backend/agents/pdf_agent.py — PDFAnalysisAgent
   - run(file_path, workspace_id, paper_id, db)
   - extract_text using pdf_processor (pdfplumber → PyPDF2 fallback)
   - chunk_text (500 tokens, 100 overlap)
   - For each chunk: create Embedding record + add to rag_engine
   - Update Paper.content with full text
   - Return {chunks_created, paper_id}

3. backend/agents/literature_agent.py — LiteratureReviewAgent
   - run(workspace_id, topic, db)
   - Get all workspace papers
   - Build rich context (title, authors, abstract, source per paper)
   - Prompt Groq for 5-section structured review:
     1. Introduction 2. Related Work 3. Comparative Analysis 4. Research Gaps 5. Conclusion
   - Return markdown string

4. backend/agents/gap_agent.py — ResearchGapAgent
   - run(workspace_id, db)
   - Analyze all papers in workspace
   - Return 3-5 research gaps with justification from actual papers
   - Each gap: "Gap N: [title]\nJustification: [which papers don't cover this]"

5. backend/agents/citation_agent.py — CitationAgent
   - run(paper: Paper) → dict with IEEE, APA, MLA, Chicago
   - Pure Python formatting (no LLM needed)
   - Handle: multiple authors (et al. for 3+), missing year, missing journal
   - IEEE: [1] A. Author, "Title," Source, Year.
   - APA: Author, A. (Year). Title. Source.
   - MLA: Author, First. "Title." Source, Year.
   - Chicago: Author, First. "Title." Source Year.

6. backend/agents/recommendation_agent.py — RecommendationAgent
   - run(workspace_id, db)
   - Semantic summary of current workspace topics
   - Prompt Groq for 5-8 related research topic recommendations
   - Each with explanation of why it's relevant

7. backend/routers/ai_tools.py — all 6 tool endpoints
   - POST /summary → PaperImportAgent summary via Groq
   - POST /review → LiteratureReviewAgent
   - POST /research-gaps → ResearchGapAgent
   - POST /citations → CitationAgent
   - POST /compare → comparison table via Groq (Markdown table format)
   - POST /recommend → RecommendationAgent
```

---

## MILESTONE 7: Complete Frontend

```
Build the complete React + TypeScript frontend for ResearchHub AI.

Tech: React 18, TypeScript, Tailwind CSS (darkMode: 'class'), React Router v6,
Axios with JWT interceptors, TanStack Query.

Theme: White + Purple (#7C3AED), dark mode supported throughout.

Create ALL of these files completely:

1. frontend/src/utils/api.ts
   - Axios instance with baseURL from VITE_API_URL
   - Request interceptor: inject Bearer token from localStorage
   - Response interceptor: redirect to /login on 401
   - Export typed functions for every API endpoint

2. frontend/src/utils/auth.ts
   - isAuthenticated(), getToken(), getRole(), logout()

3. frontend/src/App.tsx
   - React Router v6 routes for all 10 pages
   - ProtectedRoute wrapper component
   - QueryClientProvider wrapping everything

4. frontend/src/components/Sidebar.tsx
   - Fixed left sidebar with: Home, Dashboard, Search Papers,
     AI Chat, AI Tools, Upload PDF, Doc Space
   - Lucide icons for each link
   - Active link highlighted in purple
   - "ResearchHub AI" brand at top
   - DarkModeToggle at bottom
   - Responsive: collapsible on mobile

5. frontend/src/components/PaperCard.tsx
   - Displays ALL 8 PaperResult fields
   - [Source: name] badge (blue)
   - [Via: API] green badge OR [Via: Selenium] orange badge
   - Truncated abstract (3 lines, "Show more" toggle)
   - "Import to Workspace" button with workspace selector dropdown
   - "View Original" button (opens new tab)

6. frontend/src/components/ChatMessage.tsx
   - User message: right-aligned, purple background
   - AI message: left-aligned, white/dark card
   - AI message shows citation footnotes at bottom
   - Timestamp display

7. frontend/src/components/DarkModeToggle.tsx
   - Toggle between Sun and Moon icon
   - Adds/removes 'dark' class on document.documentElement
   - Persists to localStorage key 'theme'
   - Initializes from localStorage on mount

8. ALL 10 PAGES — each must be fully working:
   - Login.tsx: split screen, form validation, JWT storage
   - Register.tsx: same pattern with name field
   - Home.tsx: hero, features grid, CTAs
   - Dashboard.tsx: workspace cards, stats, create modal
   - SearchPapers.tsx: search bar, results with PaperCard, loading state
   - Workspace.tsx: tabs (Papers | AI Chat | Generate Review), paper list with checkboxes
   - AIChat.tsx: workspace selector, chat thread, sources panel
   - AITools.tsx: paper selector, 6 tool cards, results display
   - UploadPDF.tsx: drag-drop zone, AI summary, save to workspace
   - DocSpace.tsx: split layout, document list, rich text editor

For every page that has data fetching, use TanStack Query (useQuery/useMutation).
Every form must show loading state on submit.
All protected pages include the Sidebar.
```

---

## MILESTONE 8: Docker + Final Polish

```
Complete the ResearchHub AI deployment setup.

1. Create docker-compose.yml with:
   - db service: postgres:15-alpine, health check, volume
   - backend service: built from Dockerfile.backend, depends on db healthy
   - selenium-hub service: selenium/standalone-chrome:latest (optional, for scraping)
   - Named volumes for postgres_data, faiss_data, pdf_data

2. Create Dockerfile.backend:
   - FROM python:3.11-slim
   - Install chromium + chromium-driver for headless Selenium
   - Set CHROME_BIN and CHROMEDRIVER_PATH env vars
   - COPY requirements.txt + pip install
   - COPY backend/
   - EXPOSE 8000
   - CMD uvicorn main:app --host 0.0.0.0 --port 8000

3. Create .gitignore (see docs/10-environment-setup.md)

4. Update backend/utils/scraper.py to detect Docker environment:
   - If CHROME_BIN env var set → use that path
   - Otherwise → use webdriver-manager auto-download

5. Create comprehensive README.md at project root with:
   - Project description
   - Architecture diagram (ASCII)
   - Prerequisites list
   - Setup instructions (local + Docker)
   - API documentation link (/docs)
   - Milestone achievement list
   - Troubleshooting section

6. Final QA checklist — verify these all work:
   - User registration + login + JWT
   - Workspace CRUD
   - Paper search (at least arXiv API works)
   - Paper import to workspace
   - PDF upload + text extraction
   - RAG chat (returns workspace-grounded answers)
   - All 6 AI tools
   - Dark mode toggle persists
   - All 10 pages render without errors

Fix any issues found during QA.
```

---

## Debugging Prompts (Use When Stuck)

### Backend error:
```
I'm getting this error in ResearchHub AI:
[paste error]

The error is in [file path].
Here's the relevant code:
[paste code]

Fix the issue and explain what was wrong.
```

### Frontend not connecting:
```
The frontend can't connect to the backend. 
CORS error: [paste error]
Backend URL: http://localhost:8000
Frontend URL: http://localhost:5173
Fix the CORS configuration in backend/main.py.
```

### FAISS index error:
```
Getting this FAISS error in rag_engine.py: [paste error]
The workspace_id is [X] and we have [N] embeddings.
Fix the search/add logic.
```

### Database migration:
```
I changed the [model name] model by adding [field].
The database already exists. 
Write an Alembic migration OR tell me the ALTER TABLE SQL to run manually.
```

### Agent not returning results:
```
The ResearchDiscoveryAgent is returning 0 results for query "[query]".
The _search_arxiv method runs but returns empty.
Here's the current implementation: [paste]
Fix it to correctly parse the arXiv API response.
```
