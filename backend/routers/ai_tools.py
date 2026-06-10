from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db
from models.user import User, UserRole
from models.workspace import Workspace
from models.paper import Paper
from utils.auth_utils import get_current_user
from utils.groq_client import groq_client, MODEL_CONFIG, SYSTEM_PROMPT
from agents.literature_agent import LiteratureReviewAgent
from agents.gap_agent import ResearchGapAgent
from agents.citation_agent import CitationAgent
from agents.recommendation_agent import RecommendationAgent

router = APIRouter()


# ------------------------------------------------------------------ #
# Request schemas                                                      #
# ------------------------------------------------------------------ #

class SummaryRequest(BaseModel):
    paper_ids: List[int]


class ReviewRequest(BaseModel):
    workspace_id: int
    topic: str


class GapsRequest(BaseModel):
    workspace_id: int


class CitationsRequest(BaseModel):
    paper_id: int


class CompareRequest(BaseModel):
    paper_ids: List[int]


class RecommendRequest(BaseModel):
    workspace_id: int


# ------------------------------------------------------------------ #
# Helpers                                                             #
# ------------------------------------------------------------------ #

async def _get_papers_for_user(
    paper_ids: List[int],
    current_user: User,
    db: AsyncSession,
) -> List[Paper]:
    """Fetch papers and verify ownership for each one."""
    result = await db.execute(select(Paper).where(Paper.id.in_(paper_ids)))
    papers = result.scalars().all()

    if not papers:
        raise HTTPException(status_code=404, detail="No papers found for the given IDs")

    for paper in papers:
        ws = await db.get(Workspace, paper.workspace_id)
        if not ws or (ws.user_id != current_user.id and current_user.role != UserRole.admin):
            raise HTTPException(status_code=403, detail=f"Access denied for paper {paper.id}")

    return papers


async def _assert_workspace_owner(
    workspace_id: int,
    current_user: User,
    db: AsyncSession,
) -> Workspace:
    ws = await db.get(Workspace, workspace_id)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")
    return ws


# ------------------------------------------------------------------ #
# POST /summary                                                        #
# ------------------------------------------------------------------ #

@router.post("/summary")
async def summarize_papers(
    payload: SummaryRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a concise summary of the specified papers."""
    if not payload.paper_ids:
        raise HTTPException(status_code=400, detail="paper_ids must not be empty")

    papers = await _get_papers_for_user(payload.paper_ids, current_user, db)

    context_parts = []
    for i, p in enumerate(papers, 1):
        authors = ", ".join(p.authors) if isinstance(p.authors, list) else str(p.authors)
        abstract = (p.abstract or "No abstract available.")[:600]
        content_snippet = (p.content or "")[:400]
        context_parts.append(
            f"[Paper {i}]\n"
            f"Title: {p.title}\n"
            f"Authors: {authors}\n"
            f"Source: {p.source_website or 'Unknown'} ({p.source_type or 'Unknown'})\n"
            f"Abstract: {abstract}\n"
            + (f"Full text excerpt: {content_snippet}" if content_snippet else "")
        )
    context = "\n\n---\n\n".join(context_parts)

    prompt = (
        f"Summarize the following {len(papers)} research paper(s) concisely. "
        f"For each paper provide: (1) core problem addressed, (2) methodology, "
        f"(3) key findings, (4) limitations.\n\n{context}"
    )

    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        **MODEL_CONFIG,
    )

    return {
        "summary": completion.choices[0].message.content,
        "paper_count": len(papers),
        "paper_titles": [p.title for p in papers],
    }


# ------------------------------------------------------------------ #
# POST /review                                                         #
# ------------------------------------------------------------------ #

@router.post("/review")
async def literature_review(
    payload: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a 5-section structured literature review for the workspace."""
    await _assert_workspace_owner(payload.workspace_id, current_user, db)

    agent = LiteratureReviewAgent()
    review = await agent.run(payload.workspace_id, payload.topic, db)

    return {
        "review": review,
        "workspace_id": payload.workspace_id,
        "topic": payload.topic,
    }


# ------------------------------------------------------------------ #
# POST /research-gaps                                                  #
# ------------------------------------------------------------------ #

@router.post("/research-gaps")
async def research_gaps(
    payload: GapsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Identify 3-5 research gaps from workspace papers."""
    await _assert_workspace_owner(payload.workspace_id, current_user, db)

    agent = ResearchGapAgent()
    gaps = await agent.run(payload.workspace_id, db)

    return {
        "gaps": gaps,
        "workspace_id": payload.workspace_id,
    }


# ------------------------------------------------------------------ #
# POST /citations                                                      #
# ------------------------------------------------------------------ #

@router.post("/citations")
async def generate_citations(
    payload: CitationsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return IEEE, APA, MLA, and Chicago citations for a paper."""
    result = await db.execute(select(Paper).where(Paper.id == payload.paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    ws = await db.get(Workspace, paper.workspace_id)
    if not ws or (ws.user_id != current_user.id and current_user.role != UserRole.admin):
        raise HTTPException(status_code=403, detail="Access denied")

    agent = CitationAgent()
    citations = agent.run(paper)

    return {
        "paper_id": paper.id,
        "title": paper.title,
        "citations": citations,
    }


# ------------------------------------------------------------------ #
# POST /compare                                                        #
# ------------------------------------------------------------------ #

@router.post("/compare")
async def compare_papers(
    payload: CompareRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return a Markdown comparison table across multiple papers."""
    if len(payload.paper_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 paper IDs required for comparison")

    papers = await _get_papers_for_user(payload.paper_ids, current_user, db)

    context_parts = []
    for i, p in enumerate(papers, 1):
        authors = ", ".join(p.authors) if isinstance(p.authors, list) else str(p.authors)
        abstract = (p.abstract or "No abstract.")[:400]
        context_parts.append(
            f"[Paper {i}]: {p.title}\n"
            f"Authors: {authors} | Source: {p.source_website or 'Unknown'} | Year: {p.publication_date or 'Unknown'}\n"
            f"Abstract: {abstract}"
        )
    context = "\n\n".join(context_parts)

    prompt = (
        f"Compare the following {len(papers)} research papers. "
        "Produce a comprehensive Markdown comparison table with these rows: "
        "Title, Authors, Year, Source, Problem Addressed, Methodology, Dataset/Evaluation, "
        "Key Results, Limitations, Contribution. "
        "After the table, write 2-3 paragraphs of comparative analysis highlighting "
        "agreements, contradictions, and complementary findings.\n\n"
        f"{context}"
    )

    completion = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        **MODEL_CONFIG,
    )

    return {
        "comparison": completion.choices[0].message.content,
        "paper_count": len(papers),
        "paper_titles": [p.title for p in papers],
    }


# ------------------------------------------------------------------ #
# POST /recommend                                                      #
# ------------------------------------------------------------------ #

@router.post("/recommend")
async def recommend_topics(
    payload: RecommendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Suggest 5-8 related research topics based on workspace papers."""
    await _assert_workspace_owner(payload.workspace_id, current_user, db)

    agent = RecommendationAgent()
    recommendations = await agent.run(payload.workspace_id, db)

    return {
        "recommendations": recommendations,
        "workspace_id": payload.workspace_id,
        "count": len(recommendations),
    }
