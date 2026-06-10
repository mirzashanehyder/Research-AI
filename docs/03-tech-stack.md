# 03 — Tech Stack (Exact Versions)

## Backend — Python

### requirements.txt (copy this exactly)

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-dotenv==1.0.0
groq>=0.9.0
httpx==0.25.2
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
sqlalchemy==2.0.23
asyncpg==0.29.0
databases[postgresql]==0.8.0
numpy==1.24.3
sentence-transformers==2.2.2
faiss-cpu==1.7.4
PyPDF2==3.0.1
pdfplumber==0.10.3
selenium==4.15.2
webdriver-manager==4.0.1
psycopg2-binary==2.9.9
fuzzywuzzy==0.18.0
python-Levenshtein==0.23.0
requests==2.31.0
aiofiles==23.2.1
```

### Why Each Library

| Library | Purpose |
|---------|---------|
| `fastapi` | Main web framework, async, auto OpenAPI docs |
| `uvicorn[standard]` | ASGI server for FastAPI |
| `groq>=0.9.0` | Groq API client for Llama 3.3 70B inference |
| `python-jose[cryptography]` | JWT token creation and verification |
| `passlib[bcrypt]` | Password hashing (bcrypt algorithm) |
| `sqlalchemy==2.0.23` | Async ORM, 2.0 style queries |
| `asyncpg` | Async PostgreSQL driver |
| `databases[postgresql]` | Async database connection pooling |
| `sentence-transformers==2.2.2` | all-MiniLM-L6-v2 embedding model |
| `faiss-cpu==1.7.4` | Vector similarity search (workspace-scoped) |
| `pdfplumber==0.10.3` | Primary PDF text extraction |
| `PyPDF2==3.0.1` | Fallback PDF extraction |
| `selenium==4.15.2` | Headless Chrome scraping fallback |
| `webdriver-manager==4.0.1` | Auto ChromeDriver download/management |
| `fuzzywuzzy==0.18.0` | Fuzzy title deduplication (85% threshold) |
| `python-Levenshtein==0.23.0` | Speed boost for fuzzywuzzy |
| `httpx==0.25.2` | Async HTTP calls to academic APIs |

---

## Frontend — Node.js

### package.json dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "@tanstack/react-query": "^5.0.0",
    "lucide-react": "^0.383.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.5",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### Why Each Library

| Library | Purpose |
|---------|---------|
| `react@18` | UI framework with concurrent features |
| `react-router-dom@6` | Client-side routing, `<Routes>` / `<Route>` |
| `axios` | HTTP client with interceptors for JWT |
| `@tanstack/react-query` | Server state, caching, loading/error states |
| `lucide-react` | Icon library (sidebar icons etc.) |
| `@radix-ui/*` | Accessible headless UI primitives for ShadCN |
| `tailwindcss` | Utility-first CSS, dark mode via `class` strategy |

---

## AI Configuration

```python
# These values are fixed across ALL Groq calls in the app
MODEL_CONFIG = {
    "model": "llama-3.3-70b-versatile",
    "temperature": 0.3,      # Deterministic, good for research
    "max_tokens": 2000,
    "top_p": 0.9
}
```

---

## RAG Configuration

```python
# These values are fixed across ALL embedding/retrieval operations
RAG_CONFIG = {
    "embedding_model": "all-MiniLM-L6-v2",  # 384-dim vectors
    "chunk_size": 500,        # tokens per chunk
    "chunk_overlap": 100,     # token overlap between chunks
    "top_k": 5,               # chunks retrieved per query
    "faiss_index_type": "IndexFlatL2"  # exact search (no approximation)
}
```

---

## Database

- **PostgreSQL 15+** (via Docker or local)
- **SQLAlchemy 2.0** async style (`async_session`, `select()` not `.query()`)
- **asyncpg** driver
- Connection string format: `postgresql+asyncpg://user:pass@host:5432/dbname`

---

## Tailwind Dark Mode Setup

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',  // ← MUST be 'class', not 'media'
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C3AED',  // purple-600
          dark: '#6D28D9',     // purple-700
        }
      }
    }
  }
}
```

Dark mode toggled by adding/removing `dark` class on `<html>` element.
Persisted in `localStorage` key: `"theme"`.
