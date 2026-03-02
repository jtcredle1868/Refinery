"""
Predetermined mock analysis results for all 6 modules.
These generate realistic, consistent outputs when the AI engine
is not connected, ensuring the demo is fully functional.
"""
import json
import random
import re
from typing import Optional


def generate_manuscript_intelligence(title: str, word_count: int, chapter_count: int, text: str) -> dict:
    """Module 1: Manuscript Intelligence Engine"""
    characters = _extract_character_names(text)
    if not characters:
        characters = ["Eleanor Voss", "Marcus Chen", "Dr. Sarah Webb", "James Hartley", "Lily Moreau"]

    char_census = []
    for i, name in enumerate(characters[:10]):
        mentions = text.lower().count(name.split()[0].lower()) if text else random.randint(5, 150)
        char_census.append({
            "name": name,
            "mentions": max(mentions, random.randint(3, 50)),
            "first_appearance": f"Chapter {min(i + 1, chapter_count)}",
            "role": ["Protagonist", "Antagonist", "Supporting", "Minor"][min(i, 3)],
            "aliases": [],
        })

    chapters_data = []
    for i in range(1, chapter_count + 1):
        chapters_data.append({
            "chapter": i,
            "word_count": word_count // max(chapter_count, 1) + random.randint(-200, 200),
            "estimated_reading_time_min": round((word_count // max(chapter_count, 1)) / 250, 1),
        })

    duplicate_sections = []
    if word_count > 5000:
        duplicate_sections.append({
            "text_snippet": "The morning sun cast long shadows across the empty courtyard...",
            "locations": [
                {"chapter": 1, "paragraph": 3},
                {"chapter": max(chapter_count - 2, 1), "paragraph": 7},
            ],
            "similarity_score": 0.89,
            "severity": "MEDIUM",
        })

    metaphor_density = []
    for i in range(1, chapter_count + 1):
        metaphor_density.append({
            "chapter": i,
            "density_score": round(random.uniform(0.02, 0.15), 3),
            "metaphor_count": random.randint(2, 18),
            "simile_count": random.randint(1, 12),
        })

    unique_words = min(int(word_count * 0.12), 8500)
    return {
        "module": "manuscript_intelligence",
        "title": title,
        "summary": {
            "total_word_count": word_count,
            "chapter_count": chapter_count,
            "unique_word_count": unique_words,
            "average_sentence_length": round(random.uniform(12.5, 22.3), 1),
            "average_paragraph_length": round(random.uniform(45.0, 120.0), 1),
            "lexical_diversity": round(unique_words / max(word_count, 1), 4),
            "reading_level_grade": round(random.uniform(7.5, 14.2), 1),
            "estimated_reading_time_hours": round(word_count / 15000, 1),
        },
        "character_census": char_census,
        "chapters": chapters_data,
        "duplicate_detection": {
            "duplicates_found": len(duplicate_sections),
            "total_duplicate_words": random.randint(0, 350),
            "duplicate_percentage": round(random.uniform(0.0, 2.5), 2),
            "sections": duplicate_sections,
        },
        "metaphor_density_heatmap": metaphor_density,
        "lexical_fingerprint": {
            "top_words": [
                {"word": "said", "count": random.randint(80, 250)},
                {"word": "looked", "count": random.randint(40, 120)},
                {"word": "thought", "count": random.randint(30, 100)},
                {"word": "felt", "count": random.randint(25, 90)},
                {"word": "turned", "count": random.randint(20, 80)},
                {"word": "knew", "count": random.randint(15, 70)},
                {"word": "eyes", "count": random.randint(15, 65)},
                {"word": "hand", "count": random.randint(10, 55)},
                {"word": "dark", "count": random.randint(10, 50)},
                {"word": "time", "count": random.randint(10, 45)},
            ],
            "vocabulary_richness": "Above Average",
            "readability_score": round(random.uniform(55.0, 78.0), 1),
        },
        "scores": {
            "structural_integrity": random.randint(65, 95),
            "completeness": random.randint(70, 98),
            "consistency": random.randint(60, 95),
            "overall": random.randint(68, 92),
        },
    }


def generate_voice_isolation(title: str, word_count: int, chapter_count: int, text: str) -> dict:
    """Module 2: Voice Isolation Lab"""
    characters = _extract_character_names(text)
    if not characters:
        characters = ["Eleanor Voss", "Marcus Chen", "Dr. Sarah Webb", "James Hartley", "Lily Moreau"]

    voice_profiles = []
    for i, name in enumerate(characters[:5]):
        profile = {
            "character": name,
            "dialogue_word_count": random.randint(500, 5000),
            "dialogue_percentage": round(random.uniform(5.0, 25.0), 1),
            "average_sentence_length": round(random.uniform(8.0, 20.0), 1),
            "vocabulary_complexity": round(random.uniform(0.3, 0.9), 2),
            "formality_score": round(random.uniform(0.2, 0.9), 2),
            "emotional_range": round(random.uniform(0.3, 0.8), 2),
            "signature_phrases": _get_signature_phrases(i),
            "dialogue_tags": {
                "said": random.randint(10, 60),
                "asked": random.randint(5, 25),
                "whispered": random.randint(0, 10),
                "shouted": random.randint(0, 8),
                "replied": random.randint(3, 15),
                "murmured": random.randint(0, 7),
            },
            "sample_lines": [
                f'"I never thought it would come to this," {name.split()[0]} said quietly.',
                f'"You don\'t understand what\'s at stake here," {name.split()[0]} replied.',
                f'"Let me think about it. Give me until tomorrow."',
            ],
        }
        voice_profiles.append(profile)

    similarity_matrix = []
    for i, p1 in enumerate(voice_profiles):
        row = []
        for j, p2 in enumerate(voice_profiles):
            if i == j:
                row.append(1.0)
            else:
                row.append(round(random.uniform(0.15, 0.55), 2))
        similarity_matrix.append({
            "character": p1["character"],
            "scores": row,
        })

    jargon_bleed = []
    if len(voice_profiles) >= 2:
        jargon_bleed.append({
            "term": "fundamentally",
            "expected_speaker": voice_profiles[0]["character"],
            "found_in_speech_of": voice_profiles[1]["character"],
            "chapter": random.randint(1, max(chapter_count, 1)),
            "severity": "LOW",
        })

    return {
        "module": "voice_isolation",
        "title": title,
        "summary": {
            "total_dialogue_word_count": sum(p["dialogue_word_count"] for p in voice_profiles),
            "dialogue_to_narrative_ratio": round(random.uniform(0.15, 0.45), 2),
            "unique_speakers_detected": len(voice_profiles),
            "voice_distinctiveness_score": random.randint(60, 95),
        },
        "voice_profiles": voice_profiles,
        "similarity_matrix": {
            "characters": [p["character"] for p in voice_profiles],
            "matrix": similarity_matrix,
        },
        "jargon_bleed_detection": jargon_bleed,
        "blind_voice_test": {
            "test_passages": [
                {
                    "passage": '"We need to move quickly. There isn\'t much time left, and I won\'t have another chance to make this right."',
                    "actual_speaker": voice_profiles[0]["character"] if voice_profiles else "Unknown",
                    "confidence": 0.87,
                },
            ],
            "overall_distinctiveness": round(random.uniform(0.55, 0.90), 2),
        },
        "scores": {
            "voice_distinctiveness": random.randint(55, 95),
            "dialogue_authenticity": random.randint(60, 92),
            "tag_variety": random.randint(50, 90),
            "overall": random.randint(62, 90),
        },
    }


def generate_pacing_architect(title: str, word_count: int, chapter_count: int, text: str) -> dict:
    """Module 3: Pacing Architect"""
    chapter_pacing = []
    for i in range(1, chapter_count + 1):
        action_score = round(random.uniform(0.1, 0.9), 2)
        emotion_score = round(random.uniform(0.2, 0.95), 2)
        tension = round(random.uniform(0.15, 0.95), 2)
        # Create a rising tension arc with natural variation
        base_tension = (i / max(chapter_count, 1)) * 0.7 + 0.15
        tension = round(min(base_tension + random.uniform(-0.15, 0.15), 0.98), 2)

        chapter_pacing.append({
            "chapter": i,
            "action_beats": random.randint(2, 12),
            "emotion_beats": random.randint(3, 15),
            "action_score": action_score,
            "emotion_score": emotion_score,
            "tension_level": tension,
            "pacing_type": random.choice(["Rising Action", "Falling Action", "Climactic", "Reflective", "Transitional"]),
            "word_count": word_count // max(chapter_count, 1) + random.randint(-200, 200),
            "scene_count": random.randint(1, 5),
        })

    tension_curve = [{"chapter": cp["chapter"], "tension": cp["tension_level"]} for cp in chapter_pacing]

    slow_zones = []
    breathing_spaces = []
    for cp in chapter_pacing:
        if cp["action_score"] < 0.25 and cp["emotion_score"] < 0.3:
            slow_zones.append({
                "chapter": cp["chapter"],
                "reason": "Low action and emotional engagement",
                "severity": "MEDIUM",
                "suggestion": "Consider adding a subplot revelation or character conflict to increase engagement.",
            })
        if cp["tension_level"] < 0.3 and cp["chapter"] > 1:
            breathing_spaces.append({
                "chapter": cp["chapter"],
                "type": "Natural Pause",
                "effectiveness": round(random.uniform(0.5, 0.9), 2),
            })

    return {
        "module": "pacing_architect",
        "title": title,
        "summary": {
            "overall_pacing_score": random.randint(60, 92),
            "tension_arc_shape": "Rising with Climax",
            "average_chapter_length": word_count // max(chapter_count, 1),
            "total_scenes": sum(cp["scene_count"] for cp in chapter_pacing),
            "slow_zones_count": len(slow_zones),
            "breathing_spaces_count": len(breathing_spaces),
        },
        "chapter_analysis": chapter_pacing,
        "tension_curve": tension_curve,
        "slow_zones": slow_zones,
        "breathing_spaces": breathing_spaces,
        "pulse_graph": {
            "labels": [f"Ch {i}" for i in range(1, chapter_count + 1)],
            "action": [cp["action_score"] for cp in chapter_pacing],
            "emotion": [cp["emotion_score"] for cp in chapter_pacing],
            "tension": [cp["tension_level"] for cp in chapter_pacing],
        },
        "scores": {
            "pacing_quality": random.randint(58, 93),
            "tension_management": random.randint(55, 90),
            "structural_balance": random.randint(60, 95),
            "overall": random.randint(60, 90),
        },
    }


def generate_character_arc(title: str, word_count: int, chapter_count: int, text: str) -> dict:
    """Module 4: Character Arc Workshop"""
    characters = _extract_character_names(text)
    if not characters:
        characters = ["Eleanor Voss", "Marcus Chen", "Dr. Sarah Webb", "James Hartley", "Lily Moreau"]

    arc_data = []
    arc_types = ["Transformation", "Growth", "Fall", "Flat/Testing", "Disillusionment"]

    for i, name in enumerate(characters[:5]):
        arc_type = arc_types[i % len(arc_types)]
        arc = {
            "character": name,
            "arc_type": arc_type,
            "want": _get_character_want(i),
            "fear": _get_character_fear(i),
            "belief": _get_character_belief(i),
            "behavior_start": _get_behavior_start(i),
            "behavior_end": _get_behavior_end(i),
            "transformation_score": round(random.uniform(0.4, 0.95), 2),
            "arc_completeness": round(random.uniform(0.5, 1.0), 2),
            "key_turning_points": [
                {
                    "chapter": random.randint(1, max(chapter_count // 3, 1)),
                    "event": "Inciting incident challenges core belief",
                    "impact": "HIGH",
                },
                {
                    "chapter": random.randint(max(chapter_count // 3, 1), max(chapter_count * 2 // 3, 2)),
                    "event": "Midpoint revelation forces choice",
                    "impact": "HIGH",
                },
                {
                    "chapter": random.randint(max(chapter_count * 2 // 3, 2), max(chapter_count, 3)),
                    "event": "Climactic decision demonstrates change",
                    "impact": "HIGH",
                },
            ],
            "chapter_presence": [
                {
                    "chapter": c,
                    "present": random.random() > (0.2 if i == 0 else 0.5),
                    "emotional_state": random.choice(["Determined", "Conflicted", "Hopeful", "Fearful", "Resolved"]),
                }
                for c in range(1, chapter_count + 1)
            ],
        }
        arc_data.append(arc)

    alternative_arcs = []
    if arc_data:
        alternative_arcs.append({
            "character": arc_data[0]["character"],
            "current_arc": arc_data[0]["arc_type"],
            "alternative": "Tragic Fall",
            "description": f"Instead of {arc_data[0]['arc_type'].lower()}, {arc_data[0]['character']} could undergo a tragic fall where their initial strength becomes their undoing.",
            "impact_assessment": "Would strengthen thematic resonance but may reduce reader satisfaction.",
        })

    return {
        "module": "character_arc",
        "title": title,
        "summary": {
            "characters_tracked": len(arc_data),
            "arc_completeness_average": round(sum(a["arc_completeness"] for a in arc_data) / max(len(arc_data), 1), 2),
            "transformation_quality": random.randint(60, 92),
        },
        "character_arcs": arc_data,
        "alternative_arcs": alternative_arcs,
        "relationship_dynamics": [
            {
                "characters": [arc_data[0]["character"], arc_data[1]["character"]] if len(arc_data) >= 2 else ["Character A", "Character B"],
                "relationship_type": "Adversarial evolving to Respectful",
                "tension_level": round(random.uniform(0.4, 0.9), 2),
                "evolution": "Progressive transformation through shared ordeal",
            }
        ] if len(arc_data) >= 2 else [],
        "scores": {
            "arc_depth": random.randint(55, 95),
            "consistency": random.randint(60, 92),
            "transformation_quality": random.randint(58, 90),
            "overall": random.randint(62, 90),
        },
    }


def generate_prose_refinery(title: str, word_count: int, chapter_count: int, text: str) -> dict:
    """Module 5: Prose Refinery"""
    filter_words = {
        "just": random.randint(20, 120),
        "really": random.randint(10, 80),
        "very": random.randint(15, 90),
        "quite": random.randint(5, 45),
        "rather": random.randint(3, 30),
        "somewhat": random.randint(2, 20),
        "basically": random.randint(1, 15),
        "actually": random.randint(5, 40),
        "literally": random.randint(2, 25),
        "suddenly": random.randint(8, 50),
    }

    # Count actual occurrences if text is available
    if text and len(text) > 100:
        for word in filter_words:
            count = len(re.findall(r'\b' + word + r'\b', text, re.IGNORECASE))
            if count > 0:
                filter_words[word] = count

    total_filter = sum(filter_words.values())

    tic_detection = [
        {
            "pattern": "started to [verb]",
            "count": random.randint(5, 35),
            "severity": "MEDIUM",
            "suggestion": "Use direct action instead of 'started to'. E.g., 'She ran' instead of 'She started to run'.",
            "examples": [
                {"chapter": random.randint(1, max(chapter_count, 1)), "text": "She started to wonder if..."},
            ],
        },
        {
            "pattern": "seemed to [verb]",
            "count": random.randint(3, 25),
            "severity": "MEDIUM",
            "suggestion": "Commit to the action. 'The sky darkened' instead of 'The sky seemed to darken'.",
            "examples": [
                {"chapter": random.randint(1, max(chapter_count, 1)), "text": "He seemed to understand..."},
            ],
        },
        {
            "pattern": "began to [verb]",
            "count": random.randint(4, 30),
            "severity": "LOW",
            "suggestion": "Use the direct verb for stronger prose.",
            "examples": [
                {"chapter": random.randint(1, max(chapter_count, 1)), "text": "Rain began to fall..."},
            ],
        },
    ]

    show_vs_tell = [
        {
            "chapter": random.randint(1, max(chapter_count, 1)),
            "text": "She was angry about what had happened.",
            "type": "TELL",
            "severity": "MEDIUM",
            "suggestion": "Show through action: 'Her fist clenched around the letter, knuckles white. She hurled it into the fireplace.'",
        },
        {
            "chapter": random.randint(1, max(chapter_count, 1)),
            "text": "He felt sad when she left.",
            "type": "TELL",
            "severity": "HIGH",
            "suggestion": "Show emotion through physical response: 'The door clicked shut. He stood motionless, the silence pressing against his chest like a weight.'",
        },
        {
            "chapter": random.randint(1, max(chapter_count, 1)),
            "text": "The town was beautiful in autumn.",
            "type": "TELL",
            "severity": "LOW",
            "suggestion": "Paint the scene: 'Maple leaves drifted like embers across the cobblestone square, their crimson catching the late afternoon light.'",
        },
    ]

    sentence_rhythm = {
        "average_length": round(random.uniform(13.0, 21.0), 1),
        "shortest": random.randint(2, 5),
        "longest": random.randint(35, 65),
        "variation_score": round(random.uniform(0.4, 0.9), 2),
        "distribution": {
            "short_1_10": round(random.uniform(15.0, 35.0), 1),
            "medium_11_20": round(random.uniform(30.0, 50.0), 1),
            "long_21_30": round(random.uniform(15.0, 30.0), 1),
            "very_long_31_plus": round(random.uniform(3.0, 15.0), 1),
        },
        "chapter_averages": [
            {"chapter": i, "average_length": round(random.uniform(12.0, 22.0), 1)}
            for i in range(1, chapter_count + 1)
        ],
    }

    return {
        "module": "prose_refinery",
        "title": title,
        "summary": {
            "total_filter_words": total_filter,
            "filter_word_density": round(total_filter / max(word_count, 1) * 100, 2),
            "show_vs_tell_ratio": round(random.uniform(0.55, 0.85), 2),
            "tic_patterns_found": len(tic_detection),
            "prose_quality_score": random.randint(60, 92),
        },
        "filter_words": [
            {"word": word, "count": count, "density_per_1000": round(count / max(word_count, 1) * 1000, 2)}
            for word, count in sorted(filter_words.items(), key=lambda x: x[1], reverse=True)
        ],
        "tic_detection": tic_detection,
        "show_vs_tell": {
            "issues": show_vs_tell,
            "total_tell_instances": random.randint(15, 60),
            "total_show_instances": random.randint(40, 150),
            "ratio": round(random.uniform(0.55, 0.85), 2),
        },
        "sentence_rhythm": sentence_rhythm,
        "scores": {
            "prose_craft": random.randint(55, 93),
            "filter_word_score": max(100 - total_filter // 2, 30),
            "show_vs_tell_score": random.randint(55, 90),
            "rhythm_variety": random.randint(50, 95),
            "overall": random.randint(58, 90),
        },
    }


def generate_revision_command(title: str, word_count: int, chapter_count: int, text: str, all_results: dict) -> dict:
    """Module 6: Revision Command Center - aggregates all modules"""
    edit_queue = []

    # Pull findings from other modules into a prioritized edit queue
    if "prose_refinery" in all_results:
        pr = all_results["prose_refinery"]
        for fw in pr.get("filter_words", [])[:3]:
            if fw["count"] > 30:
                edit_queue.append({
                    "id": len(edit_queue) + 1,
                    "module": "prose_refinery",
                    "severity": "MEDIUM",
                    "category": "Filter Words",
                    "finding": f'Overuse of "{fw["word"]}" ({fw["count"]} occurrences, {fw["density_per_1000"]}/1000 words)',
                    "suggestion": f'Reduce usage of "{fw["word"]}" by 50%. Replace with more specific language or remove entirely where it adds no meaning.',
                    "chapter": "Throughout",
                    "status": "PENDING",
                })
        for svt in pr.get("show_vs_tell", {}).get("issues", []):
            edit_queue.append({
                "id": len(edit_queue) + 1,
                "module": "prose_refinery",
                "severity": svt["severity"],
                "category": "Show vs Tell",
                "finding": f'Telling instead of showing: "{svt["text"]}"',
                "suggestion": svt["suggestion"],
                "chapter": f'Chapter {svt["chapter"]}',
                "status": "PENDING",
            })
        for tic in pr.get("tic_detection", []):
            edit_queue.append({
                "id": len(edit_queue) + 1,
                "module": "prose_refinery",
                "severity": tic["severity"],
                "category": "Writing Tic",
                "finding": f'Repetitive pattern: "{tic["pattern"]}" ({tic["count"]} occurrences)',
                "suggestion": tic["suggestion"],
                "chapter": "Throughout",
                "status": "PENDING",
            })

    if "manuscript_intelligence" in all_results:
        mi = all_results["manuscript_intelligence"]
        for dup in mi.get("duplicate_detection", {}).get("sections", []):
            edit_queue.append({
                "id": len(edit_queue) + 1,
                "module": "manuscript_intelligence",
                "severity": "HIGH",
                "category": "Duplication",
                "finding": f'Near-duplicate content detected ({dup["similarity_score"]:.0%} similarity): "{dup["text_snippet"][:80]}..."',
                "suggestion": "Review both instances and remove or differentiate the duplicated content.",
                "chapter": f'Chapters {dup["locations"][0]["chapter"]} & {dup["locations"][1]["chapter"]}',
                "status": "PENDING",
            })

    if "voice_isolation" in all_results:
        vi = all_results["voice_isolation"]
        for jb in vi.get("jargon_bleed_detection", []):
            edit_queue.append({
                "id": len(edit_queue) + 1,
                "module": "voice_isolation",
                "severity": jb["severity"],
                "category": "Voice Consistency",
                "finding": f'Jargon bleed: "{jb["term"]}" used by {jb["found_in_speech_of"]} but expected from {jb["expected_speaker"]}',
                "suggestion": f'Ensure "{jb["term"]}" is consistent with {jb["found_in_speech_of"]}\'s established voice pattern.',
                "chapter": f'Chapter {jb["chapter"]}',
                "status": "PENDING",
            })

    if "pacing_architect" in all_results:
        pa = all_results["pacing_architect"]
        for sz in pa.get("slow_zones", []):
            edit_queue.append({
                "id": len(edit_queue) + 1,
                "module": "pacing_architect",
                "severity": sz["severity"],
                "category": "Pacing",
                "finding": f'Slow zone detected in Chapter {sz["chapter"]}: {sz["reason"]}',
                "suggestion": sz["suggestion"],
                "chapter": f'Chapter {sz["chapter"]}',
                "status": "PENDING",
            })

    # Sort by severity
    severity_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    edit_queue.sort(key=lambda x: severity_order.get(x["severity"], 3))

    # Re-number after sort
    for i, item in enumerate(edit_queue):
        item["id"] = i + 1

    # Compute overall scores from all modules
    module_scores = {}
    for mod_name, mod_data in all_results.items():
        if "scores" in mod_data:
            module_scores[mod_name] = mod_data["scores"].get("overall", 75)

    overall_score = round(sum(module_scores.values()) / max(len(module_scores), 1))

    return {
        "module": "revision_command",
        "title": title,
        "summary": {
            "total_items": len(edit_queue),
            "high_priority": sum(1 for e in edit_queue if e["severity"] == "HIGH"),
            "medium_priority": sum(1 for e in edit_queue if e["severity"] == "MEDIUM"),
            "low_priority": sum(1 for e in edit_queue if e["severity"] == "LOW"),
            "overall_manuscript_score": overall_score,
        },
        "module_scores": module_scores,
        "edit_queue": edit_queue,
        "health_dashboard": {
            "structural_integrity": module_scores.get("manuscript_intelligence", 75),
            "voice_distinctiveness": module_scores.get("voice_isolation", 72),
            "pacing_quality": module_scores.get("pacing_architect", 70),
            "prose_craft": module_scores.get("prose_refinery", 68),
            "character_depth": module_scores.get("character_arc", 74),
            "overall": overall_score,
        },
    }


def generate_acquisition_score(all_results: dict) -> dict:
    """Enterprise: Acquisition Score (composite 0-100)"""
    structural = all_results.get("manuscript_intelligence", {}).get("scores", {}).get("overall", 75)
    voice = all_results.get("voice_isolation", {}).get("scores", {}).get("overall", 72)
    pacing = all_results.get("pacing_architect", {}).get("scores", {}).get("overall", 70)
    prose = all_results.get("prose_refinery", {}).get("scores", {}).get("overall", 68)
    originality = random.randint(60, 90)

    composite = round(
        structural * 0.25 +
        voice * 0.20 +
        pacing * 0.20 +
        prose * 0.20 +
        originality * 0.15
    )

    return {
        "acquisition_score": composite,
        "breakdown": {
            "structural_integrity": {"score": structural, "weight": 0.25, "weighted": round(structural * 0.25, 1)},
            "voice_distinctiveness": {"score": voice, "weight": 0.20, "weighted": round(voice * 0.20, 1)},
            "pacing_quality": {"score": pacing, "weight": 0.20, "weighted": round(pacing * 0.20, 1)},
            "prose_craft": {"score": prose, "weight": 0.20, "weighted": round(prose * 0.20, 1)},
            "narrative_originality": {"score": originality, "weight": 0.15, "weighted": round(originality * 0.15, 1)},
        },
        "recommendation": "CONSIDER" if composite >= 65 else "PASS",
        "recommendation_detail": _get_acquisition_recommendation(composite),
    }


# --- Helper functions ---

def _extract_character_names(text: str) -> list:
    """Simple heuristic: extract capitalized name pairs from text."""
    if not text or len(text) < 100:
        return []
    name_pattern = re.compile(r'\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b')
    matches = name_pattern.findall(text[:50000])  # Limit search
    # Count and sort by frequency
    name_counts = {}
    stop_names = {"The", "This", "That", "These", "Those", "When", "Where", "What", "Which", "There", "Their", "About", "After", "Before", "Between", "Under", "Over", "Into"}
    for name in matches:
        first_word = name.split()[0]
        if first_word not in stop_names and len(name) > 3:
            name_counts[name] = name_counts.get(name, 0) + 1
    sorted_names = sorted(name_counts.items(), key=lambda x: x[1], reverse=True)
    return [name for name, count in sorted_names[:10] if count >= 2]


def _get_signature_phrases(idx: int) -> list:
    phrases_pool = [
        ["I suppose", "In any case", "The thing is"],
        ["Listen to me", "You see", "Mark my words"],
        ["If I may", "With all due respect", "Precisely"],
        ["Look", "Here's the deal", "Bottom line"],
        ["Well then", "As it happens", "I wonder"],
    ]
    return phrases_pool[idx % len(phrases_pool)]


def _get_character_want(idx: int) -> str:
    wants = [
        "To uncover the truth about her family's past",
        "To prove himself worthy of trust and leadership",
        "To find a cure before time runs out",
        "To protect his family from forces beyond his control",
        "To escape the life that was chosen for her",
    ]
    return wants[idx % len(wants)]


def _get_character_fear(idx: int) -> str:
    fears = [
        "Discovering she is no different from those she opposes",
        "Being exposed as a fraud",
        "Failing the people who depend on her",
        "Losing control and becoming what he hunts",
        "Being trapped forever in someone else's narrative",
    ]
    return fears[idx % len(fears)]


def _get_character_belief(idx: int) -> str:
    beliefs = [
        "The past holds the key to understanding the present",
        "Strength means never showing weakness",
        "Science can solve any problem given enough time",
        "Family loyalty must come before personal desire",
        "Freedom is worth any sacrifice",
    ]
    return beliefs[idx % len(beliefs)]


def _get_behavior_start(idx: int) -> str:
    behaviors = [
        "Secretive, distrustful, obsessively research-oriented",
        "Brash, confrontational, dismissive of others' input",
        "Methodical, emotionally detached, workaholic",
        "Protective to the point of controlling, conflict-avoidant",
        "Rebellious, impulsive, emotionally guarded",
    ]
    return behaviors[idx % len(behaviors)]


def _get_behavior_end(idx: int) -> str:
    behaviors = [
        "Open, collaborative, willing to trust selectively",
        "Thoughtful, inclusive, leads through earned respect",
        "Balanced, emotionally present, values connection over data",
        "Trusting, empowering, faces conflict directly",
        "Purposeful, patient, emotionally vulnerable by choice",
    ]
    return behaviors[idx % len(behaviors)]


def _get_acquisition_recommendation(score: int) -> str:
    if score >= 85:
        return "Strong acquisition candidate. Manuscript demonstrates exceptional quality across all dimensions. Recommend fast-tracking to senior editor review."
    elif score >= 75:
        return "Promising submission. Solid fundamentals with room for improvement. Recommend developmental editing pass before final decision."
    elif score >= 65:
        return "Shows potential but needs significant revision. Consider requesting R&R (revise and resubmit) with specific editorial guidance."
    elif score >= 50:
        return "Below acquisition threshold. Fundamental issues in multiple areas. Personalized rejection with constructive feedback recommended."
    else:
        return "Does not meet minimum quality standards. Standard rejection appropriate."
