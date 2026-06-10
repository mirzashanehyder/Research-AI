from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentCreate(BaseModel):
    workspace_id: int
    title: str
    content: Optional[str] = None
    type: str = "note"


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    content: Optional[str]
    type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
