from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from models.paper import Paper
from utils.groq_client import groq_client, MODEL_CONFIG, SYSTEM_PROMPT


class RecommendationAgent:
    async def run(self, workspace_id: int, db: AsyncSession) -> List[str]:
        result = await db.execute(
            select(Paper).where(Paper.workspace_id == workspace_id)
        )
        papers: List[Paper] = result.scalars().all()

        if not papers:
            return ["No papers found in this workspace to base recommendations on."]

        context = self._build_context(papers)

        prompt = f"""Based on the following research papers in this workspace, suggest 5-8 related research topics the researcher should explore next.

Current workspace papers:
{context}

For each recommendation, use this format:
**Topic N: [Topic Title]**
Why relevant: [Explain specifically how this connects to the papers in the workspace and what new knowledge it would add]

Rules:
- Each recommendation must logically follow from the actual papers listed
- Focus on adjacent research areas not already covered
- Be specific: name methodologies, datasets, or sub-fields to explore
- Recommendations should be actionable research directions"""

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            **MODEL_CONFIG,
        )

        raw = completion.choices[0].message.content
        # Split into individual recommendations by double-newline blocks
        blocks = [b.strip() for b in raw.split("\n\n") if b.strip()]
        return blocks if blocks else [raw]

    def _build_context(self, papers: List[Paper]) -> str:
        parts = []
        for i, p in enumerate(papers, 1):
            authors = ", ".join(p.authors) if isinstance(p.authors, list) else str(p.authors)
            abstract = (p.abstract or "No abstract.")[:300]
            parts.append(
                f"{i}. {p.title}\n"
                f"   Authors: {authors} | Source: {p.source_website or 'Unknown'}\n"
                f"   Abstract: {abstract}"
            )
        return "\n\n".join(parts)
