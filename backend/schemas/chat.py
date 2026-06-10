from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class ChatRequest(BaseModel):
    workspace_id: int
    message: str


class Citation(BaseModel):
    paper_title: str
    authors: List[str]
    source_website: str
    retrieval_method: str
    url: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    citations: List[Citation] = []
    workspace_id: int


class ConversationResponse(BaseModel):
    id: int
    workspace_id: int
    user_message: str
    ai_response: str
    timestamp: datetime

    class Config:
        from_attributes = True
