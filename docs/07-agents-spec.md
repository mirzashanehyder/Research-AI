# 07 — Agentic Modules Specification

## Agent Pattern

Every agent follows this pattern:

```python
class SomeAgent:
    def __init__(self):
        # Initialize dependencies (clients, models, etc.)

    async def run(self, *args, **kwargs):
        # Main entry point — fully implemented, no stubs
        # Returns typed data
```

---

## Agent 1: ResearchDiscoveryAgent

**File:** `backend/agents/discovery_agent.py`

**Purpose:** Hybrid search across 7 APIs with Selenium fallback

### API Priority Order

```
1. IEEE Xplore API         → requires IEEE_API_KEY env var
2. Semantic Scholar API    → free tier available
3. arXiv API               → free, no key needed
4. PubMed E-utilities      → free, no key needed
5. CrossRef API            → free, no key needed
6. Springer Nature API     → requires SPRINGER_API_KEY
7. ACM Digital Library API → limited free access
```

### Selenium Fallback Sites
```
Google Scholar, IEEE Xplore (web), ResearchGate,
Springer, ACM Digital Library, ScienceDirect, PubMed (web)
```

### Full Implementation Logic

```python
class ResearchDiscoveryAgent:
    SOURCES = [
        ("IEEE Xplore", self._search_ieee_api),
        ("Semantic Scholar", self._search_semantic_scholar),
        ("arXiv", self._search_arxiv),
        ("PubMed", self._search_pubmed),
        ("CrossRef", self._search_crossref),
        ("Springer", self._search_springer),
        ("ACM", self._search_acm),
    ]

    SELENIUM_FALLBACKS = {
        "Google Scholar": self._scrape_google_scholar,
        "IEEE Xplore": self._scrape_ieee_web,
        "ResearchGate": self._scrape_researchgate,
        "Springer": self._scrape_springer_web,
        "ACM": self._scrape_acm_web,
        "ScienceDirect": self._scrape_sciencedirect,
        "PubMed": self._scrape_pubmed_web,
    }

    async def run(self, query: str) -> list[PaperResult]:
        all_results = []
        sources_used = []

        for source_name, api_method in self.SOURCES:
            try:
                results = await api_method(query)
                if results:
                    all_results.extend(results)
                    sources_used.append(f"{source_name} API")
                else:
                    # API returned empty → try Selenium for this source
                    selenium_method = self.SELENIUM_FALLBACKS.get(source_name)
                    if selenium_method:
                        results = await selenium_method(query)
                        all_results.extend(results)
                        sources_used.append(f"{source_name} Selenium")
            except Exception:
                # API failed → try Selenium fallback
                selenium_method = self.SELENIUM_FALLBACKS.get(source_name)
                if selenium_method:
                    try:
                        results = await selenium_method(query)
                        all_results.extend(results)
                        sources_used.append(f"{source_name} Selenium")
                    except Exception:
                        pass  # Skip this source entirely

        # Deduplicate by title (fuzzy 85% threshold)
        deduplicated = self._deduplicate(all_results)
        return deduplicated

    def _deduplicate(self, papers: list[PaperResult]) -> list[PaperResult]:
        unique = []
        for paper in papers:
            is_dup = any(
                fuzz.ratio(paper.title.lower(), u.title.lower()) >= 85
                for u in unique
            )
            if not is_dup:
                unique.append(paper)
        return unique

    async def _search_arxiv(self, query: str) -> list[PaperResult]:
        # GET http://export.arxiv.org/api/query?search_query=all:QUERY&max_results=10
        # Parse Atom XML response
        # Return list of PaperResult with source_website="arXiv", source_type="API"

    async def _search_semantic_scholar(self, query: str) -> list[PaperResult]:
        # GET https://api.semanticscholar.org/graph/v1/paper/search
        # params: query=QUERY, fields=title,authors,abstract,year,url,externalIds
        # Return PaperResult list with source_website="Semantic Scholar", source_type="API"

    async def _search_pubmed(self, query: str) -> list[PaperResult]:
        # Step 1: esearch → get PMIDs
        # GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=QUERY&retmax=10&retmode=json
        # Step 2: efetch → get metadata per PMID
        # GET https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=PMIDS&retmode=xml
        # Return PaperResult list with source_website="PubMed", source_type="API"

    async def _search_crossref(self, query: str) -> list[PaperResult]:
        # GET https://api.crossref.org/works?query=QUERY&rows=10
        # Return PaperResult with source_website="CrossRef", source_type="API"

    async def _search_ieee_api(self, query: str) -> list[PaperResult]:
        # GET https://ieeexploreapi.ieee.org/api/v1/search/articles
        # params: querytext=QUERY, apikey=IEEE_API_KEY
        # Skip if IEEE_API_KEY not set
        # Return PaperResult with source_website="IEEE Xplore", source_type="API"

    async def _search_springer(self, query: str) -> list[PaperResult]:
        # GET http://api.springernature.com/meta/v2/json?q=QUERY&api_key=SPRINGER_API_KEY
        # Skip if SPRINGER_API_KEY not set
        # Return PaperResult with source_website="Springer Nature", source_type="API"

    async def _search_acm(self, query: str) -> list[PaperResult]:
        # ACM has limited API; use httpx with ACM search endpoint
        # Return PaperResult with source_website="ACM Digital Library", source_type="API"

    async def _scrape_google_scholar(self, query: str) -> list[PaperResult]:
        # Use SeleniumScraper
        # Navigate to https://scholar.google.com/scholar?q=QUERY
        # Extract: title, authors, year, abstract snippet, link
        # Return PaperResult with source_website="Google Scholar", source_type="Selenium Scraping"
        # Note: Google Scholar blocks bots; add delays + user-agent

    # ... implement _scrape_ieee_web, _scrape_researchgate, etc.
```

---

## Agent 2: PaperImportAgent

**File:** `backend/agents/import_agent.py`

```python
class PaperImportAgent:
    async def run(
        self,
        paper_data: PaperResult,
        workspace_id: int,
        db: AsyncSession
    ) -> Paper:
        # 1. Check for duplicate in workspace (by title fuzzy match OR doi)
        # 2. Create Paper record in DB
        # 3. Create PaperSource record
        # 4. If paper has content → trigger PDFAnalysisAgent for chunking/embedding
        # 5. Return saved Paper object
```

---

## Agent 3: PDFAnalysisAgent

**File:** `backend/agents/pdf_agent.py`

```python
class PDFAnalysisAgent:
    def __init__(self):
        self.pdf_processor = PDFProcessor()
        self.rag_engine = RAGEngine()

    async def run(
        self,
        file_path: str,
        workspace_id: int,
        paper_id: int,
        db: AsyncSession
    ) -> dict:
        # 1. Extract text using pdfplumber (fallback: PyPDF2)
        text = self.pdf_processor.extract_text(file_path)

        # 2. Chunk text (500 tokens, 100 overlap)
        chunks = self.pdf_processor.chunk_text(text)

        # 3. Generate embeddings for each chunk
        # 4. Store each chunk as Embedding record in DB
        # 5. Add to FAISS index for this workspace
        # 6. Update Paper.content with full text

        return {
            "chunks_created": len(chunks),
            "paper_id": paper_id,
            "workspace_id": workspace_id
        }
```

---

## Agent 4: LiteratureReviewAgent

**File:** `backend/agents/literature_agent.py`

**Output format (strict):**

```
1. Introduction
   - Overview of the research topic
   - Scope of this review

2. Related Work
   - [Paper Title] (Authors, Source): key contribution
   - [Paper Title] (Authors, Source): key contribution
   ...

3. Comparative Analysis
   - Methodology comparison table
   - Dataset comparison
   - Results comparison

4. Research Gaps
   - Gap 1: ...
   - Gap 2: ...

5. Conclusion
   - Summary of findings
   - Future research directions
```

```python
class LiteratureReviewAgent:
    async def run(self, workspace_id: int, topic: str, db: AsyncSession) -> str:
        # 1. Get all papers from workspace
        # 2. Build comprehensive context (title, authors, abstract, source for each)
        # 3. Call Groq with structured prompt requesting the 5-section format above
        # 4. Return formatted markdown string
```

---

## Agent 5: ResearchGapAgent

**File:** `backend/agents/gap_agent.py`

**Output format (strict):**

```
Gap 1: [Gap Title]
Justification: [Which papers don't cover this, what's missing]

Gap 2: [Gap Title]
Justification: [...]

Gap 3: [Gap Title]
Justification: [...]
```

```python
class ResearchGapAgent:
    async def run(self, workspace_id: int, db: AsyncSession) -> str:
        # 1. Get all papers from workspace
        # 2. Build context from abstracts and content
        # 3. Prompt Groq: "Analyze these papers and identify the top 3-5 research gaps"
        # 4. Return formatted gap analysis
```

---

## Agent 6: CitationAgent

**File:** `backend/agents/citation_agent.py`

**Output format (all 4 per paper):**

```python
{
    "IEEE": '[1] A. Author, B. Author, "Paper Title," Journal Name, vol. X, no. Y, pp. ZZ-ZZ, Year.',
    "APA": "Author, A., & Author, B. (Year). Paper title. Journal Name, volume(issue), pages.",
    "MLA": 'Author, A., and B. Author. "Paper Title." Journal Name, vol. X, no. Y, Year, pp. ZZ-ZZ.',
    "Chicago": 'Author, A., and B. Author. "Paper Title." Journal Name volume, no. issue (Year): pages.'
}
```

```python
class CitationAgent:
    def run(self, paper: Paper) -> dict:
        # Pure Python — no LLM needed for basic citation formatting
        # Format authors, title, journal/source, year, doi
        # Return dict with all 4 format strings
        # Handle edge cases: no year, no journal, single author, many authors (et al.)
```

---

## Agent 7: RecommendationAgent

**File:** `backend/agents/recommendation_agent.py`

```python
class RecommendationAgent:
    async def run(self, workspace_id: int, db: AsyncSession) -> list[str]:
        # 1. Get workspace paper titles + abstracts
        # 2. Build semantic summary of workspace topics
        # 3. Prompt Groq: "Based on these papers, suggest 5-8 related research topics
        #    the researcher should explore next. Explain why each is relevant."
        # 4. Return list of recommendation strings
```
