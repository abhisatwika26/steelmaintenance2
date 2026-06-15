from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from backend.db.database import get_db
from backend.db.models import EquipmentMaster
from backend.prediction.anomaly_service import AnomalyService
from backend.prediction.risk_scoring import calculate_risk_priority
from backend.app import config

router = APIRouter()
anomaly_service = AnomalyService()

@router.get("/health-index")
def get_all_health_indices(db: Session = Depends(get_db)):
    """
    Computes current anomaly score, health index, and RUL for all assets
    based on the latest sensor telemetry.
    """
    equipment_list = db.query(EquipmentMaster).all()
    sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
    if not sensor_file.exists():
        raise HTTPException(status_code=404, detail="Telemetry logs not found")
        
    try:
        df = pd.read_csv(sensor_file)
        results = []
        
        for eq in equipment_list:
            # Get latest sensor reading for this asset
            eq_df = df[df["equipment_id"] == eq.equipment_id]
            if eq_df.empty:
                results.append({
                    "equipment_id": eq.equipment_id,
                    "equipment_name": eq.equipment_name,
                    "anomaly_score": 0.0,
                    "health_index": 1.0,
                    "predicted_rul": "Normal (30+ days)",
                    "last_reading_time": ""
                })
                continue
                
            latest_row = eq_df.iloc[-1].to_dict()
            anomaly_score, health_index = anomaly_service.calculate_metrics(latest_row)
            rul = anomaly_service.predict_rul(eq.equipment_id, health_index)
            
            results.append({
                "equipment_id": eq.equipment_id,
                "equipment_name": eq.equipment_name,
                "anomaly_score": round(anomaly_score, 3),
                "health_index": round(health_index, 3),
                "predicted_rul": rul,
                "last_reading_time": latest_row.get("timestamp", "")
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error computing health indices: {e}")

@router.get("/risk-heatmap")
def get_risk_heatmap_data(db: Session = Depends(get_db)):
    """
    Returns risk scoring details across all equipment to construct
    the operations heatmap.
    """
    equipment_list = db.query(EquipmentMaster).all()
    sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
    if not sensor_file.exists():
        raise HTTPException(status_code=404, detail="Telemetry logs not found")
        
    try:
        df = pd.read_csv(sensor_file)
        results = []
        
        for eq in equipment_list:
            eq_df = df[df["equipment_id"] == eq.equipment_id]
            anomaly_score = 0.0
            if not eq_df.empty:
                latest_row = eq_df.iloc[-1].to_dict()
                anomaly_score, _ = anomaly_service.calculate_metrics(latest_row)
                
            risk_score, risk_level, breakdown = calculate_risk_priority(db, eq.equipment_id, anomaly_score)
            results.append({
                "equipment_id": eq.equipment_id,
                "equipment_name": eq.equipment_name,
                "plant_area": eq.plant_area,
                "criticality": eq.criticality,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "breakdown": breakdown
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating risk heatmap: {e}")
