"""
Export Service

Handles manuscript export in multiple formats:
- Clean DOCX: all accepted changes incorporated
- Tracked Changes DOCX: findings as Word comments
- PDF Report: analysis summary report
"""
import io
import json
from typing import Optional
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH


def export_clean_docx(raw_text: str, chapters: list[dict], title: str) -> bytes:
    """Export manuscript as clean DOCX with accepted changes."""
    doc = Document()

    # Title
    title_para = doc.add_heading(title, level=0)
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("")  # spacer

    for ch in chapters:
        doc.add_heading(ch.get("title", f"Chapter {ch['index'] + 1}"), level=1)
        paragraphs = ch["text"].split("\n")
        for para_text in paragraphs:
            if para_text.strip():
                doc.add_paragraph(para_text.strip())

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def export_tracked_changes_docx(
    raw_text: str,
    chapters: list[dict],
    title: str,
    findings: list[dict],
) -> bytes:
    """Export manuscript as DOCX with findings as comments."""
    doc = Document()

    # Title
    title_para = doc.add_heading(title, level=0)
    title_para.alignment = WD_ALIGN_PARAGRAPH.CENTER

    # Summary section
    doc.add_heading("Refinery Analysis Findings", level=1)
    doc.add_paragraph(
        f"Total findings: {len(findings)} | "
        f"High: {sum(1 for f in findings if f.get('severity') == 'high')} | "
        f"Medium: {sum(1 for f in findings if f.get('severity') == 'medium')} | "
        f"Low: {sum(1 for f in findings if f.get('severity') == 'low')}"
    )
    doc.add_paragraph("")

    # Findings list
    for i, finding in enumerate(findings, 1):
        severity = finding.get("severity", "medium").upper()
        module = finding.get("module", "unknown").replace("_", " ").title()
        p = doc.add_paragraph()
        run = p.add_run(f"[{severity}] ")
        run.bold = True
        if severity == "HIGH":
            run.font.color.rgb = RGBColor(220, 38, 38)
        elif severity == "MEDIUM":
            run.font.color.rgb = RGBColor(245, 158, 11)
        p.add_run(f"({module}) ").italic = True
        p.add_run(finding.get("description", ""))
        if finding.get("suggestion"):
            suggestion_p = doc.add_paragraph()
            suggestion_p.paragraph_format.left_indent = Inches(0.5)
            run = suggestion_p.add_run("Suggestion: ")
            run.bold = True
            suggestion_p.add_run(finding.get("suggestion", ""))

    doc.add_page_break()

    # Manuscript text
    doc.add_heading("Manuscript", level=1)
    for ch in chapters:
        doc.add_heading(ch.get("title", f"Chapter {ch['index'] + 1}"), level=2)
        paragraphs = ch["text"].split("\n")
        for para_text in paragraphs:
            if para_text.strip():
                doc.add_paragraph(para_text.strip())

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def export_analysis_report_docx(
    title: str,
    health_scores: dict,
    module_summaries: dict,
) -> bytes:
    """Generate a formatted DOCX analysis report."""
    doc = Document()

    # Report title
    heading = doc.add_heading(f"Analysis Report: {title}", level=0)
    heading.alignment = WD_ALIGN_PARAGRAPH.CENTER

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = sub.add_run("Refinery — Where Prose Becomes Perfect")
    run.italic = True
    run.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph("")

    # Health scores section
    if health_scores:
        doc.add_heading("Health Scores", level=1)
        for key, value in health_scores.items():
            label = key.replace("_", " ").title()
            score = value if isinstance(value, (int, float)) else "N/A"
            p = doc.add_paragraph()
            run = p.add_run(f"{label}: ")
            run.bold = True
            p.add_run(f"{score}/100" if isinstance(score, (int, float)) else str(score))

    # Module summaries
    if module_summaries:
        doc.add_heading("Module Analysis", level=1)
        for module_name, data in module_summaries.items():
            label = module_name.replace("_", " ").title()
            doc.add_heading(label, level=2)
            score = data.get("score")
            if score is not None:
                p = doc.add_paragraph()
                run = p.add_run("Score: ")
                run.bold = True
                p.add_run(str(score))
            summary = data.get("summary", "")
            if summary:
                doc.add_paragraph(summary)

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()
