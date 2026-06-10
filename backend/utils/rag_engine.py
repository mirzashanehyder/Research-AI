import os
import pickle
from typing import List, Dict

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


class RAGEngine:
    EMBEDDING_DIM = 384  # all-MiniLM-L6-v2 output dimension
    INDEX_DIR = "./faiss_indexes"

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        self.indexes: Dict[int, faiss.IndexFlatL2] = {}
        self.chunk_maps: Dict[int, List[dict]] = {}

        os.makedirs(self.INDEX_DIR, exist_ok=True)
        self._load_all_persisted_indexes()

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def add_chunks(self, workspace_id: int, chunks: List[Dict]) -> None:
        """
        chunks: list of dicts with keys:
            text, paper_id, paper_title, authors, source_website, source_type
        """
        index = self._get_or_create_index(workspace_id)
        texts = [c["text"] for c in chunks]
        embeddings = self.model.encode(texts, convert_to_numpy=True).astype("float32")
        index.add(embeddings)
        self.chunk_maps[workspace_id].extend(chunks)
        self._persist_index(workspace_id)

    def search(self, query: str, workspace_id: int, top_k: int = 5) -> List[Dict]:
        if workspace_id not in self.indexes:
            return []

        index = self.indexes[workspace_id]
        if index.ntotal == 0:
            return []

        query_vec = self.model.encode([query], convert_to_numpy=True).astype("float32")
        k = min(top_k, index.ntotal)
        distances, indices = index.search(query_vec, k)

        results = []
        chunk_map = self.chunk_maps.get(workspace_id, [])
        for dist, idx in zip(distances[0], indices[0]):
            if 0 <= idx < len(chunk_map):
                chunk = chunk_map[idx].copy()
                chunk["similarity_score"] = float(1 / (1 + dist))
                results.append(chunk)
        return results

    def build_context(self, chunks: List[Dict]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            authors = chunk.get("authors", [])
            author_str = ", ".join(authors) if isinstance(authors, list) else str(authors)
            part = (
                f"[Source {i}]\n"
                f"Paper: {chunk.get('paper_title', 'Unknown')}\n"
                f"Authors: {author_str}\n"
                f"Source Website: {chunk.get('source_website', 'Unknown')}\n"
                f"Retrieved Via: {chunk.get('source_type', 'Unknown')}\n"
                f"Content: {chunk.get('text', '')}\n"
            )
            parts.append(part)
        return "\n---\n".join(parts)

    def remove_workspace_documents(self, workspace_id: int, paper_id: int) -> None:
        if workspace_id not in self.chunk_maps:
            return

        remaining = [
            c for c in self.chunk_maps[workspace_id]
            if c.get("paper_id") != paper_id
        ]
        self.chunk_maps[workspace_id] = remaining

        new_index = faiss.IndexFlatL2(self.EMBEDDING_DIM)
        if remaining:
            texts = [c["text"] for c in remaining]
            embeddings = self.model.encode(texts, convert_to_numpy=True).astype("float32")
            new_index.add(embeddings)
        self.indexes[workspace_id] = new_index
        self._persist_index(workspace_id)

    # ------------------------------------------------------------------ #
    # Persistence                                                          #
    # ------------------------------------------------------------------ #

    def _get_or_create_index(self, workspace_id: int) -> faiss.IndexFlatL2:
        if workspace_id not in self.indexes:
            self.indexes[workspace_id] = faiss.IndexFlatL2(self.EMBEDDING_DIM)
            self.chunk_maps[workspace_id] = []
        return self.indexes[workspace_id]

    def _persist_index(self, workspace_id: int) -> None:
        index_path = os.path.join(self.INDEX_DIR, f"workspace_{workspace_id}.index")
        map_path = os.path.join(self.INDEX_DIR, f"workspace_{workspace_id}.chunks")
        faiss.write_index(self.indexes[workspace_id], index_path)
        with open(map_path, "wb") as f:
            pickle.dump(self.chunk_maps[workspace_id], f)

    def _load_all_persisted_indexes(self) -> None:
        for filename in os.listdir(self.INDEX_DIR):
            if not filename.endswith(".index"):
                continue
            try:
                ws_id = int(filename.replace("workspace_", "").replace(".index", ""))
                index_path = os.path.join(self.INDEX_DIR, filename)
                map_path = os.path.join(self.INDEX_DIR, f"workspace_{ws_id}.chunks")
                self.indexes[ws_id] = faiss.read_index(index_path)
                if os.path.exists(map_path):
                    with open(map_path, "rb") as f:
                        self.chunk_maps[ws_id] = pickle.load(f)
                else:
                    self.chunk_maps[ws_id] = []
            except Exception:
                pass  # skip malformed index files


# Singleton — import rag_engine everywhere
rag_engine = RAGEngine()
