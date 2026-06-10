# 01 — Project Overview

## What Is ResearchHub AI?

ResearchHub AI is a **production-grade agentic research platform** that helps researchers:

1. **Discover** papers from 7 academic databases automatically
2. **Import** papers into personal workspaces with one click
3. **Analyze** papers using AI (summaries, gaps, literature reviews)
4. **Chat** with an AI that knows only YOUR imported papers (workspace-scoped RAG)
5. **Organize** everything in a clean document workspace

---

## Core Concept: Why "Agentic"?

This is NOT a search app. It's an **autonomous agent system** where each module has a `.run()` method and acts independently.

```
User Query
    ↓
ResearchDiscoveryAgent.run(query)
    ↓ tries IEEE → Semantic Scholar → arXiv → PubMed → CrossRef → Springer → ACM
    ↓ if any fails → Selenium scraping fallback
    ↓
Normalized PaperResult objects (deduplicated at 85% fuzzy match)
    ↓
Frontend displays all 8 fields per card
```

The user **never leaves the platform**. All search, import, and analysis happens in the background.

---

## The 7 Agentic Modules

| Agent | File | What It Does |
|-------|------|--------------|
| ResearchDiscoveryAgent | `agents/discovery_agent.py` | Hybrid API + Selenium search |
| PaperImportAgent | `agents/import_agent.py` | Validates, stores, triggers embeddings |
| PDFAnalysisAgent | `agents/pdf_agent.py` | Extracts text → chunks → embeds → FAISS |
| LiteratureReviewAgent | `agents/literature_agent.py` | Structured review via Groq RAG |
| ResearchGapAgent | `agents/gap_agent.py` | Finds missing coverage in workspace |
| CitationAgent | `agents/citation_agent.py` | IEEE, APA, MLA, Chicago per paper |
| RecommendationAgent | `agents/recommendation_agent.py` | Related topics via semantic similarity |

---

## The 3 Core User Scenarios

### Scenario 1: Research Discovery
- User types a query → agent searches 7 APIs in priority order
- Falls back to Selenium if API fails or returns 0 results
- Results shown as cards with source badges (API vs Selenium)
- One-click import to workspace

### Scenario 2: AI-Powered Analysis
- User opens workspace → selects papers → uses AI Tools
- Groq Llama 3.3 70B answers ONLY from imported content (strict RAG)
- Tools: Summary, Literature Review, Gap Finder, Comparator, Citations

### Scenario 3: Workspace Organization
- Multiple workspaces per user (e.g., "Deep Learning", "Medical Imaging")
- Each workspace has its own paper collection + conversation history
- Doc Space for notes, summaries, and AI-generated reports

---

## Role System

| Role | Access |
|------|--------|
| `researcher` | Own workspaces only |
| `admin` | All workspaces + usage stats |

---

## Key Design Principles

1. **Workspace isolation** — RAG is always filtered by `workspace_id`
2. **No hallucination** — AI cannot use general knowledge, only workspace docs
3. **Graceful degradation** — API fails → Selenium. Selenium fails → skip source.
4. **Full provenance** — every result shows source website + retrieval method
5. **No stubs** — every function must be fully implemented
