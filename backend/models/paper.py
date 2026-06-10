from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Paper(Base):
    __tablename__ = "papers"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(1000), nullable=False)
    authors = Column(JSON, nullable=False, default=list)
    abstract = Column(Text, nullable=True)
    url = Column(String(2000), nullable=True)
    doi = Column(String(255), nullable=True)
    publication_date = Column(String(50), nullable=True)
    source_website = Column(String(255), nullable=True)
    source_type = Column(String(50), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    workspace = relationship("Workspace", back_populates="papers")
    sources = relationship("PaperSource", back_populates="paper", cascade="all, delete-orphan")
    embeddings = relationship("Embedding", back_populates="paper", cascade="all, delete-orphan")
