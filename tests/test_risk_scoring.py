import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.db.database import SessionLocal
from backend.prediction.risk_scoring import calculate_risk_priority

def test_risk_scoring_priority():
    db = SessionLocal()
    try:
        # EQ-001 is a critical asset (Caster Hydraulic Pump)
        eq_id = "EQ-001"
        
        # Test low anomaly score
        score_low, level_low, breakdown_low = calculate_risk_priority(db, eq_id, 0.0)
        assert 0.0 <= score_low <= 3.0
        assert level_low in ["Low", "Medium", "High", "Critical"]
        
        # Test critical anomaly score
        score_high, level_high, breakdown_high = calculate_risk_priority(db, eq_id, 1.0)
        assert score_high >= score_low
        assert level_high in ["Medium", "High", "Critical"]
        
        # Verify explainability keys exist in breakdown
        for key in ["criticality", "historical_avg_delay_mins", "spare_penalty", "raw_score"]:
            assert key in breakdown_high
            
    finally:
        db.close()
