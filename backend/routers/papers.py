import os
import shutil
import tempfile

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User, UserRole
from models.workspace import Workspace
from models.paper import Paper
from models.embedding import Embedding
from schemas.paper import PaperImport, PaperResponse, PaperResult
from utils.auth_utils import get_current_user
from utils.rag_engine import rag_engine
from agents.import_agent import PaperImportAgent
from agents.pdf_agent import PDFAnalysisAgent

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


async def _assert_workspace_owner(workspace_id: int, current_user: User, db: AsyncSession) -> Workspace:
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return workspace


# ---------------------------------------------------------------------- #
# GET /papers?workspace_id=                                               #
# ---------------------------------------------------------------------- #

@router.get("/papers", response_model=list[PaperResponse])
async def list_papers(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_workspace_owner(workspace_id, current_user, db)
    result = await db.execute(
        select(Paper)
        .where(Paper.workspace_id == workspace_id)
        .order_by(Paper.created_at.desc())
    )
    return result.scalars().all()


# ---------------------------------------------------------------------- #
# POST /import                                                            #
# ---------------------------------------------------------------------- #

@router.post("/import", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def import_paper(
    payload: PaperImport,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _assert_workspace_owner(payload.workspace_id, current_user, db)

    paper_result = PaperResult(
        title=payload.title,
        authors=payload.authors,
        abstract=payload.abstract or "",
        publication_date=payload.publication_date or "",
        source_website=payload.source_website or "Unknown",
        source_type=payload.source_type or "Unknown",
        url=payload.url or "",
        doi=payload.doi,
    )

    agent = PaperImportAgent()
    paper = await agent.run(paper_result, payload.workspace_id, db)

    # Index into FAISS: prefer full content, fall back to abstract
    text_to_index = ""
    if paper.content and paper.content.strip():
        text_to_index = paper.content
    elif paper.abstract and paper.abstract.strip():
        text_to_index = paper.abstract

    if text_to_index:
        already_indexed = any(
            c.get("paper_id") == paper.id
            for c in rag_engine.chunk_maps.get(payload.workspace_id, [])
        )
        if not already_indexed:
            from utils.pdf_processor import chunk_text
            chunks = chunk_text(text_to_index)
            rag_engine.add_chunks(payload.workspace_id, [
                {
                    "text": chunk,
                    "paper_id": paper.id,
                    "paper_title": paper.title,
                    "authors": paper.authors,
                    "source_website": paper.source_website or "Unknown",
                    "source_type": paper.source_type or "Unknown",
                    "url": paper.url or "",
                }
                for chunk in chunks
            ])

    return paper


# ---------------------------------------------------------------------- #
# POST /upload                                                            #
# ---------------------------------------------------------------------- #

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    workspace_id: int = Form(...),
    title: str = Form(...),
    authors: str = Form("[]"),  # JSON-encoded list
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import json

    await _assert_workspace_owner(workspace_id, current_user, db)

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    try:
        author_list = json.loads(authors)
    except Exception:
        author_list = []

    # Create the Paper record first (no content yet)
    paper = Paper(
        workspace_id=workspace_id,
        title=title,
        authors=author_list,
        source_type="PDF Upload",
        source_website="Direct Upload",
    )
    db.add(paper)
    await db.flush()

    # Save uploaded file to disk
    dest_path = os.path.join(UPLOAD_DIR, f"paper_{paper.id}.pdf")
    with open(dest_path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    # Run PDF analysis agent
    agent = PDFAnalysisAgent()
    result = await agent.run(dest_path, workspace_id, paper.id, db)

    return {
        "message": "PDF processed successfully",
        "paper_id": paper.id,
        "chunks": result["chunks_created"],
        "workspace_id": workspace_id,
    }


# ---------------------------------------------------------------------- #
# DELETE /papers/{id}                                                     #
# ---------------------------------------------------------------------- #

@router.delete("/papers/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_paper(
    paper_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    await _assert_workspace_owner(paper.workspace_id, current_user, db)

    workspace_id = paper.workspace_id

    # Remove from FAISS index
    rag_engine.remove_workspace_documents(workspace_id, paper_id)

    # Delete embeddings + paper (cascade handles paper_sources)
    emb_result = await db.execute(select(Embedding).where(Embedding.paper_id == paper_id))
    for emb in emb_result.scalars().all():
        await db.delete(emb)

    await db.delete(paper)
    await db.commit()
