from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert
import os
import numpy as np

from models.paper import Paper
from models.embedding import Embedding
from utils.pdf_processor import extract_text, chunk_text
from utils.rag_engine import rag_engine


class PDFAnalysisAgent:
    async def run(
        self,
        file_path: str,
        workspace_id: int,
        paper_id: int,
        db: AsyncSession,
    ) -> dict:
        # 1. Extract text
        text = extract_text(file_path)
        if not text.strip():
            return {"chunks_created": 0, "paper_id": paper_id, "workspace_id": workspace_id}

        # 2. Chunk text
        chunks = chunk_text(text, chunk_size=500, overlap=100)

        # 3. Fetch paper metadata for embedding metadata
        result = await db.execute(select(Paper).where(Paper.id == paper_id))
        paper = result.scalar_one_or_none()
        paper_title = paper.title if paper else "Unknown"
        authors = paper.authors if paper else []
        source_website = paper.source_website or "Unknown"
        source_type = paper.source_type or "Unknown"

        # 4. Store Embedding records in DB
        # Compute real vectors once so the DB holds meaningful data and we avoid
        # SQLAlchemy 2.0's insertmanyvalues SELECT-FROM-VALUES pattern (which
        # PostgreSQL rejects for BYTEA columns).  Using insert().values([...])
        # emits a plain multi-row INSERT without a RETURNING clause.
        vectors = rag_engine.model.encode(
            chunks, convert_to_numpy=True, batch_size=32
        ).astype("float32")
        if chunks:
            await db.execute(
                insert(Embedding).values([
                    {
                        "paper_id": paper_id,
                        "chunk_text": chunk,
                        "chunk_index": i,
                        "embedding": vectors[i].tolist(),
                    }
                    for i, chunk in enumerate(chunks)
                ])
            )

        # 5. Add to FAISS index
        rag_chunks = [
            {
                "text": chunk,
                "paper_id": paper_id,
                "paper_title": paper_title,
                "authors": authors,
                "source_website": source_website,
                "source_type": source_type,
            }
            for chunk in chunks
        ]
        rag_engine.add_chunks(workspace_id, rag_chunks)

        # 6. Update Paper.content with full text
        if paper:
            paper.content = text

        await db.commit()

        return {
            "chunks_created": len(chunks),
            "paper_id": paper_id,
            "workspace_id": workspace_id,
        }
