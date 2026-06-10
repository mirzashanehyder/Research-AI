# 10 — Environment Setup

## .env File (backend/.env)

```env
# === AI ===
GROQ_API_KEY=gsk_your_groq_api_key_here

# === Auth ===
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# === Database ===
DATABASE_URL=postgresql+asyncpg://researchhub:researchhub@localhost:5432/researchhub

# === Optional API Keys (agents skip source if not set) ===
IEEE_API_KEY=your_ieee_key_here
SPRINGER_API_KEY=your_springer_key_here
SEMANTIC_SCHOLAR_API_KEY=your_s2_key_here

# === App ===
ENVIRONMENT=development
FAISS_INDEX_DIR=./faiss_indexes
PDF_UPLOAD_DIR=./uploaded_pdfs
```

## .env.example (safe to commit)

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
SECRET_KEY=change-this-to-a-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/researchhub
IEEE_API_KEY=optional
SPRINGER_API_KEY=optional
SEMANTIC_SCHOLAR_API_KEY=optional
```

## frontend/.env

```env
VITE_API_URL=http://localhost:8000
```

---

## Docker Compose (docker-compose.yml)

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: researchhub_db
    environment:
      POSTGRES_USER: researchhub
      POSTGRES_PASSWORD: researchhub
      POSTGRES_DB: researchhub
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U researchhub"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: researchhub_backend
    ports:
      - "8000:8000"
    env_file:
      - backend/.env
    volumes:
      - ./backend:/app
      - faiss_data:/app/faiss_indexes
      - pdf_data:/app/uploaded_pdfs
    depends_on:
      db:
        condition: service_healthy
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  # Optional: Selenium Grid for distributed scraping
  selenium-hub:
    image: selenium/standalone-chrome:latest
    container_name: selenium_hub
    ports:
      - "4444:4444"
    environment:
      - SE_NODE_MAX_SESSIONS=3
    shm_size: "2gb"

volumes:
  postgres_data:
  faiss_data:
  pdf_data:
```

---

## Dockerfile.backend

```dockerfile
FROM python:3.11-slim

# Install system dependencies for Chrome + Selenium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    chromium \
    chromium-driver \
    && rm -rf /var/lib/apt/lists/*

# Set Chrome path for Selenium
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Local Development (No Docker)

### Backend Setup

```bash
# 1. Create and activate virtual environment
cd ResearchHub-AI/backend
python -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up PostgreSQL locally
# macOS: brew install postgresql && brew services start postgresql
# Ubuntu: sudo apt install postgresql && sudo service postgresql start
# Windows: Download from postgresql.org

# 4. Create database
psql -U postgres -c "CREATE USER researchhub WITH PASSWORD 'researchhub';"
psql -U postgres -c "CREATE DATABASE researchhub OWNER researchhub;"

# 5. Create .env file (copy from .env.example and fill in)
cp .env.example .env
# Edit .env with your GROQ_API_KEY and other values

# 6. Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# API docs: http://localhost:8000/docs
```

### Frontend Setup

```bash
cd ResearchHub-AI/frontend

# If not yet created:
npm create vite@latest . -- --template react-ts
npm install

# Install all dependencies
npm install axios @tanstack/react-query react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Set up .env
echo "VITE_API_URL=http://localhost:8000" > .env

# Start dev server
npm run dev
# App: http://localhost:5173
```

### Docker Quick Start

```bash
# From ResearchHub-AI/ root
docker-compose up -d db          # Start DB first
docker-compose up -d backend     # Start API
docker-compose logs -f backend   # Watch logs

# Both at once
docker-compose up -d
```

---

## Getting Your Groq API Key

1. Go to https://console.groq.com/
2. Sign up / Log in
3. Click "API Keys" in left nav
4. Click "Create API Key"
5. Copy the key (starts with `gsk_`)
6. Paste into `backend/.env` as `GROQ_API_KEY=gsk_...`

Free tier: ~14,400 requests/day with llama-3.3-70b-versatile

---

## .gitignore

```gitignore
# Python
backend/venv/
backend/__pycache__/
backend/**/__pycache__/
backend/*.pyc
backend/.env

# FAISS indexes (can be regenerated)
backend/faiss_indexes/

# Uploaded PDFs
backend/uploaded_pdfs/

# Node
frontend/node_modules/
frontend/dist/
frontend/.env

# Docker
*.log

# OS
.DS_Store
Thumbs.db
```

---

## Verifying Everything Works

```bash
# Backend health check
curl http://localhost:8000/health
# → {"status": "healthy"}

# API docs
open http://localhost:8000/docs

# Frontend
open http://localhost:5173

# Test registration
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"password123"}'
```
