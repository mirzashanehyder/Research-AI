from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User, UserRole
from models.workspace import Workspace
from schemas.paper import PaperResult
from utils.auth_utils import get_current_user
from agents.discovery_agent import ResearchDiscoveryAgent

router = APIRouter()


@router.get("/search")
async def search_papers(
    q: str,
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Hybrid multi-source paper search scoped to a workspace.
    Tries 7 academic APIs in priority order; falls back to Selenium per source.
    Returns deduplicated PaperResult list.
    """
    if not q or not q.strip():
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")

    # Ownership check
    workspace = await db.get(Workspace, workspace_id)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Access denied")

    agent = ResearchDiscoveryAgent()
    results = await agent.run(q.strip())

    sources_used = list({r.source_website for r in results})

    return {
        "results": [r.model_dump() for r in results],
        "total": len(results),
        "sources_used": sources_used,
        "query": q.strip(),
    }
