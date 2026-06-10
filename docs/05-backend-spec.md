
# 05 — Backend Specification

## main.py Structure

```python
# backend/main.py — full structure

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import engine, Base

# Import all routers
from routers import auth, workspaces, search, papers, chat, ai_tools, documents

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(
    title="ResearchHub AI API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS — allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with prefixes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
app.include_router(search.router, tags=["search"])
app.include_router(papers.router, tags=["papers"])
app.include_router(chat.router, tags=["chat"])
app.include_router(ai_tools.router, tags=["ai-tools"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])

@app.get("/")
async def root():
    return {"message": "ResearchHub AI API is running", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
```

---

## Router: auth.py

**Endpoints:** POST `/auth/register`, POST `/auth/login`

**register logic:**
1. Check if email already exists → 400 if yes
2. Hash password with bcrypt
3. Insert User record
4. Return `{"message": "User registered successfully", "user_id": id}`

**login logic:**
1. Find user by email → 401 if not found
2. Verify password with bcrypt → 401 if wrong
3. Create JWT token (subject = user email, expiry = 60 min)
4. Return `{"access_token": token, "token_type": "bearer", "role": user.role}`

---

## Router: workspaces.py

**Endpoints:**
- GET `/workspaces` → list current user's workspaces (with paper count)
- POST `/workspaces` → create workspace
- PUT `/workspaces/{id}` → edit name/description (must own it)
- DELETE `/workspaces/{id}` → delete (cascade deletes papers, conversations, docs)

**All endpoints require:** `current_user = Depends(get_current_user)`
**Ownership check:** `workspace.user_id == current_user.id` (or admin bypasses)

---

## Router: search.py

**Endpoint:** GET `/search?q=QUERY&workspace_id=ID`

**Logic:**
1. Validate user owns the workspace
2. Call `ResearchDiscoveryAgent().run(query)`
3. Return list of `PaperResult` objects
4. Frontend shows loading spinner while this runs

**Response shape:**
```json
{
  "results": [
    {
      "title": "...",
      "authors": ["..."],
      "abstract": "...",
      "publication_date": "2023-07-15",
      "source_website": "arXiv",
      "source_type": "API",
      "url": "https://arxiv.org/abs/...",
      "doi": null
    }
  ],
  "total": 23,
  "sources_used": ["arXiv API", "Semantic Scholar API"]
}
```

---

## Router: papers.py

**Endpoints:**
- POST `/import` → import PaperResult into workspace
- POST `/upload` → upload PDF file → extract → embed
- GET `/papers?workspace_id=ID` → list papers in workspace
- DELETE `/papers/{id}` → delete paper + its embeddings

**import logic:**
1. Call `PaperImportAgent().run(paper_data, workspace_id)`
2. Agent validates, stores paper, triggers `PDFAnalysisAgent` if content available
3. Returns saved paper with DB id

**upload logic:**
1. Receive multipart file + workspace_id
2. Save PDF to temp file
3. Call `PDFAnalysisAgent().run(file_path, workspace_id, paper_id)`
4. Returns `{"message": "PDF processed", "chunks": N, "paper_id": id}`

---

## Router: chat.py

**Endpoints:**
- POST `/chat` → workspace-restricted RAG chat
- GET `/history?workspace_id=ID` → full conversation history

**chat logic:**
1. Validate workspace ownership
2. Generate query embedding
3. Call `rag_engine.search(query, workspace_id, top_k=5)`
4. Build context string from top-5 chunks
5. Call Groq with strict system prompt
6. Store in Conversations table
7. Return response + source citations

**history logic:** return all Conversations for workspace, ordered by timestamp

---

## Router: ai_tools.py

**Endpoints:**
- POST `/summary` → body: `{"paper_ids": [1,2,3]}`
- POST `/review` → body: `{"workspace_id": 1, "topic": "..."}`
- POST `/research-gaps` → body: `{"workspace_id": 1}`
- POST `/citations` → body: `{"paper_id": 1}`
- POST `/compare` → body: `{"paper_ids": [1,2]}`
- POST `/recommend` → body: `{"workspace_id": 1}`

Each endpoint:
1. Validates workspace/paper ownership
2. Calls the corresponding agent's `.run()` method
3. Returns structured output (see agents spec)

---

## Router: documents.py

**Endpoints:**
- GET `/documents?workspace_id=ID` → list documents
- POST `/documents` → create document
- PUT `/documents/{id}` → update title/content
- DELETE `/documents/{id}` → delete

---

## Utils: auth_utils.py

```python
# Key functions to implement:

def create_access_token(data: dict) -> str:
    # encode with SECRET_KEY, ALGORITHM, expiry from env

def verify_token(token: str) -> dict:
    # decode and return payload, raise 401 on failure

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    # verify token → get user from DB → return User object

async def get_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    # check role == admin, else raise 403
```

---

## Utils: groq_client.py

```python
# Singleton Groq client - import this everywhere

import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

MODEL_CONFIG = {
    "model": "llama-3.3-70b-versatile",
    "temperature": 0.3,
    "max_tokens": 2000,
    "top_p": 0.9
}

# The strict system prompt - used in ALL chat and AI tool calls
SYSTEM_PROMPT = """You are ResearchHub AI, an expert academic research assistant.

STRICT RULES — follow without exception:

1. Answer ONLY using information from the retrieved workspace documents.
2. Never use your general training knowledge.
3. If the answer cannot be found, respond with exactly:
   'I could not find sufficient information in the imported workspace documents.'
4. Always cite the paper title when referencing information.
5. Include author names when available.
6. State the source website (e.g., IEEE Xplore, arXiv).
7. State how the paper was retrieved: API or Selenium Scraping.
8. Maintain formal academic tone throughout.
9. If two papers present conflicting findings, explicitly highlight the conflict.
10. Identify and mention research gaps when relevant.
11. Format responses with clear headers and bullet points."""
```

---

## Utils: rag_engine.py

Key class: `RAGEngine`

```python
class RAGEngine:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.indexes = {}  # workspace_id → faiss.Index
        self.chunk_maps = {}  # workspace_id → list of {text, paper_id, paper_title, ...}

    def add_chunks(self, workspace_id: int, chunks: list[dict]) -> None:
        # Encode chunks → add to FAISS index → update chunk_maps

    def search(self, query: str, workspace_id: int, top_k: int = 5) -> list[dict]:
        # Encode query → FAISS search → return top_k chunk dicts with metadata

    def build_context(self, chunks: list[dict]) -> str:
        # Format chunks into context string for Groq prompt

    def save_index(self, workspace_id: int, path: str) -> None:
        # Persist FAISS index to disk

    def load_index(self, workspace_id: int, path: str) -> None:
        # Load persisted FAISS index from disk
```

---

## Utils: pdf_processor.py

```python
def extract_text(file_path: str) -> str:
    # Try pdfplumber first
    # If fails or returns empty → try PyPDF2
    # Return full text string

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    # Split into overlapping token-based chunks
    # Return list of chunk strings
```

---

## Utils: scraper.py

```python
class SeleniumScraper:
    def __init__(self):
        # Set up headless Chrome via webdriver-manager
        # Timeout = 15 seconds per source

    def get_driver(self):
        # Return configured headless Chrome WebDriver

    def scrape_google_scholar(self, query: str) -> list[PaperResult]:
        # Navigate, extract results, return normalized list

    def scrape_ieee(self, query: str) -> list[PaperResult]:
        # Same pattern

    # ... one method per scrape target
    # Always return list[PaperResult], empty list on failure
    # Always quit driver after use
```
