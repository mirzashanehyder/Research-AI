import pdfplumber
import PyPDF2
from typing import List


def extract_text(file_path: str) -> str:
    """Try pdfplumber first; fall back to PyPDF2 if it fails or returns nothing."""
    text = _extract_with_pdfplumber(file_path)
    if not text or not text.strip():
        text = _extract_with_pypdf2(file_path)
    return text or ""


def _extract_with_pdfplumber(file_path: str) -> str:
    try:
        parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    parts.append(page_text)
        return "\n".join(parts)
    except Exception:
        return ""


def _extract_with_pypdf2(file_path: str) -> str:
    try:
        parts = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    parts.append(page_text)
        return "\n".join(parts)
    except Exception:
        return ""


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Word-based chunking with overlap. Returns non-empty chunks only."""
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
