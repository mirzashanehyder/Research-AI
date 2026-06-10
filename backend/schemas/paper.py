from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class PaperResult(BaseModel):
    title: str
    authors: List[str]
    abstract: str
    publication_date: str
    source_website: str
    source_type: str
    url: str
    doi: Optional[str] = None


class PaperImport(BaseModel):
    workspace_id: int
    title: str
    authors: List[str]
    abstract: Optional[str] = None
    url: Optional[str] = None
    doi: Optional[str] = None
    publication_date: Optional[str] = None
    source_website: Optional[str] = None
    source_type: Optional[str] = None


class PaperResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    authors: List[str]
    abstract: Optional[str]
    url: Optional[str]
    doi: Optional[str]
    publication_date: Optional[str]
    source_website: Optional[str]
    source_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
