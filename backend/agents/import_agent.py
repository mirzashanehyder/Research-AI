from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fuzzywuzzy import fuzz

from models.paper import Paper
from models.paper_source import PaperSource
from schemas.paper import PaperResult


class PaperImportAgent:
    FUZZY_THRESHOLD = 85  # % similarity to consider a duplicate

    async def run(
        self,
        paper_data: PaperResult,
        workspace_id: int,
        db: AsyncSession,
    ) -> Paper:
        # 1. Duplicate check — by DOI first, then fuzzy title match
        existing = await self._find_duplicate(paper_data, workspace_id, db)
        if existing:
            return existing

        # 2. Create Paper record
        paper = Paper(
            workspace_id=workspace_id,
            title=paper_data.title,
            authors=paper_data.authors,
            abstract=paper_data.abstract,
            url=paper_data.url,
            doi=paper_data.doi,
            publication_date=paper_data.publication_date,
            source_website=paper_data.source_website,
            source_type=paper_data.source_type,
        )
        db.add(paper)
        await db.flush()  # get paper.id without committing

        # 3. Create PaperSource record
        source = PaperSource(
            paper_id=paper.id,
            source_name=paper_data.source_website or "Unknown",
            retrieval_method=paper_data.source_type or "Unknown",
        )
        db.add(source)
        await db.commit()
        await db.refresh(paper)
        return paper

    async def _find_duplicate(
        self,
        paper_data: PaperResult,
        workspace_id: int,
        db: AsyncSession,
    ):
        result = await db.execute(
            select(Paper).where(Paper.workspace_id == workspace_id)
        )
        existing_papers = result.scalars().all()

        for existing in existing_papers:
            # Exact DOI match
            if paper_data.doi and existing.doi and paper_data.doi == existing.doi:
                return existing
            # Fuzzy title match
            similarity = fuzz.ratio(
                paper_data.title.lower(), existing.title.lower()
            )
            if similarity >= self.FUZZY_THRESHOLD:
                return existing

        return None
