from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models.user import User
from models.workspace import Workspace
from models.paper import Paper
from schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from utils.auth_utils import get_current_user

router = APIRouter()


@router.get("", response_model=list[WorkspaceResponse])
async def list_workspaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Workspace).where(Workspace.user_id == current_user.id))
    workspaces = result.scalars().all()

    paper_counts = {}
    if workspaces:
        ws_ids = [w.id for w in workspaces]
        count_result = await db.execute(
            select(Paper.workspace_id, func.count(Paper.id))
            .where(Paper.workspace_id.in_(ws_ids))
            .group_by(Paper.workspace_id)
        )
        paper_counts = dict(count_result.all())

    return [
        WorkspaceResponse(
            id=w.id,
            user_id=w.user_id,
            name=w.name,
            description=w.description,
            created_at=w.created_at,
            paper_count=paper_counts.get(w.id, 0),
        )
        for w in workspaces
    ]


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    payload: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = Workspace(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return WorkspaceResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        name=workspace.name,
        description=workspace.description,
        created_at=workspace.created_at,
        paper_count=0,
    )


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: int,
    payload: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if payload.name is not None:
        workspace.name = payload.name
    if payload.description is not None:
        workspace.description = payload.description

    await db.commit()
    await db.refresh(workspace)
    return WorkspaceResponse(
        id=workspace.id,
        user_id=workspace.user_id,
        name=workspace.name,
        description=workspace.description,
        created_at=workspace.created_at,
        paper_count=0,
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    workspace = result.scalar_one_or_none()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if workspace.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    await db.delete(workspace)
    await db.commit()
