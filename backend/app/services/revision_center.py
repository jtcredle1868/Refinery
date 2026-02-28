"""
Module 6: Revision Command Center

Aggregated revision management:
- Edit queue: all findings from all modules, scored by impact
- Accept/reject/defer individual items
- Filter by module, severity, status, chapter
- Export aggregated findings
"""
import json
from typing import Optional


def aggregate_edit_queue(analyses: list[dict]) -> dict:
    """
    Aggregate findings from all completed module analyses into a unified edit queue.
    Each analysis dict should have 'analysis_type' and 'results_json' keys.
    """
    queue_items = []
    item_id = 0

    for analysis in analyses:
        results = json.loads(analysis.get("results_json", "{}")) if isinstance(analysis.get("results_json"), str) else analysis.get("results_json", {})
        analysis_type = analysis.get("analysis_type", "unknown")

        # Extract findings from Intelligence Engine
        if analysis_type in ("xray", "intelligence_engine"):
            # Duplication findings
            for dup in results.get("duplication_detection", {}).get("items", []):
                item_id += 1
                queue_items.append({
                    "id": item_id,
                    "module": "intelligence_engine",
                    "finding_type": "duplication",
                    "severity": "high" if dup.get("similarity_percent", 0) > 85 else "medium",
                    "chapter": dup.get("location_a", ""),
                    "description": f"Content duplication ({dup.get('similarity_percent', 0)}% similar): {dup.get('location_a', '')} ↔ {dup.get('location_b', '')}",
                    "suggestion": f"Review and resolve duplicated content: \"{dup.get('excerpt', '')}\"",
                    "status": "pending",
                })
            # Timeline anomalies
            for anom in results.get("timeline_anomalies", {}).get("items", []):
                item_id += 1
                queue_items.append({
                    "id": item_id,
                    "module": "intelligence_engine",
                    "finding_type": "timeline_anomaly",
                    "severity": anom.get("severity", "medium"),
                    "chapter": anom.get("location", ""),
                    "description": anom.get("description", ""),
                    "suggestion": "Review and correct the chronological inconsistency",
                    "status": "pending",
                })

        # Extract findings from Prose Refinery
        if analysis_type == "prose_refinery":
            # Show vs tell
            for item in results.get("show_vs_tell", {}).get("items", []):
                item_id += 1
                queue_items.append({
                    "id": item_id,
                    "module": "prose_refinery",
                    "finding_type": "show_vs_tell",
                    "severity": item.get("severity", "medium"),
                    "chapter": item.get("location", ""),
                    "description": f"Telling instead of showing: \"{item.get('original', '')}\"",
                    "suggestion": item.get("suggestion", ""),
                    "status": "pending",
                })
            # Tics
            for tic in results.get("tic_tracker", {}).get("items", []):
                if tic.get("severity") in ("high", "medium"):
                    item_id += 1
                    queue_items.append({
                        "id": item_id,
                        "module": "prose_refinery",
                        "finding_type": "writing_tic",
                        "severity": tic.get("severity", "medium"),
                        "chapter": "Multiple",
                        "description": f"Overused word/phrase: \"{tic.get('word_or_phrase', '')}\" ({tic.get('total_count', 0)} occurrences)",
                        "suggestion": tic.get("suggestion", ""),
                        "status": "pending",
                    })

        # Extract findings from Voice Isolation
        if analysis_type == "voice_isolation":
            for char in results.get("characters", []):
                for bleed in char.get("jargon_bleed", []):
                    item_id += 1
                    queue_items.append({
                        "id": item_id,
                        "module": "voice_isolation",
                        "finding_type": "jargon_bleed",
                        "severity": "medium",
                        "chapter": f"Chapter {bleed.get('chapter', '?')}",
                        "description": f"Jargon bleed in {char['name']}'s dialogue: \"{bleed.get('passage', '')}\"",
                        "suggestion": bleed.get("reason", ""),
                        "status": "pending",
                    })
            for sim in results.get("similarity_matrix", []):
                if sim.get("flagged"):
                    item_id += 1
                    queue_items.append({
                        "id": item_id,
                        "module": "voice_isolation",
                        "finding_type": "voice_similarity",
                        "severity": "high" if sim.get("similarity_score", 0) > 75 else "medium",
                        "chapter": "All",
                        "description": f"{sim['character_a']} and {sim['character_b']} sound too similar (score: {sim.get('similarity_score', 0)})",
                        "suggestion": f"Differentiate voices. Similar traits: {', '.join(sim.get('similar_traits', []))}",
                        "status": "pending",
                    })

        # Extract findings from Pacing Architect
        if analysis_type == "pacing_architect":
            for flag in results.get("breathing_space_flags", []):
                item_id += 1
                queue_items.append({
                    "id": item_id,
                    "module": "pacing_architect",
                    "finding_type": "breathing_space",
                    "severity": "medium",
                    "chapter": f"Chapters {flag.get('start_chapter', '?')}-{flag.get('end_chapter', '?')}",
                    "description": flag.get("description", "Consecutive high-action chapters without emotional decompression"),
                    "suggestion": flag.get("suggestion", ""),
                    "status": "pending",
                })
            for flag in results.get("slow_zone_flags", []):
                item_id += 1
                queue_items.append({
                    "id": item_id,
                    "module": "pacing_architect",
                    "finding_type": "slow_zone",
                    "severity": "medium",
                    "chapter": f"Chapters {flag.get('start_chapter', '?')}-{flag.get('end_chapter', '?')}",
                    "description": flag.get("description", "Consecutive low-action chapters without escalation"),
                    "suggestion": flag.get("suggestion", ""),
                    "status": "pending",
                })

        # Character Arc inconsistencies
        if analysis_type == "character_arc":
            for char in results.get("characters", []):
                for incon in char.get("inconsistencies", []):
                    item_id += 1
                    queue_items.append({
                        "id": item_id,
                        "module": "character_arc",
                        "finding_type": "arc_inconsistency",
                        "severity": incon.get("severity", "medium"),
                        "chapter": f"Chapter {incon.get('chapter', '?')}",
                        "description": f"{char['name']}: {incon.get('description', '')}",
                        "suggestion": f"Expected: {incon.get('expected_behavior', '')}. Actual: {incon.get('actual_behavior', '')}",
                        "status": "pending",
                    })

    # Sort by severity (high first)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    queue_items.sort(key=lambda x: severity_order.get(x["severity"], 3))

    stats = {
        "total": len(queue_items),
        "high": sum(1 for i in queue_items if i["severity"] == "high"),
        "medium": sum(1 for i in queue_items if i["severity"] == "medium"),
        "low": sum(1 for i in queue_items if i["severity"] == "low"),
        "by_module": {},
    }
    for item in queue_items:
        mod = item["module"]
        stats["by_module"][mod] = stats["by_module"].get(mod, 0) + 1

    return {
        "items": queue_items,
        "stats": stats,
    }
