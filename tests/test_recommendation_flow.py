import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.db.database import SessionLocal
from backend.agents.maintenance_orchestrator import MaintenanceOrchestrator

def test_maintenance_orchestrator():
    db = SessionLocal()
    try:
        orchestrator = MaintenanceOrchestrator(db)
        
        # Run diagnostic flow for EQ-001 (Caster Pump)
        result = orchestrator.run_diagnostic_flow("EQ-001")
        
        assert "equipment_id" in result
        assert "telemetry" in result
        assert "diagnosis" in result
        assert "recommendations" in result
        
        # Verify schema elements parsed (even in mock/offline fallback mode)
        assert "probable_fault" in result["diagnosis"]
        assert "immediate_actions" in result["recommendations"]
        assert "spare_procurement_strategy" in result["recommendations"]
        
        # Test report drafting
        report = orchestrator.generate_failure_report_draft(
            "EQ-001",
            result["telemetry"],
            result["diagnosis"],
            result["recommendations"]
        )
        assert "report_title" in report
        assert "failure_mode" in report
        assert "root_cause" in report
        
    finally:
        db.close()
