import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.db.database import SessionLocal
from backend.retrieval.hybrid_retriever import HybridRetriever

def test_hybrid_retrieval_flow():
    db = SessionLocal()
    try:
        retriever = HybridRetriever(db)
        
        # Query EQ-001 with failure mode FM-002 (Hydraulic Leakage)
        evidence = retriever.retrieve_evidence("EQ-001", query="FM-002", failure_code="FM-002")
        
        # Asserts
        assert "equipment_history" in evidence
        assert "spares_inventory" in evidence
        assert "graph_relations" in evidence
        assert "documentation_chunks" in evidence
        
        # Verify graph mappings resolved
        assert evidence["graph_relations"]["sop_slug"] == "SOP_hydraulic_pump_overheating"
        
        # Verify formatting works
        prompt_text = retriever.format_evidence_for_prompt(evidence)
        assert "=== RETRIEVED MAINTENANCE CONTEXT & EVIDENCE ===" in prompt_text
        assert "EQ-001" in prompt_text
        
    finally:
        db.close()
