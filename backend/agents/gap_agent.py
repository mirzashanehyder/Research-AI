from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from models.paper import Paper
from utils.groq_client import groq_client, MODEL_CONFIG, SYSTEM_PROMPT


class ResearchGapAgent:
    async def run(self, workspace_id: int, db: AsyncSession) -> str:
        result = await db.execute(
            select(Paper).where(Paper.workspace_id == workspace_id)
        )
        papers: List[Paper] = result.scalars().all()

        if not papers:
            return "No papers found in this workspace to analyze."

        context = self._build_context(papers)

        prompt = f"""Analyze the following research papers from this workspace and identify 3-5 significant research gaps.

{context}

For each gap, use this exact format:

Gap N: [Concise gap title]
Justification: [Cite which specific papers from the list exist, what they cover, and what remains unaddressed. Be specific about paper titles and authors.]

Rules:
- Only reference papers listed above
- Each gap must be grounded in what is missing from the actual papers
- Gaps should be actionable research directions, not vague observations
- Use formal academic language"""

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            **MODEL_CONFIG,
        )
        return completion.choices[0].message.content

    def _build_context(self, papers: List[Paper]) -> str:
        parts = []
        for i, p in enumerate(papers, 1):
            authors = ", ".join(p.authors) if isinstance(p.authors, list) else str(p.authors)
            abstract = (p.abstract or "No abstract available.")[:400]
            content_snippet = (p.content or "")[:300]
            parts.append(
                f"[Paper {i}] {p.title}\n"
                f"Authors: {authors} | Source: {p.source_website or 'Unknown'}\n"
                f"Abstract: {abstract}\n"
                + (f"Content excerpt: {content_snippet}" if content_snippet else "")
            )
        return "\n\n".join(parts)
