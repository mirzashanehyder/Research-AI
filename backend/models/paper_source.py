from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class PaperSource(Base):
    __tablename__ = "paper_sources"

    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(255), nullable=False)
    retrieval_method = Column(String(50), nullable=False)
    retrieved_at = Column(DateTime(timezone=True), server_default=func.now())

    paper = relationship("Paper", back_populates="sources")
