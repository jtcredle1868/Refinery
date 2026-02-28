"""
Manuscript Parser Service
Handles parsing of .docx, .txt, .rtf, and .pdf files into structured text.
Extracts chapters and produces raw text for analysis.
"""
import io
import re
import json
from typing import Optional


def parse_docx(file_bytes: bytes) -> dict:
    """Parse a .docx file and extract text with chapter structure."""
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    full_text = []
    chapters = []
    current_chapter = {"title": "Untitled", "text": "", "index": 0}
    chapter_index = 0

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # Detect chapter headings by style or pattern
        is_heading = (
            para.style.name.startswith("Heading")
            or re.match(r"^(chapter|part|section|prologue|epilogue)\s", text, re.IGNORECASE)
            or (para.style.name == "Title")
        )

        if is_heading and current_chapter["text"].strip():
            chapters.append(current_chapter)
            chapter_index += 1
            current_chapter = {"title": text, "text": "", "index": chapter_index}
        elif is_heading:
            current_chapter["title"] = text
        else:
            current_chapter["text"] += text + "\n"
            full_text.append(text)

    # Append the last chapter
    if current_chapter["text"].strip():
        chapters.append(current_chapter)

    # If no chapters detected, treat entire document as one chapter
    if not chapters:
        raw = "\n".join(full_text)
        chapters = [{"title": "Full Manuscript", "text": raw, "index": 0}]

    raw_text = "\n".join(full_text)
    return {
        "raw_text": raw_text,
        "chapters": chapters,
        "word_count": len(raw_text.split()),
        "chapter_count": len(chapters),
    }


def parse_txt(file_bytes: bytes) -> dict:
    """Parse a plain text file and extract text with chapter structure."""
    text = file_bytes.decode("utf-8", errors="replace")
    lines = text.split("\n")
    chapters = []
    current_chapter = {"title": "Untitled", "text": "", "index": 0}
    chapter_index = 0

    chapter_pattern = re.compile(
        r"^(chapter|part|section|prologue|epilogue)\s+\w+",
        re.IGNORECASE,
    )

    for line in lines:
        stripped = line.strip()
        if chapter_pattern.match(stripped) and current_chapter["text"].strip():
            chapters.append(current_chapter)
            chapter_index += 1
            current_chapter = {"title": stripped, "text": "", "index": chapter_index}
        elif chapter_pattern.match(stripped):
            current_chapter["title"] = stripped
        else:
            current_chapter["text"] += line + "\n"

    if current_chapter["text"].strip():
        chapters.append(current_chapter)

    if not chapters:
        chapters = [{"title": "Full Manuscript", "text": text, "index": 0}]

    word_count = len(text.split())
    return {
        "raw_text": text,
        "chapters": chapters,
        "word_count": word_count,
        "chapter_count": len(chapters),
    }


def parse_rtf(file_bytes: bytes) -> dict:
    """Parse an RTF file and extract text."""
    from striprtf.striprtf import rtf_to_text

    rtf_content = file_bytes.decode("utf-8", errors="replace")
    text = rtf_to_text(rtf_content)
    # Re-use txt parsing logic on extracted text
    return parse_txt(text.encode("utf-8"))


def parse_pdf(file_bytes: bytes) -> dict:
    """Parse a PDF file and extract text."""
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages_text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            pages_text.append(page_text)

    full_text = "\n".join(pages_text)
    # Re-use txt parsing logic on extracted text
    return parse_txt(full_text.encode("utf-8"))


PARSERS = {
    "docx": parse_docx,
    "txt": parse_txt,
    "rtf": parse_rtf,
    "pdf": parse_pdf,
}


def parse_manuscript(file_bytes: bytes, file_type: str) -> dict:
    """
    Parse a manuscript file and return structured data.

    Returns:
        dict with keys: raw_text, chapters, word_count, chapter_count
    """
    file_type = file_type.lower().lstrip(".")
    parser = PARSERS.get(file_type)
    if not parser:
        raise ValueError(f"Unsupported file type: {file_type}. Supported: {list(PARSERS.keys())}")
    return parser(file_bytes)
