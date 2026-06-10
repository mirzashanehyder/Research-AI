import os
import re
import xml.etree.ElementTree as ET
from typing import List, Optional
from urllib.parse import quote_plus

import httpx
from fuzzywuzzy import fuzz

from schemas.paper import PaperResult
from utils.scraper import SeleniumScraper

HTTPX_TIMEOUT = 15.0


class ResearchDiscoveryAgent:
    """
    Searches 7 academic sources in priority order.
    On API failure or empty result → Selenium fallback for that source.
    Deduplicates by fuzzy title match at 85% threshold.
    """

    def __init__(self):
        self.scraper = SeleniumScraper()

    async def run(self, query: str) -> List[PaperResult]:
        all_results: List[PaperResult] = []

        sources = [
            ("IEEE Xplore",      self._search_ieee_api,          self.scraper.scrape_ieee_web),
            ("Semantic Scholar", self._search_semantic_scholar,   None),
            ("arXiv",            self._search_arxiv,             None),
            ("PubMed",           self._search_pubmed,            self.scraper.scrape_pubmed_web),
            ("CrossRef",         self._search_crossref,          None),
            ("Springer",         self._search_springer,          self.scraper.scrape_springer_web),
            ("ACM",              self._search_acm,               self.scraper.scrape_acm_web),
        ]

        for source_name, api_fn, selenium_fn in sources:
            try:
                results = await api_fn(query)
            except Exception:
                results = []

            if not results and selenium_fn:
                try:
                    results = await _run_sync(selenium_fn, query)
                except Exception:
                    results = []

            all_results.extend(results)

        return self._deduplicate(all_results)

    # ------------------------------------------------------------------ #
    # Deduplication                                                        #
    # ------------------------------------------------------------------ #

    def _deduplicate(self, papers: List[PaperResult]) -> List[PaperResult]:
        unique: List[PaperResult] = []
        for paper in papers:
            is_dup = any(
                fuzz.ratio(paper.title.lower(), u.title.lower()) >= 85
                for u in unique
            )
            if not is_dup:
                unique.append(paper)
        return unique

    # ------------------------------------------------------------------ #
    # 1. arXiv                                                             #
    # ------------------------------------------------------------------ #

    async def _search_arxiv(self, query: str) -> List[PaperResult]:
        url = (
            "http://export.arxiv.org/api/query"
            f"?search_query=all:{quote_plus(query)}&max_results=10&sortBy=relevance"
        )
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom",
        }
        root = ET.fromstring(resp.text)
        results: List[PaperResult] = []

        for entry in root.findall("atom:entry", ns):
            title = _xml_text(entry, "atom:title", ns).replace("\n", " ").strip()
            abstract = _xml_text(entry, "atom:summary", ns).replace("\n", " ").strip()
            link = _xml_text(entry, "atom:id", ns).strip()

            authors = [
                _xml_text(a, "atom:name", ns)
                for a in entry.findall("atom:author", ns)
            ]

            published = _xml_text(entry, "atom:published", ns)[:10]  # "YYYY-MM-DD"

            doi = None
            doi_el = entry.find("arxiv:doi", ns)
            if doi_el is not None and doi_el.text:
                doi = doi_el.text.strip()

            if title:
                results.append(
                    PaperResult(
                        title=title,
                        authors=authors,
                        abstract=abstract,
                        publication_date=published,
                        source_website="arXiv",
                        source_type="API",
                        url=link,
                        doi=doi,
                    )
                )
        return results

    # ------------------------------------------------------------------ #
    # 2. Semantic Scholar                                                  #
    # ------------------------------------------------------------------ #

    async def _search_semantic_scholar(self, query: str) -> List[PaperResult]:
        url = "https://api.semanticscholar.org/graph/v1/paper/search"
        params = {
            "query": query,
            "fields": "title,authors,abstract,year,url,externalIds",
            "limit": 10,
        }
        headers = {}
        api_key = os.getenv("SEMANTIC_SCHOLAR_API_KEY")
        if api_key:
            headers["x-api-key"] = api_key

        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()

        data = resp.json()
        results: List[PaperResult] = []

        for item in data.get("data", []):
            title = item.get("title") or ""
            if not title:
                continue

            authors = [a.get("name", "") for a in item.get("authors", [])]
            abstract = item.get("abstract") or ""
            year = str(item.get("year") or "")
            paper_url = item.get("url") or ""
            external = item.get("externalIds") or {}
            doi = external.get("DOI")

            results.append(
                PaperResult(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    publication_date=year,
                    source_website="Semantic Scholar",
                    source_type="API",
                    url=paper_url,
                    doi=doi,
                )
            )
        return results

    # ------------------------------------------------------------------ #
    # 3. PubMed                                                           #
    # ------------------------------------------------------------------ #

    async def _search_pubmed(self, query: str) -> List[PaperResult]:
        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            # Step 1: esearch → get PMIDs
            esearch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
            esearch_resp = await client.get(
                esearch_url,
                params={"db": "pubmed", "term": query, "retmax": 10, "retmode": "json"},
            )
            esearch_resp.raise_for_status()
            esearch_data = esearch_resp.json()
            pmids = esearch_data.get("esearchresult", {}).get("idlist", [])

            if not pmids:
                return []

            # Step 2: efetch → get XML metadata
            efetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
            efetch_resp = await client.get(
                efetch_url,
                params={"db": "pubmed", "id": ",".join(pmids), "retmode": "xml"},
            )
            efetch_resp.raise_for_status()

        root = ET.fromstring(efetch_resp.text)
        results: List[PaperResult] = []

        for article in root.findall(".//PubmedArticle"):
            try:
                title = "".join(article.find(".//ArticleTitle").itertext()).strip()
                abstract_el = article.find(".//AbstractText")
                abstract = "".join(abstract_el.itertext()).strip() if abstract_el is not None else ""

                pmid_el = article.find(".//PMID")
                pmid = pmid_el.text.strip() if pmid_el is not None else ""
                link = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

                authors = []
                for author in article.findall(".//Author"):
                    last = author.findtext("LastName") or ""
                    fore = author.findtext("ForeName") or ""
                    name = f"{fore} {last}".strip()
                    if name:
                        authors.append(name)

                year_el = article.find(".//PubDate/Year")
                year = year_el.text.strip() if year_el is not None else ""

                doi = ""
                for aid in article.findall(".//ArticleId"):
                    if aid.get("IdType") == "doi":
                        doi = aid.text.strip()
                        break

                if title:
                    results.append(
                        PaperResult(
                            title=title,
                            authors=authors,
                            abstract=abstract,
                            publication_date=year,
                            source_website="PubMed",
                            source_type="API",
                            url=link,
                            doi=doi or None,
                        )
                    )
            except Exception:
                continue

        return results

    # ------------------------------------------------------------------ #
    # 4. CrossRef                                                         #
    # ------------------------------------------------------------------ #

    async def _search_crossref(self, query: str) -> List[PaperResult]:
        url = "https://api.crossref.org/works"
        params = {"query": query, "rows": 10, "select": "title,author,abstract,published,URL,DOI"}

        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()

        data = resp.json()
        results: List[PaperResult] = []

        for item in data.get("message", {}).get("items", []):
            titles = item.get("title", [])
            title = titles[0] if titles else ""
            if not title:
                continue

            authors = []
            for a in item.get("author", []):
                given = a.get("given", "")
                family = a.get("family", "")
                name = f"{given} {family}".strip()
                if name:
                    authors.append(name)

            abstract = re.sub(r"<[^>]+>", "", item.get("abstract", ""))  # strip JATS XML tags

            pub_date = item.get("published", {})
            date_parts = pub_date.get("date-parts", [[]])[0]
            year = str(date_parts[0]) if date_parts else ""

            paper_url = item.get("URL") or ""
            doi = item.get("DOI")

            results.append(
                PaperResult(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    publication_date=year,
                    source_website="CrossRef",
                    source_type="API",
                    url=paper_url,
                    doi=doi,
                )
            )
        return results

    # ------------------------------------------------------------------ #
    # 5. IEEE Xplore API                                                   #
    # ------------------------------------------------------------------ #

    async def _search_ieee_api(self, query: str) -> List[PaperResult]:
        api_key = os.getenv("IEEE_API_KEY")
        if not api_key:
            return []

        url = "https://ieeexploreapi.ieee.org/api/v1/search/articles"
        params = {"querytext": query, "apikey": api_key, "max_records": 10, "format": "json"}

        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()

        data = resp.json()
        results: List[PaperResult] = []

        for item in data.get("articles", []):
            title = item.get("title") or ""
            if not title:
                continue

            raw_authors = item.get("authors", {}).get("authors", [])
            authors = [a.get("full_name", "") for a in raw_authors]

            abstract = item.get("abstract") or ""
            year = str(item.get("publication_year") or "")
            doi = item.get("doi")
            link = item.get("html_url") or item.get("pdf_url") or ""

            results.append(
                PaperResult(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    publication_date=year,
                    source_website="IEEE Xplore",
                    source_type="API",
                    url=link,
                    doi=doi,
                )
            )
        return results

    # ------------------------------------------------------------------ #
    # 6. Springer Nature API                                               #
    # ------------------------------------------------------------------ #

    async def _search_springer(self, query: str) -> List[PaperResult]:
        api_key = os.getenv("SPRINGER_API_KEY")
        if not api_key:
            return []

        url = "http://api.springernature.com/meta/v2/json"
        params = {"q": query, "api_key": api_key, "p": 10}

        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()

        data = resp.json()
        results: List[PaperResult] = []

        for item in data.get("records", []):
            title = item.get("title") or ""
            if not title:
                continue

            creators = item.get("creators", [])
            authors = [c.get("creator", "") for c in creators if c.get("creator")]

            abstract = item.get("abstract") or ""
            year = (item.get("publicationDate") or "")[:4]
            doi = item.get("doi")
            link = item.get("url", [{}])[0].get("value", "") if item.get("url") else ""

            results.append(
                PaperResult(
                    title=title,
                    authors=authors,
                    abstract=abstract,
                    publication_date=year,
                    source_website="Springer Nature",
                    source_type="API",
                    url=link,
                    doi=doi,
                )
            )
        return results

    # ------------------------------------------------------------------ #
    # 7. ACM Digital Library                                              #
    # ------------------------------------------------------------------ #

    async def _search_acm(self, query: str) -> List[PaperResult]:
        url = "https://dl.acm.org/action/doSearch"
        params = {"query": query, "startPage": 0, "pageSize": 10}
        headers = {"Accept": "application/json"}

        async with httpx.AsyncClient(timeout=HTTPX_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=headers)
            # ACM search returns HTML; try parsing as JSON first
            try:
                data = resp.json()
                items = data.get("items", []) or data.get("results", [])
            except Exception:
                # HTML response — Selenium fallback will handle it
                return []

        results: List[PaperResult] = []
        for item in items[:10]:
            title = item.get("title") or ""
            if not title:
                continue
            authors = [a.get("name", "") for a in item.get("authors", [])]
            doi = item.get("doi")
            link = f"https://dl.acm.org/doi/{doi}" if doi else ""
            year = str(item.get("year") or "")
            results.append(
                PaperResult(
                    title=title,
                    authors=authors,
                    abstract=item.get("abstract") or "",
                    publication_date=year,
                    source_website="ACM Digital Library",
                    source_type="API",
                    url=link,
                    doi=doi,
                )
            )
        return results

    # ------------------------------------------------------------------ #
    # Selenium fallback wrappers (sync → async via thread)                #
    # ------------------------------------------------------------------ #

    async def _scrape_google_scholar(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_google_scholar, query)

    async def _scrape_ieee_web(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_ieee_web, query)

    async def _scrape_researchgate(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_researchgate, query)

    async def _scrape_springer_web(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_springer_web, query)

    async def _scrape_acm_web(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_acm_web, query)

    async def _scrape_sciencedirect(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_sciencedirect, query)

    async def _scrape_pubmed_web(self, query: str) -> List[PaperResult]:
        return await _run_sync(self.scraper.scrape_pubmed_web, query)


# ------------------------------------------------------------------ #
# Helpers                                                             #
# ------------------------------------------------------------------ #

def _xml_text(el, tag: str, ns: dict) -> str:
    found = el.find(tag, ns)
    return found.text if found is not None and found.text else ""


async def _run_sync(fn, *args):
    """Run a blocking function in a thread pool so it doesn't block the event loop."""
    import asyncio
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, fn, *args)
