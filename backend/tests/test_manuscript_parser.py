"""Tests for manuscript_parser — the file parsing layer."""
import pytest
from app.services.manuscript_parser import parse_manuscript


def test_parse_plain_text():
    text = "Chapter 1\n\nThis is the first chapter.\n\nChapter 2\n\nSecond chapter here."
    result = parse_manuscript(text.encode(), "txt")
    assert result["word_count"] > 0
    assert result["raw_text"] == text
    assert isinstance(result["chapters"], list)
    assert result["chapter_count"] == len(result["chapters"])


def test_parse_txt_word_count():
    words = ["word"] * 500
    text = " ".join(words)
    result = parse_manuscript(text.encode(), "txt")
    assert result["word_count"] == 500


def test_parse_unsupported_extension():
    with pytest.raises(Exception):
        parse_manuscript(b"data", "xyz")


def test_parse_empty_txt():
    result = parse_manuscript(b"", "txt")
    assert result["word_count"] == 0
    assert result["raw_text"] == ""
