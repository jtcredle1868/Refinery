import os
import re
import json
from typing import Tuple


def extract_text_from_file(file_path: str, file_type: str) -> str:
    ext = file_type.lower()
    if ext == ".docx":
        return _extract_docx(file_path)
    elif ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext == ".rtf":
        return _extract_rtf(file_path)
    elif ext == ".txt":
        return _extract_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_docx(file_path: str) -> str:
    try:
        import docx
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs]
        return "\n".join(paragraphs)
    except Exception as e:
        raise ValueError(f"Failed to extract text from .docx: {str(e)}")


def _extract_pdf(file_path: str) -> str:
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    except Exception as e:
        raise ValueError(f"Failed to extract text from .pdf: {str(e)}")


def _extract_rtf(file_path: str) -> str:
    try:
        from striprtf.striprtf import rtf_to_text
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            rtf_content = f.read()
        return rtf_to_text(rtf_content)
    except Exception as e:
        raise ValueError(f"Failed to extract text from .rtf: {str(e)}")


def _extract_txt(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def detect_chapters(text: str) -> list:
    """Detect chapters using priority order from spec:
    1. Explicit heading styles -> 'Chapter N' patterns
    2. All-caps short lines
    3. 3+ consecutive blank lines before capitalized line
    4. Fallback: treat as single chapter
    """
    chapters = []

    # Strategy 1: "Chapter N" patterns
    chapter_pattern = re.compile(
        r'^(Chapter\s+\d+[:\.\s].*|CHAPTER\s+\d+[:\.\s].*|Chapter\s+[IVXLC]+[:\.\s].*)',
        re.MULTILINE | re.IGNORECASE
    )
    matches = list(chapter_pattern.finditer(text))

    if len(matches) >= 2:
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            chapter_text = text[start:end].strip()
            title = match.group(0).strip()
            word_count = len(chapter_text.split())
            chapters.append({
                "number": i + 1,
                "title": title,
                "word_count": word_count,
                "start_offset": start,
                "text": chapter_text,
            })
        return chapters

    # Strategy 2: ALL CAPS short lines (likely headings)
    caps_pattern = re.compile(r'^([A-Z][A-Z\s]{2,40})$', re.MULTILINE)
    caps_matches = [m for m in caps_pattern.finditer(text) if len(m.group(0).strip()) > 3]

    if len(caps_matches) >= 2:
        for i, match in enumerate(caps_matches):
            start = match.start()
            end = caps_matches[i + 1].start() if i + 1 < len(caps_matches) else len(text)
            chapter_text = text[start:end].strip()
            title = match.group(0).strip()
            word_count = len(chapter_text.split())
            chapters.append({
                "number": i + 1,
                "title": title,
                "word_count": word_count,
                "start_offset": start,
                "text": chapter_text,
            })
        return chapters

    # Strategy 3: 3+ blank lines followed by capitalized line
    blank_pattern = re.compile(r'\n{3,}([A-Z][^\n]+)')
    blank_matches = list(blank_pattern.finditer(text))

    if len(blank_matches) >= 2:
        for i, match in enumerate(blank_matches):
            start = match.start()
            end = blank_matches[i + 1].start() if i + 1 < len(blank_matches) else len(text)
            chapter_text = text[start:end].strip()
            title = match.group(1).strip()
            word_count = len(chapter_text.split())
            chapters.append({
                "number": i + 1,
                "title": title,
                "word_count": word_count,
                "start_offset": start,
                "text": chapter_text,
            })
        return chapters

    # Fallback: treat as single chapter
    word_count = len(text.split())
    chapters.append({
        "number": 1,
        "title": "Full Manuscript",
        "word_count": word_count,
        "start_offset": 0,
        "text": text,
    })
    return chapters


def count_words(text: str) -> int:
    return len(text.split())


def normalize_text(text: str) -> str:
    """Convert smart quotes to straight quotes for internal processing."""
    replacements = {
        '\u2018': "'", '\u2019': "'",  # single smart quotes
        '\u201C': '"', '\u201D': '"',  # double smart quotes
        '\u2013': '-', '\u2014': '--',  # en-dash, em-dash
        '\u2026': '...',  # ellipsis
    }
    for smart, straight in replacements.items():
        text = text.replace(smart, straight)
    return text
