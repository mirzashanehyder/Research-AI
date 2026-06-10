# 04 — Database Schema (All 8 Tables)

## Overview

All models live in `backend/models/`. Each file has one SQLAlchemy model class.
`backend/main.py` calls `Base.metadata.create_all()` on startup.

---

## Table 1: Users

```python
# backend/models/user.py
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class UserRole(enum.Enum):
    researcher = "researcher"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.researcher, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    workspaces = relationship("Workspace", back_populates="user", cascade="all, delete-orphan")
```

---

## Table 2: Workspaces

```python
# backend/models/workspace.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="workspaces")
    papers = relationship("Paper", back_populates="workspace", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    research_reports = relationship("ResearchReport", back_populates="workspace", cascade="all, delete-orphan")
```

---

## Table 3: Papers

```python
# backend/models/paper.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(1000), nullable=False)
    authors = Column(JSON, nullable=False, default=list)       # ["Author One", "Author Two"]
    abstract = Column(Text, nullable=True)
    url = Column(String(2000), nullable=True)
    doi = Column(String(255), nullable=True)
    publication_date = Column(String(50), nullable=True)       # ISO string e.g. "2023-07-15"
    source_website = Column(String(255), nullable=True)        # "IEEE Xplore", "arXiv", etc.
    source_type = Column(String(50), nullable=True)            # "API" or "Selenium Scraping"
    content = Column(Text, nullable=True)                      # Full extracted text (from PDF)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="papers")
    sources = relationship("PaperSource", back_populates="paper", cascade="all, delete-orphan")
    embeddings = relationship("Embedding", back_populates="paper", cascade="all, delete-orphan")
```

---

## Table 4: PaperSources

```python
# backend/models/paper_source.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class PaperSource(Base):
    __tablename__ = "paper_sources"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(255), nullable=False)          # "IEEE Xplore API"
    retrieval_method = Column(String(50), nullable=False)      # "API" or "Selenium Scraping"
    retrieved_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    paper = relationship("Paper", back_populates="sources")
```

---

## Table 5: Embeddings

```python
# backend/models/embedding.py
from sqlalchemy import Column, Integer, String, Text, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from database import Base

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)              # 0-based chunk number
    embedding = Column(LargeBinary, nullable=False)            # numpy array serialized as bytes

    # Relationships
    paper = relationship("Paper", back_populates="embeddings")
```

---

## Table 6: Conversations

```python
# backend/models/conversation.py
from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_message = Column(Text, nullable=False)
    ai_response = Column(Text, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="conversations")
```

---

## Table 7: Documents

```python
# backend/models/document.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class DocumentType(enum.Enum):
    pdf = "pdf"
    summary = "summary"
    literature_review = "literature_review"
    note = "note"
    report = "report"

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    type = Column(Enum(DocumentType), nullable=False, default=DocumentType.note)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="documents")
```

---

## Table 8: ResearchReports

```python
# backend/models/research_report.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class ResearchReport(Base):
    __tablename__ = "research_reports"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(String(100), nullable=False)   # "literature_review" | "gap_analysis" | "summary" | "comparison"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="research_reports")
```

---

## Database Connection File

```python
# backend/database.py  ← Create this file too
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

---

## Pydantic Schemas (Response/Request Models)

Create `backend/schemas/` folder with these files:

- `user.py` → UserCreate, UserLogin, UserResponse
- `workspace.py` → WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
- `paper.py` → PaperImport, PaperResponse, PaperResult (the 8-field discovery schema)
- `chat.py` → ChatMessage, ChatResponse
- `document.py` → DocumentCreate, DocumentUpdate, DocumentResponse

### PaperResult Schema (critical — used everywhere)

```python
# backend/schemas/paper.py
from pydantic import BaseModel
from typing import Optional, List

class PaperResult(BaseModel):
    title: str
    authors: List[str]
    abstract: str
    publication_date: str
    source_website: str      # "IEEE Xplore", "arXiv", "PubMed", etc.
    source_type: str         # "API" or "Selenium Scraping"
    url: str
    doi: Optional[str] = None
```
