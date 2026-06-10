# 08 — RAG Pipeline (Workspace-Restricted)

## Overview

The RAG pipeline ensures the AI ONLY answers from documents in the user's current workspace.
It is physically impossible for the model to reference another user's papers or general knowledge.

---

## Pipeline Flow

```
User types question in workspace chat
        ↓
1. Embed query: all-MiniLM-L6-v2 → 384-dim vector
        ↓
2. FAISS search on workspace-scoped index
   → Returns top 5 chunks with metadata
        ↓
3. Build context string:
   For each chunk:
     "Paper: [title] | Authors: [...] | Source: [website] | Via: [API/Selenium]
      [chunk text]"
        ↓
4. Send to Groq (llama-3.3-70b-versatile) with SYSTEM_PROMPT
        ↓
5. Return response with citations
        ↓
6. Store in Conversations table
```

---

## RAGEngine Class — Full Spec

```python
# backend/utils/rag_engine.py

import faiss
import numpy as np
import pickle
import os
from sentence_transformers import SentenceTransformer
from typing import List, Dict

class RAGEngine:
    EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension
    INDEX_DIR = "./faiss_indexes"  # local storage for persisted indexes

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.indexes: Dict[int, faiss.IndexFlatL2] = {}     # workspace_id → FAISS index
        self.chunk_maps: Dict[int, List[dict]] = {}          # workspace_id → chunk metadata

        os.makedirs(self.INDEX_DIR, exist_ok=True)
        # Load any persisted indexes on startup
        self._load_all_persisted_indexes()

    def _get_or_create_index(self, workspace_id: int) -> faiss.IndexFlatL2:
        if workspace_id not in self.indexes:
            self.indexes[workspace_id] = faiss.IndexFlatL2(self.EMBEDDING_DIM)
            self.chunk_maps[workspace_id] = []
        return self.indexes[workspace_id]

    def add_chunks(
        self,
        workspace_id: int,
        chunks: List[Dict]
        # Each dict: {text, paper_id, paper_title, authors, source_website, source_type}
    ) -> None:
        index = self._get_or_create_index(workspace_id)
        texts = [c["text"] for c in chunks]
        embeddings = self.model.encode(texts, convert_to_numpy=True).astype("float32")
        index.add(embeddings)
        self.chunk_maps[workspace_id].extend(chunks)
        # Auto-persist after adding
        self._persist_index(workspace_id)

    def search(
        self,
        query: str,
        workspace_id: int,
        top_k: int = 5
    ) -> List[Dict]:
        if workspace_id not in self.indexes:
            return []  # No documents in this workspace yet

        index = self.indexes[workspace_id]
        if index.ntotal == 0:
            return []

        query_embedding = self.model.encode([query], convert_to_numpy=True).astype("float32")
        distances, indices = index.search(query_embedding, min(top_k, index.ntotal))

        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx >= 0 and idx < len(self.chunk_maps[workspace_id]):
                chunk = self.chunk_maps[workspace_id][idx].copy()
                chunk["similarity_score"] = float(1 / (1 + dist))  # normalize
                results.append(chunk)
        return results

    def build_context(self, chunks: List[Dict]) -> str:
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            part = (
                f"[Source {i}]\n"
                f"Paper: {chunk.get('paper_title', 'Unknown')}\n"
                f"Authors: {', '.join(chunk.get('authors', []))}\n"
                f"Source Website: {chunk.get('source_website', 'Unknown')}\n"
                f"Retrieved Via: {chunk.get('source_type', 'Unknown')}\n"
                f"Content: {chunk.get('text', '')}\n"
            )
            context_parts.append(part)
        return "\n---\n".join(context_parts)

    def remove_workspace_documents(self, workspace_id: int, paper_id: int) -> None:
        # Remove chunks belonging to paper_id from workspace index
        # Requires rebuilding the FAISS index without those chunks
        if workspace_id not in self.chunk_maps:
            return
        remaining = [c for c in self.chunk_maps[workspace_id] if c.get("paper_id") != paper_id]
        self.chunk_maps[workspace_id] = remaining
        # Rebuild index
        new_index = faiss.IndexFlatL2(self.EMBEDDING_DIM)
        if remaining:
            texts = [c["text"] for c in remaining]
            embeddings = self.model.encode(texts, convert_to_numpy=True).astype("float32")
            new_index.add(embeddings)
        self.indexes[workspace_id] = new_index
        self._persist_index(workspace_id)

    def _persist_index(self, workspace_id: int) -> None:
        index_path = os.path.join(self.INDEX_DIR, f"workspace_{workspace_id}.index")
        map_path = os.path.join(self.INDEX_DIR, f"workspace_{workspace_id}.chunks")
        faiss.write_index(self.indexes[workspace_id], index_path)
        with open(map_path, "wb") as f:
            pickle.dump(self.chunk_maps[workspace_id], f)

    def _load_all_persisted_indexes(self) -> None:
        for filename in os.listdir(self.INDEX_DIR):
            if filename.endswith(".index"):
                workspace_id = int(filename.replace("workspace_", "").replace(".index", ""))
                index_path = os.path.join(self.INDEX_DIR, filename)
                map_path = os.path.join(self.INDEX_DIR, f"workspace_{workspace_id}.chunks")
                self.indexes[workspace_id] = faiss.read_index(index_path)
                if os.path.exists(map_path):
                    with open(map_path, "rb") as f:
                        self.chunk_maps[workspace_id] = pickle.load(f)

# Singleton — import this in routers/agents
rag_engine = RAGEngine()
```

---

## Chat Endpoint — Full RAG Flow

```python
# backend/routers/chat.py

@router.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    workspace_id = request.workspace_id

    # 1. Ownership check
    workspace = await db.get(Workspace, workspace_id)
    if not workspace or (workspace.user_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(403, "Access denied")

    # 2. Retrieve top chunks
    chunks = rag_engine.search(request.message, workspace_id, top_k=5)

    if not chunks:
        return {
            "response": "I could not find sufficient information in the imported workspace documents.",
            "sources": []
        }

    # 3. Build context
    context = rag_engine.build_context(chunks)

    # 4. Call Groq
    response = groq_client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Context from workspace documents:\n\n{context}\n\nQuestion: {request.message}"}
        ],
        **MODEL_CONFIG
    )
    ai_response = response.choices[0].message.content

    # 5. Store conversation
    conversation = Conversation(
        workspace_id=workspace_id,
        user_message=request.message,
        ai_response=ai_response
    )
    db.add(conversation)
    await db.commit()

    # 6. Return response + sources
    sources = [
        {
            "paper_title": c.get("paper_title"),
            "source_website": c.get("source_website"),
            "source_type": c.get("source_type"),
            "chunk_preview": c.get("text", "")[:200] + "..."
        }
        for c in chunks
    ]

    return {"response": ai_response, "sources": sources}
```

---

## Chunking Logic

```python
# backend/utils/pdf_processor.py

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    # Tokenize by words (approximate token count)
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start += (chunk_size - overlap)

    return chunks
```

---

## FAISS Index Storage

```
backend/
└── faiss_indexes/
    ├── workspace_1.index    ← FAISS binary index
    ├── workspace_1.chunks   ← pickle of chunk metadata list
    ├── workspace_2.index
    └── workspace_2.chunks
```

Each workspace has its own isolated FAISS index.
Loading happens at app startup. Saving happens after every `add_chunks()` call.

---

## Embedding Model Info

- **Model:** `all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Speed:** ~1000 sentences/second on CPU
- **Size:** ~80MB download on first use
- **Similarity:** L2 distance (lower = more similar)
- **Auto-downloads** from HuggingFace Hub on first run
