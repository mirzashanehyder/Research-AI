# 02 — Exact Folder Structure

## Create This Exact Layout

```
ResearchHub-AI/
│
├── docs/                          ← You are here
│   ├── README.md
│   ├── 01-project-overview.md
│   ├── 02-folder-structure.md
│   ├── 03-tech-stack.md
│   ├── 04-database-schema.md
│   ├── 05-backend-spec.md
│   ├── 06-frontend-spec.md
│   ├── 07-agents-spec.md
│   ├── 08-rag-pipeline.md
│   ├── 09-api-reference.md
│   ├── 10-environment-setup.md
│   ├── 11-claude-code-prompts.md
│   └── 12-milestone-guide.md
│
├── backend/
│   ├── main.py                    ← FastAPI app + CORS + router registration
│   ├── requirements.txt
│   ├── .env                       ← Never commit this
│   ├── .env.example               ← Safe template to commit
│   │
│   ├── models/                    ← SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── workspace.py
│   │   ├── paper.py
│   │   ├── paper_source.py
│   │   ├── embedding.py
│   │   ├── conversation.py
│   │   ├── document.py
│   │   └── research_report.py
│   │
│   ├── routers/                   ← FastAPI route handlers
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── workspaces.py
│   │   ├── search.py
│   │   ├── papers.py
│   │   ├── chat.py
│   │   ├── ai_tools.py
│   │   └── documents.py
│   │
│   ├── agents/                    ← Agentic AI modules
│   │   ├── __init__.py
│   │   ├── discovery_agent.py
│   │   ├── import_agent.py
│   │   ├── pdf_agent.py
│   │   ├── literature_agent.py
│   │   ├── gap_agent.py
│   │   ├── citation_agent.py
│   │   └── recommendation_agent.py
│   │
│   └── utils/                     ← Shared utilities
│       ├── __init__.py
│       ├── groq_client.py
│       ├── rag_engine.py
│       ├── pdf_processor.py
│       ├── scraper.py
│       └── auth_utils.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts             ← Use Vite (not CRA)
│   ├── index.html
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                ← Router setup
│       │
│       ├── components/            ← Reusable UI components
│       │   ├── Sidebar.tsx
│       │   ├── PaperCard.tsx
│       │   ├── ChatMessage.tsx
│       │   └── DarkModeToggle.tsx
│       │
│       ├── pages/                 ← Full pages (route targets)
│       │   ├── Login.tsx
│       │   ├── Register.tsx
│       │   ├── Home.tsx
│       │   ├── Dashboard.tsx
│       │   ├── SearchPapers.tsx
│       │   ├── Workspace.tsx
│       │   ├── AIChat.tsx
│       │   ├── AITools.tsx
│       │   ├── UploadPDF.tsx
│       │   └── DocSpace.tsx
│       │
│       └── utils/
│           ├── api.ts             ← Axios instance + all API calls
│           └── auth.ts            ← JWT storage + decode helpers
│
├── docker-compose.yml
├── Dockerfile.backend
└── README.md
```

---

## Bash Setup Command

Run this from your project root to create all folders at once:

```bash
# From ResearchHub-AI/ directory

# Backend
mkdir -p backend/{models,routers,agents,utils}
touch backend/main.py backend/requirements.txt backend/.env backend/.env.example
touch backend/models/{__init__,user,workspace,paper,paper_source,embedding,conversation,document,research_report}.py
touch backend/routers/{__init__,auth,workspaces,search,papers,chat,ai_tools,documents}.py
touch backend/agents/{__init__,discovery_agent,import_agent,pdf_agent,literature_agent,gap_agent,citation_agent,recommendation_agent}.py
touch backend/utils/{__init__,groq_client,rag_engine,pdf_processor,scraper,auth_utils}.py

# Frontend (Vite + React + TS)
npm create vite@latest frontend -- --template react-ts
cd frontend && npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install axios @tanstack/react-query react-router-dom lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
cd ..

# Create page and component files
mkdir -p frontend/src/{components,pages,utils}
touch frontend/src/components/{Sidebar,PaperCard,ChatMessage,DarkModeToggle}.tsx
touch frontend/src/pages/{Login,Register,Home,Dashboard,SearchPapers,Workspace,AIChat,AITools,UploadPDF,DocSpace}.tsx
touch frontend/src/utils/{api,auth}.ts
```

---

## File Responsibility Summary

| File | Owns |
|------|------|
| `backend/main.py` | App creation, CORS, router registration, DB init |
| `backend/utils/auth_utils.py` | JWT create/verify, get_current_user dependency |
| `backend/utils/groq_client.py` | Groq client singleton + MODEL_CONFIG |
| `backend/utils/rag_engine.py` | FAISS index load/save/query per workspace |
| `backend/utils/pdf_processor.py` | pdfplumber + PyPDF2 fallback text extraction |
| `backend/utils/scraper.py` | Selenium headless Chrome manager |
| `frontend/src/utils/api.ts` | Axios instance with JWT header injection |
| `frontend/src/utils/auth.ts` | localStorage token management |
| `frontend/src/App.tsx` | React Router v6 route definitions |
