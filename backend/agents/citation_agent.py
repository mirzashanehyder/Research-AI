from typing import List
from models.paper import Paper


class CitationAgent:
    """
    Pure-Python citation formatter — no LLM required.
    Produces IEEE, APA, MLA, and Chicago formats from Paper model data.
    """

    def run(self, paper: Paper) -> dict:
        authors: List[str] = paper.authors if isinstance(paper.authors, list) else []
        title = paper.title or "Untitled"
        source = paper.source_website or "Unknown Source"
        year = (paper.publication_date or "n.d.")[:4] if paper.publication_date else "n.d."
        doi = paper.doi or ""

        return {
            "IEEE": self._ieee(authors, title, source, year, doi),
            "APA": self._apa(authors, title, source, year, doi),
            "MLA": self._mla(authors, title, source, year),
            "Chicago": self._chicago(authors, title, source, year),
        }

    # ------------------------------------------------------------------ #
    # Format helpers                                                       #
    # ------------------------------------------------------------------ #

    def _ieee(self, authors: List[str], title: str, source: str, year: str, doi: str) -> str:
        author_str = self._ieee_authors(authors)
        cite = f'[1] {author_str}, "{title}," {source}, {year}.'
        if doi:
            cite += f" doi: {doi}."
        return cite

    def _apa(self, authors: List[str], title: str, source: str, year: str, doi: str) -> str:
        author_str = self._apa_authors(authors)
        # APA sentence-case for title
        title_lower = title[0].upper() + title[1:].lower() if len(title) > 1 else title.upper()
        cite = f"{author_str} ({year}). {title_lower}. {source}."
        if doi:
            cite += f" https://doi.org/{doi}"
        return cite

    def _mla(self, authors: List[str], title: str, source: str, year: str) -> str:
        author_str = self._mla_authors(authors)
        return f'{author_str} "{title}." {source}, {year}.'

    def _chicago(self, authors: List[str], title: str, source: str, year: str) -> str:
        author_str = self._chicago_authors(authors)
        return f'{author_str} "{title}." {source} ({year}).'

    # ------------------------------------------------------------------ #
    # Author formatting per style                                         #
    # ------------------------------------------------------------------ #

    def _ieee_authors(self, authors: List[str]) -> str:
        """A. Lastname, B. Lastname — et al. after 6."""
        if not authors:
            return "Unknown Author"
        formatted = []
        for name in authors[:6]:
            parts = name.strip().split()
            if len(parts) >= 2:
                initials = ". ".join(p[0] for p in parts[:-1]) + "."
                formatted.append(f"{initials} {parts[-1]}")
            else:
                formatted.append(name)
        result = ", ".join(formatted)
        if len(authors) > 6:
            result += " et al."
        return result

    def _apa_authors(self, authors: List[str]) -> str:
        """Lastname, A. B., & Lastname, C. D. — et al. after 20."""
        if not authors:
            return "Unknown Author"
        formatted = []
        for name in authors[:20]:
            parts = name.strip().split()
            if len(parts) >= 2:
                initials = ". ".join(p[0] for p in parts[:-1]) + "."
                formatted.append(f"{parts[-1]}, {initials}")
            else:
                formatted.append(name)
        if len(authors) > 20:
            return ", ".join(formatted[:19]) + ", . . . " + formatted[-1]
        if len(formatted) == 1:
            return formatted[0]
        return ", ".join(formatted[:-1]) + ", & " + formatted[-1]

    def _mla_authors(self, authors: List[str]) -> str:
        """Lastname, Firstname, and Firstname Lastname. — et al. after 3."""
        if not authors:
            return "Unknown Author"
        if len(authors) == 1:
            parts = authors[0].strip().split()
            if len(parts) >= 2:
                return f"{parts[-1]}, {' '.join(parts[:-1])}."
            return authors[0] + "."
        # First author inverted; rest natural
        first = authors[0].strip().split()
        first_fmt = (
            f"{first[-1]}, {' '.join(first[:-1])}" if len(first) >= 2 else authors[0]
        )
        if len(authors) == 2:
            return f"{first_fmt}, and {authors[1]}."
        if len(authors) >= 3:
            return f"{first_fmt}, et al."
        return first_fmt + "."

    def _chicago_authors(self, authors: List[str]) -> str:
        """Lastname, Firstname, and Firstname Lastname. — et al. after 10."""
        if not authors:
            return "Unknown Author"
        formatted = []
        for i, name in enumerate(authors[:10]):
            parts = name.strip().split()
            if i == 0 and len(parts) >= 2:
                # First author: Lastname, Firstname
                formatted.append(f"{parts[-1]}, {' '.join(parts[:-1])}")
            else:
                formatted.append(name)
        result = ", ".join(formatted)
        if len(authors) > 10:
            result += ", et al."
        return result + "."
