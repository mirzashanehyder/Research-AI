import os
import time
from typing import List

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

from schemas.paper import PaperResult

PAGE_TIMEOUT = 15
IMPLICIT_WAIT = 8

# Set by Dockerfile / docker-compose when running in a container
_CHROME_BIN = os.environ.get("CHROME_BIN")
_CHROMEDRIVER_PATH = os.environ.get("CHROMEDRIVER_PATH")


class SeleniumScraper:
    def _get_driver(self) -> webdriver.Chrome:
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])

        if _CHROME_BIN:
            # Docker / CI: use the system-installed chromium binary directly
            options.binary_location = _CHROME_BIN
            driver_path = _CHROMEDRIVER_PATH or "/usr/bin/chromedriver"
            service = Service(executable_path=driver_path)
        else:
            # Local dev: webdriver-manager auto-downloads the matching driver
            service = Service(ChromeDriverManager().install())

        driver = webdriver.Chrome(service=service, options=options)
        driver.set_page_load_timeout(PAGE_TIMEOUT)
        driver.implicitly_wait(IMPLICIT_WAIT)
        return driver

    # ------------------------------------------------------------------ #
    # Google Scholar                                                       #
    # ------------------------------------------------------------------ #

    def scrape_google_scholar(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://scholar.google.com/scholar?q={query.replace(' ', '+')}&hl=en&num=10"
            driver.get(url)
            time.sleep(2)

            cards = driver.find_elements(By.CSS_SELECTOR, ".gs_r.gs_or.gs_scl")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, ".gs_rt a")
                    title = title_el.text.strip()
                    link = title_el.get_attribute("href") or ""

                    meta = card.find_element(By.CSS_SELECTOR, ".gs_a").text
                    # meta format: "Authors - Journal, Year - Publisher"
                    parts = meta.split(" - ")
                    raw_authors = parts[0] if parts else ""
                    authors = [a.strip() for a in raw_authors.split(",") if a.strip()]

                    year = ""
                    for part in parts:
                        for token in part.split(","):
                            token = token.strip()
                            if token.isdigit() and len(token) == 4:
                                year = token
                                break

                    try:
                        abstract = card.find_element(By.CSS_SELECTOR, ".gs_rs").text.strip()
                    except Exception:
                        abstract = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract=abstract,
                                publication_date=year,
                                source_website="Google Scholar",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # IEEE Xplore (web)                                                    #
    # ------------------------------------------------------------------ #

    def scrape_ieee_web(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://ieeexplore.ieee.org/search/searchresult.jsp?queryText={query.replace(' ', '%20')}"
            driver.get(url)
            time.sleep(3)

            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".List-results-items"))
            )

            cards = driver.find_elements(By.CSS_SELECTOR, ".List-results-items .col")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "h2 a")
                    title = title_el.text.strip()
                    link = "https://ieeexplore.ieee.org" + (title_el.get_attribute("href") or "")

                    try:
                        authors_els = card.find_elements(By.CSS_SELECTOR, ".authors-info-container .text-base-md-lh")
                        authors = [a.text.strip() for a in authors_els if a.text.strip()]
                    except Exception:
                        authors = []

                    try:
                        year = card.find_element(By.CSS_SELECTOR, ".publisher-info-container .confpaper-info").text.strip()
                    except Exception:
                        year = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date=year,
                                source_website="IEEE Xplore",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # ResearchGate                                                         #
    # ------------------------------------------------------------------ #

    def scrape_researchgate(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://www.researchgate.net/search/publication?q={query.replace(' ', '+')}"
            driver.get(url)
            time.sleep(3)

            cards = driver.find_elements(By.CSS_SELECTOR, "[class*='search-box_result']")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "a[class*='title']")
                    title = title_el.text.strip()
                    link = title_el.get_attribute("href") or ""

                    try:
                        authors_els = card.find_elements(By.CSS_SELECTOR, "[class*='author']")
                        authors = [a.text.strip() for a in authors_els if a.text.strip()]
                    except Exception:
                        authors = []

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date="",
                                source_website="ResearchGate",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # Springer (web)                                                       #
    # ------------------------------------------------------------------ #

    def scrape_springer_web(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://link.springer.com/search?query={query.replace(' ', '+')}"
            driver.get(url)
            time.sleep(2)

            cards = driver.find_elements(By.CSS_SELECTOR, "li.c-card-open")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "h2 a")
                    title = title_el.text.strip()
                    link = "https://link.springer.com" + (title_el.get_attribute("href") or "")

                    try:
                        authors_els = card.find_elements(By.CSS_SELECTOR, ".c-card-open__authors span")
                        authors = [a.text.strip().rstrip(",") for a in authors_els if a.text.strip()]
                    except Exception:
                        authors = []

                    try:
                        year = card.find_element(By.CSS_SELECTOR, "span.c-bibliographic-information__value").text.strip()[:4]
                    except Exception:
                        year = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date=year,
                                source_website="Springer Nature",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # ACM Digital Library (web)                                           #
    # ------------------------------------------------------------------ #

    def scrape_acm_web(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://dl.acm.org/action/doSearch?query={query.replace(' ', '+')}"
            driver.get(url)
            time.sleep(3)

            cards = driver.find_elements(By.CSS_SELECTOR, "li.search__item")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "h5.issue-item__title a")
                    title = title_el.text.strip()
                    href = title_el.get_attribute("href") or ""
                    link = href if href.startswith("http") else "https://dl.acm.org" + href

                    try:
                        authors_els = card.find_elements(By.CSS_SELECTOR, ".author-name")
                        authors = [a.text.strip() for a in authors_els if a.text.strip()]
                    except Exception:
                        authors = []

                    try:
                        year = card.find_element(By.CSS_SELECTOR, ".bookPubDate").text.strip()[-4:]
                    except Exception:
                        year = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date=year,
                                source_website="ACM Digital Library",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # ScienceDirect                                                        #
    # ------------------------------------------------------------------ #

    def scrape_sciencedirect(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://www.sciencedirect.com/search?qs={query.replace(' ', '+')}"
            driver.get(url)
            time.sleep(3)

            cards = driver.find_elements(By.CSS_SELECTOR, "li.ResultItem")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "h2 a")
                    title = title_el.text.strip()
                    href = title_el.get_attribute("href") or ""
                    link = href if href.startswith("http") else "https://www.sciencedirect.com" + href

                    try:
                        authors_text = card.find_element(By.CSS_SELECTOR, ".Authors").text
                        authors = [a.strip() for a in authors_text.split(",") if a.strip()]
                    except Exception:
                        authors = []

                    try:
                        year = card.find_element(By.CSS_SELECTOR, ".SubType").text.strip()[-4:]
                    except Exception:
                        year = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date=year,
                                source_website="ScienceDirect",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results

    # ------------------------------------------------------------------ #
    # PubMed (web)                                                         #
    # ------------------------------------------------------------------ #

    def scrape_pubmed_web(self, query: str) -> List[PaperResult]:
        driver = self._get_driver()
        results: List[PaperResult] = []
        try:
            url = f"https://pubmed.ncbi.nlm.nih.gov/?term={query.replace(' ', '+')}"
            driver.get(url)
            time.sleep(2)

            cards = driver.find_elements(By.CSS_SELECTOR, "article.full-docsum")
            for card in cards[:10]:
                try:
                    title_el = card.find_element(By.CSS_SELECTOR, "a.docsum-title")
                    title = title_el.text.strip()
                    pmid = card.get_attribute("data-article-id") or ""
                    link = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else ""

                    try:
                        authors_text = card.find_element(By.CSS_SELECTOR, ".docsum-authors").text
                        authors = [a.strip() for a in authors_text.split(",") if a.strip()]
                    except Exception:
                        authors = []

                    try:
                        year = card.find_element(By.CSS_SELECTOR, ".docsum-journal-citation").text.strip()
                        import re
                        m = re.search(r"\b(19|20)\d{2}\b", year)
                        year = m.group(0) if m else ""
                    except Exception:
                        year = ""

                    if title:
                        results.append(
                            PaperResult(
                                title=title,
                                authors=authors,
                                abstract="",
                                publication_date=year,
                                source_website="PubMed",
                                source_type="Selenium Scraping",
                                url=link,
                            )
                        )
                except Exception:
                    continue
        except Exception:
            pass
        finally:
            driver.quit()
        return results
