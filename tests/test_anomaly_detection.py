import sys
from pathlib import Path
import pytest

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.prediction.anomaly_service import AnomalyService

def test_anomaly_service_metrics():
    service = AnomalyService()
    
    # Mock a normal sensor reading (similar to EQ-001 normal baseline: temp 68, vibration 3.2, pressure 145)
    normal_reading = {
        "temperature_c": 68.0,
        "vibration_mm_s": 3.2,
        "pressure_bar": 145.0,
        "rpm": 1480.0,
        "current_amp": 42.0,
        "coolant_flow_lpm": 78.0,
        "operating_load_pct": 72.0
    }
    
    anomaly_score, health_index = service.calculate_metrics(normal_reading)
    
    # Assertions
    assert 0.0 <= anomaly_score <= 1.0
    assert 0.0 <= health_index <= 1.0
    assert health_index > 0.50  # Should be relatively healthy
    assert anomaly_score < 0.50  # Should not flag critical anomaly

def test_anomaly_service_rul_default():
    service = AnomalyService()
    rul = service.predict_rul("EQ-001", 0.95)
    
    # Default RUL on healthy status should be Normal
    assert "30+" in rul or "Normal" in rul
