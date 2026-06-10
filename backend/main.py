from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models  # ensures all models are registered with Base

from routers import auth, workspaces, search, papers, chat, ai_tools, documents


async def _sync_faiss():
    """Index any papers that are in the DB but missing from the FAISS on-disk files."""
    from sqlalchemy import text
    from utils.rag_engine import rag_engine
    from utils.pdf_processor import chunk_text

    async with engine.connect() as conn:
        r = await conn.execute(text(
            "SELECT id, workspace_id, title, abstract, content, authors, "
            "source_website, source_type, url FROM papers"
        ))
        papers = r.fetchall()

    for p in papers:
        pid, ws_id, title, abstract, content, authors, source_website, source_type, url = p
        existing = rag_engine.chunk_maps.get(ws_id, [])
        if any(c.get("paper_id") == pid for c in existing):
            continue
        text_to_index = (content or "").strip() or (abstract or "").strip()
        if not text_to_index:
            continue
        rag_engine.add_chunks(ws_id, [
            {
                "text": chunk,
                "paper_id": pid,
                "paper_title": title,
                "authors": authors if isinstance(authors, list) else [],
                "source_website": source_website or "Unknown",
                "source_type": source_type or "Unknown",
                "url": url or "",
            }
            for chunk in chunk_text(text_to_index)
        ])


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _sync_faiss()
    yield


app = FastAPI(
    title="ResearchHub AI API",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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
