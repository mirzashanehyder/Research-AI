from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from models.paper import Paper
from utils.groq_client import groq_client, MODEL_CONFIG, SYSTEM_PROMPT


class LiteratureReviewAgent:
    async def run(self, workspace_id: int, topic: str, db: AsyncSession) -> str:
        result = await db.execute(
            select(Paper).where(Paper.workspace_id == workspace_id)
        )
        papers: List[Paper] = result.scalars().all()

        if not papers:
            return "No papers found in this workspace to review."

        context = self._build_paper_context(papers)

        prompt = f"""You are writing a formal academic literature review on the topic: "{topic}"

Below are the papers available in this workspace:

{context}

Write a structured literature review using ONLY these papers. Follow this exact 5-section format:

## 1. Introduction
- Overview of the research topic
- Scope of this review (N papers reviewed)

## 2. Related Work
- For each paper: [Paper Title] (Authors, Source): key contribution and methodology

## 3. Comparative Analysis
- Compare methodologies across papers
- Compare datasets or experimental setups used
- Compare key results and metrics

## 4. Research Gaps
- Gap 1: Identified gap with justification from which papers don't cover it
- Gap 2: ...
- Gap 3: ...

## 5. Conclusion
- Summary of the collective findings
- Recommended future research directions

Use formal academic language. Cite authors and source websites explicitly."""

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            **MODEL_CONFIG,
        )
        return completion.choices[0].message.content

    def _build_paper_context(self, papers: List[Paper]) -> str:
        parts = []
        for i, p in enumerate(papers, 1):
            authors = ", ".join(p.authors) if isinstance(p.authors, list) else str(p.authors)
            abstract = (p.abstract or "No abstract available.")[:500]
            parts.append(
                f"[Paper {i}]\n"
                f"Title: {p.title}\n"
                f"Authors: {authors}\n"
                f"Source: {p.source_website or 'Unknown'} ({p.source_type or 'Unknown'})\n"
                f"Published: {p.publication_date or 'Unknown'}\n"
                f"Abstract: {abstract}\n"
            )
        return "\n---\n".join(parts)
