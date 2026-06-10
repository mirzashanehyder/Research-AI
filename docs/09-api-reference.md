# 09 — API Reference

Base URL: `http://localhost:8000`

---

## Auth

### POST /auth/register
```json
// Request
{ "name": "Jane Doe", "email": "jane@example.com", "password": "secret123" }

// Response 200
{ "message": "User registered successfully", "user_id": 1 }

// Response 400
{ "detail": "Email already registered" }
```

### POST /auth/login
```json
// Request
{ "email": "jane@example.com", "password": "secret123" }

// Response 200
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "role": "researcher"
}

// Response 401
{ "detail": "Invalid credentials" }
```

---

## Workspaces (all require Authorization: Bearer TOKEN)

### GET /workspaces
```json
// Response 200
[
  {
    "id": 1,
    "name": "Deep Learning Research",
    "description": "Papers on transformers and CNNs",
    "paper_count": 5,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

### POST /workspaces
```json
// Request
{ "name": "Medical Imaging", "description": "Optional description" }

// Response 201
{ "id": 2, "name": "Medical Imaging", "description": null, "created_at": "..." }
```

### PUT /workspaces/{id}
```json
// Request
{ "name": "Updated Name", "description": "Updated desc" }
// Response 200 → updated workspace object
```

### DELETE /workspaces/{id}
```json
// Response 200
{ "message": "Workspace deleted" }
// Response 403
{ "detail": "Access denied" }
```

---

## Search

### GET /search?q=QUERY&workspace_id=ID
```json
// Response 200
{
  "results": [
    {
      "title": "Attention Is All You Need",
      "authors": ["Vaswani, A.", "Shazeer, N."],
      "abstract": "We propose a new simple network architecture...",
      "publication_date": "2017-06-12",
      "source_website": "arXiv",
      "source_type": "API",
      "url": "https://arxiv.org/abs/1706.03762",
      "doi": "10.48550/arXiv.1706.03762"
    }
  ],
  "total": 23,
  "sources_used": ["arXiv API", "Semantic Scholar API", "PubMed API"]
}
```

---

## Papers

### POST /import
```json
// Request
{
  "title": "...",
  "authors": ["..."],
  "abstract": "...",
  "publication_date": "2023-01-01",
  "source_website": "arXiv",
  "source_type": "API",
  "url": "https://...",
  "doi": null,
  "workspace_id": 1
}

// Response 201
{
  "message": "Paper imported successfully",
  "paper": { "id": 5, "title": "...", "workspace_id": 1, ... }
}

// Response 409
{ "detail": "Paper already exists in this workspace" }
```

### POST /upload (multipart/form-data)
```
Fields:
  file: PDF file
  workspace_id: int

// Response 201
{
  "message": "PDF processed successfully",
  "paper_id": 6,
  "chunks_created": 42,
  "workspace_id": 1
}
```

### GET /papers?workspace_id=ID
```json
// Response 200
[
  {
    "id": 5,
    "title": "...",
    "authors": ["..."],
    "abstract": "...",
    "url": "...",
    "doi": null,
    "publication_date": "2023-01-01",
    "source_website": "arXiv",
    "source_type": "API",
    "created_at": "..."
  }
]
```

### DELETE /papers/{id}
```json
// Response 200
{ "message": "Paper and embeddings deleted" }
```

---

## Chat

### POST /chat
```json
// Request
{ "message": "What methods do these papers use?", "workspace_id": 1 }

// Response 200
{
  "response": "Based on the imported workspace documents...\n\n**Paper 1: [Title]** (Authors)\nSource: arXiv | Retrieved via: API\n...",
  "sources": [
    {
      "paper_title": "Attention Is All You Need",
      "source_website": "arXiv",
      "source_type": "API",
      "chunk_preview": "We propose a new simple network architecture, the Transformer, based solely on attention mechanisms..."
    }
  ]
}
```

### GET /history?workspace_id=ID
```json
// Response 200
[
  {
    "id": 1,
    "user_message": "What methods...",
    "ai_response": "Based on...",
    "timestamp": "2024-01-15T10:30:00Z"
  }
]
```

---

## AI Tools

### POST /summary
```json
// Request
{ "paper_ids": [1, 2, 3], "workspace_id": 1 }

// Response 200
{
  "summaries": [
    {
      "paper_id": 1,
      "title": "...",
      "objective": "...",
      "methodology": "...",
      "results": "...",
      "conclusion": "..."
    }
  ]
}
```

### POST /review
```json
// Request
{ "workspace_id": 1, "topic": "transformer architectures in NLP" }

// Response 200
{
  "review": "# Literature Review: Transformer Architectures\n\n## 1. Introduction\n..."
}
```

### POST /research-gaps
```json
// Request
{ "workspace_id": 1 }

// Response 200
{
  "gaps": "**Gap 1: Multi-modal Integration**\nJustification: None of the imported papers address...\n\n**Gap 2: ...**\n..."
}
```

### POST /citations
```json
// Request
{ "paper_id": 1 }

// Response 200
{
  "paper_id": 1,
  "title": "Attention Is All You Need",
  "citations": {
    "IEEE": "[1] A. Vaswani et al., \"Attention Is All You Need,\" NeurIPS, 2017.",
    "APA": "Vaswani, A., et al. (2017). Attention is all you need. NeurIPS.",
    "MLA": "Vaswani, Ashish, et al. \"Attention Is All You Need.\" NeurIPS, 2017.",
    "Chicago": "Vaswani, Ashish, et al. \"Attention Is All You Need.\" NeurIPS (2017)."
  }
}
```

### POST /compare
```json
// Request
{ "paper_ids": [1, 2], "workspace_id": 1 }

// Response 200
{
  "comparison": "| Paper | Objective | Method | Dataset | Results | Limitations |\n|---|---|---|---|---|---|\n| Paper 1 | ... | ... | ... | ... | ... |\n..."
}
```

### POST /recommend
```json
// Request
{ "workspace_id": 1 }

// Response 200
{
  "recommendations": [
    "**Federated Learning for Privacy-Preserving NLP** — Based on your focus on transformer models, exploring federated approaches would extend your research into privacy-constrained settings.",
    "..."
  ]
}
```

---

## Documents

### GET /documents?workspace_id=ID
```json
[{ "id": 1, "title": "My Notes", "type": "note", "content": "...", "created_at": "..." }]
```

### POST /documents
```json
// Request
{ "workspace_id": 1, "title": "Literature Notes", "content": "...", "type": "note" }
// Response 201 → document object
```

### PUT /documents/{id}
```json
// Request
{ "title": "Updated Title", "content": "Updated content..." }
// Response 200 → updated document
```

### DELETE /documents/{id}
```json
// Response 200
{ "message": "Document deleted" }
```

---

## Error Response Format

All errors follow this shape:
```json
{ "detail": "Human-readable error message" }
```

Status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
