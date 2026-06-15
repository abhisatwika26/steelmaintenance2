import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.db.database import SessionLocal
from backend.retrieval.sql_retriever import SQLRetriever
from backend.retrieval.hybrid_retriever import HybridRetriever
from backend.retrieval.graph_retriever import GraphRetriever


def test_feedback_history_method_exists_and_returns_list():
    """Fix 1 — get_feedback_history() must exist, accept equipment_id, return a list."""
    db = SessionLocal()
    try:
        sql = SQLRetriever(db)
        result = sql.get_feedback_history("EQ-001")
        assert isinstance(result, list), "get_feedback_history must return a list"
    finally:
        db.close()


def test_feedback_history_entry_schema():
    """Fix 1 — each feedback entry must have the required keys."""
    db = SessionLocal()
    try:
        sql = SQLRetriever(db)
        result = sql.get_feedback_history("EQ-001")
        if result:  # Only validate schema if entries exist
            entry = result[0]
            for key in ["feedback_id", "submitted_by", "rating", "actual_outcome", "correction_notes"]:
                assert key in entry, f"Missing key '{key}' in feedback entry"
    finally:
        db.close()


def test_feedback_history_max_five_entries():
    """Fix 1 — result must be capped at 5 entries (limit clause)."""
    db = SessionLocal()
    try:
        sql = SQLRetriever(db)
        result = sql.get_feedback_history("EQ-001")
        assert len(result) <= 5, "get_feedback_history must return at most 5 entries"
    finally:
        db.close()


def test_evidence_pack_contains_feedback_key():
    """Fix 1b — HybridRetriever evidence pack must include 'feedback_history' key."""
    db = SessionLocal()
    try:
        retriever = HybridRetriever(db)
        evidence = retriever.retrieve_evidence("EQ-001", query="bearing wear", failure_code="FM-001")
        assert "feedback_history" in evidence, \
            "'feedback_history' key missing from evidence pack — hybrid_retriever.py not updated"
    finally:
        db.close()


def test_formatted_prompt_includes_feedback_section():
    """Fix 1c — format_evidence_for_prompt must include feedback section when entries exist."""
    db = SessionLocal()
    try:
        retriever = HybridRetriever(db)
        evidence = retriever.retrieve_evidence("EQ-001", query="bearing", failure_code="FM-001")

        # Inject a fake feedback entry to force the section to render
        evidence["feedback_history"] = [{
            "feedback_id": "FB-TEST",
            "submitted_by": "test_engineer",
            "rating": "corrected",
            "actual_outcome": "repair_successful",
            "correction_notes": "Root cause was seal failure, not bearing."
        }]

        prompt = retriever.format_evidence_for_prompt(evidence)
        assert "Past Engineer Feedback" in prompt, \
            "Feedback section missing from prompt — format_evidence_for_prompt not updated"
        assert "FB-TEST" in prompt
        assert "Root cause was seal failure" in prompt
    finally:
        db.close()


def test_graph_retriever_loads_from_json():
    """Fix 3 — GraphRetriever must load failure modes from JSON file, not hardcoded dict."""
    g = GraphRetriever()
    assert len(g.graph) > 0, "Graph is empty — failure_modes.json not found or empty"
    assert "FM-001" in g.graph, "FM-001 missing from loaded graph"
    assert "FM-006" in g.graph, "FM-006 missing from loaded graph"
    assert g.graph["FM-001"]["name"] == "Bearing Wear"
    assert g.graph["FM-002"]["name"] == "Hydraulic Leakage"


def test_graph_retriever_get_relations_returns_dict():
    """Fix 3 — get_failure_mode_relations must return a dict for known codes."""
    g = GraphRetriever()
    rel = g.get_failure_mode_relations("FM-001")
    assert isinstance(rel, dict)
    assert "sop_slug" in rel
    assert rel["sop_slug"] == "SOP_bearing_replacement"


def test_graph_retriever_returns_empty_for_unknown_code():
    """Fix 3 — get_failure_mode_relations must return {} for unknown codes gracefully."""
    g = GraphRetriever()
    rel = g.get_failure_mode_relations("FM-999")
    assert rel == {}, "Should return empty dict for unknown failure code"


def test_hybrid_retrieval_still_works_after_changes():
    """Regression — the existing retrieval flow must still work with the new feedback key added."""
    db = SessionLocal()
    try:
        retriever = HybridRetriever(db)
        evidence = retriever.retrieve_evidence("EQ-001", query="FM-002", failure_code="FM-002")

        # Original keys must still be present
        assert "equipment_history" in evidence
        assert "spares_inventory" in evidence
        assert "graph_relations" in evidence
        assert "documentation_chunks" in evidence

        # New key must also be present
        assert "feedback_history" in evidence

        # Graph mapping must still resolve correctly
        assert evidence["graph_relations"]["sop_slug"] == "SOP_hydraulic_pump_overheating"

        # Prompt formatting must still work
        prompt_text = retriever.format_evidence_for_prompt(evidence)
        assert "=== RETRIEVED MAINTENANCE CONTEXT & EVIDENCE ===" in prompt_text
        assert "EQ-001" in prompt_text

    finally:
        db.close()
