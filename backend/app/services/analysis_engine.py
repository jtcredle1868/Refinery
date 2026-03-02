"""
Analysis engine that orchestrates mock analysis for all 6 modules.
In production, this would dispatch to Celery workers calling the Claude API.
For the demo, it generates comprehensive predetermined outputs.
"""
import json
import datetime
from sqlalchemy.orm import Session

from app.models.manuscript import Manuscript, ManuscriptStatus
from app.models.analysis import AnalysisResult, AnalysisModule, EditQueueItem, Severity, EditItemStatus
from app.mock_data.analysis_results import (
    generate_manuscript_intelligence,
    generate_voice_isolation,
    generate_pacing_architect,
    generate_character_arc,
    generate_prose_refinery,
    generate_revision_command,
    generate_acquisition_score,
)


def run_full_analysis(db: Session, manuscript: Manuscript) -> dict:
    """Run all 6 analysis modules on a manuscript."""
    manuscript.status = ManuscriptStatus.ANALYZING
    manuscript.progress_percent = 10.0
    db.commit()

    text = manuscript.extracted_text or ""
    title = manuscript.title
    word_count = manuscript.word_count
    chapter_count = manuscript.chapter_count

    all_results = {}
    modules_and_generators = [
        (AnalysisModule.MANUSCRIPT_INTELLIGENCE, generate_manuscript_intelligence, 25.0),
        (AnalysisModule.VOICE_ISOLATION, generate_voice_isolation, 40.0),
        (AnalysisModule.PACING_ARCHITECT, generate_pacing_architect, 55.0),
        (AnalysisModule.CHARACTER_ARC, generate_character_arc, 70.0),
        (AnalysisModule.PROSE_REFINERY, generate_prose_refinery, 85.0),
    ]

    for module, generator, progress in modules_and_generators:
        result_data = generator(title, word_count, chapter_count, text)
        all_results[module.value] = result_data

        # Delete old results for this module
        db.query(AnalysisResult).filter(
            AnalysisResult.manuscript_id == manuscript.id,
            AnalysisResult.module == module,
        ).delete()

        # Store new result
        analysis_result = AnalysisResult(
            manuscript_id=manuscript.id,
            module=module,
            result_json=json.dumps(result_data),
            version=1,
        )
        db.add(analysis_result)
        manuscript.progress_percent = progress
        db.commit()

    # Module 6: Revision Command Center (aggregates all)
    revision_data = generate_revision_command(title, word_count, chapter_count, text, all_results)
    all_results["revision_command"] = revision_data

    db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript.id,
        AnalysisResult.module == AnalysisModule.REVISION_COMMAND,
    ).delete()

    analysis_result = AnalysisResult(
        manuscript_id=manuscript.id,
        module=AnalysisModule.REVISION_COMMAND,
        result_json=json.dumps(revision_data),
        version=1,
    )
    db.add(analysis_result)

    # Populate edit queue items from revision command data
    db.query(EditQueueItem).filter(EditQueueItem.manuscript_id == manuscript.id).delete()
    for item in revision_data.get("edit_queue", []):
        edit_item = EditQueueItem(
            manuscript_id=manuscript.id,
            module=AnalysisModule(item["module"]),
            severity=Severity(item["severity"]),
            chapter=item.get("chapter"),
            location=item.get("location"),
            finding=item["finding"],
            suggestion=item["suggestion"],
            status=EditItemStatus.PENDING,
        )
        db.add(edit_item)

    manuscript.status = ManuscriptStatus.COMPLETE
    manuscript.progress_percent = 100.0
    manuscript.last_analyzed_at = datetime.datetime.utcnow()
    db.commit()

    return all_results


def run_single_module(db: Session, manuscript: Manuscript, module: AnalysisModule) -> dict:
    """Run a single analysis module."""
    text = manuscript.extracted_text or ""
    title = manuscript.title
    word_count = manuscript.word_count
    chapter_count = manuscript.chapter_count

    generators = {
        AnalysisModule.MANUSCRIPT_INTELLIGENCE: generate_manuscript_intelligence,
        AnalysisModule.VOICE_ISOLATION: generate_voice_isolation,
        AnalysisModule.PACING_ARCHITECT: generate_pacing_architect,
        AnalysisModule.CHARACTER_ARC: generate_character_arc,
        AnalysisModule.PROSE_REFINERY: generate_prose_refinery,
    }

    if module == AnalysisModule.REVISION_COMMAND:
        # Need all other modules first
        all_results = {}
        for mod in [AnalysisModule.MANUSCRIPT_INTELLIGENCE, AnalysisModule.VOICE_ISOLATION,
                     AnalysisModule.PACING_ARCHITECT, AnalysisModule.CHARACTER_ARC,
                     AnalysisModule.PROSE_REFINERY]:
            existing = db.query(AnalysisResult).filter(
                AnalysisResult.manuscript_id == manuscript.id,
                AnalysisResult.module == mod,
            ).first()
            if existing:
                all_results[mod.value] = json.loads(existing.result_json)
            else:
                gen = generators[mod]
                all_results[mod.value] = gen(title, word_count, chapter_count, text)

        result_data = generate_revision_command(title, word_count, chapter_count, text, all_results)
    else:
        generator = generators[module]
        result_data = generator(title, word_count, chapter_count, text)

    # Update or create result
    db.query(AnalysisResult).filter(
        AnalysisResult.manuscript_id == manuscript.id,
        AnalysisResult.module == module,
    ).delete()

    analysis_result = AnalysisResult(
        manuscript_id=manuscript.id,
        module=module,
        result_json=json.dumps(result_data),
        version=1,
    )
    db.add(analysis_result)
    db.commit()

    return result_data
