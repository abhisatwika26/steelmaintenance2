from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import Optional
import pandas as pd
from backend.db.database import get_db
from backend.db.models import AnomalyAlert, EquipmentMaster
from backend.prediction.anomaly_service import AnomalyService
from backend.prediction.risk_scoring import calculate_risk_priority
from backend.agents.maintenance_orchestrator import MaintenanceOrchestrator
from backend.app import config

router = APIRouter()
anomaly_service = AnomalyService()

def auto_scan_and_populate_alerts(db: Session):
    """
    Scans the sensor readings log file for anomaly events and populates
    the SQLite alerts table if it is currently empty.
    """
    alerts_count = db.query(AnomalyAlert).count()
    if alerts_count > 0:
        return
        
    sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
    if not sensor_file.exists():
        return
        
    print("Alerts: Alerts table is empty. Running sensor log scanner to populate anomalies...")
    try:
        df = pd.read_csv(sensor_file)
        # Group sensor anomalies by equipment_id and failure_code to isolate discrete events
        anomalies = df[df["anomaly_label"] == 1]
        
        # We find chunks where failure_code is active
        # Let's find distinct events. We look at consecutive rows with the same failure_code
        events = []
        for eq_id in df["equipment_id"].unique():
            eq_df = df[df["equipment_id"] == eq_id].copy()
            # Anomaly events start when anomaly_label transitions from 0 to 1
            eq_df["transition"] = eq_df["anomaly_label"].diff()
            event_starts = eq_df[eq_df["transition"] == 1]
            
            for _, start_row in event_starts.iterrows():
                # Get the window of this event (until label drops back to 0)
                event_time = start_row["timestamp"]
                failure_code = start_row["failure_code"]
                
                # Fetch row metrics
                row_dict = start_row.to_dict()
                anomaly_score, health_index = anomaly_service.calculate_metrics(row_dict)
                rul = anomaly_service.predict_rul(eq_id, health_index)
                risk_score, risk_level, breakdown = calculate_risk_priority(db, eq_id, anomaly_score)
                
                # Get fault description from failure code
                symptoms = f"Anomalous sensor readings (Temp, Vib, or Press) indicating potential {failure_code} issues."
                
                alert = AnomalyAlert(
                    equipment_id=eq_id,
                    timestamp=event_time,
                    anomaly_score=round(anomaly_score, 3),
                    health_index=round(health_index, 3),
                    predicted_rul=rul,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    symptoms=symptoms,
                    is_acknowledged=False
                )
                db.add(alert)
                
        db.commit()
        print(f"Alerts: Auto-populated {db.query(AnomalyAlert).count()} anomaly alerts in the DB.")
    except Exception as e:
        db.rollback()
        print(f"Alerts: Error auto-populating alerts ({e})")

@router.get("")
def list_alerts(db: Session = Depends(get_db)):
    """Lists all alerts in the plant queue, sorted by risk level priority."""
    # Ensure database contains alerts
    auto_scan_and_populate_alerts(db)
    
    # Sort order: Critical first, then High, Medium, Low
    alerts = db.query(AnomalyAlert).all()
    
    # Custom sort sorting Critical -> High -> Medium -> Low
    level_weights = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
    sorted_alerts = sorted(
        alerts,
        key=lambda x: (x.is_acknowledged, -level_weights.get(x.risk_level, 0), x.timestamp),
        reverse=False
    )
    
    results = []
    for alert in sorted_alerts:
        eq = db.query(EquipmentMaster).filter(EquipmentMaster.equipment_id == alert.equipment_id).first()
        results.append({
            "alert_id": alert.alert_id,
            "equipment_id": alert.equipment_id,
            "equipment_name": eq.equipment_name if eq else "Unknown",
            "plant_area": eq.plant_area if eq else "Unknown",
            "timestamp": alert.timestamp,
            "anomaly_score": alert.anomaly_score,
            "health_index": alert.health_index,
            "predicted_rul": alert.predicted_rul,
            "risk_score": alert.risk_score,
            "risk_level": alert.risk_level,
            "symptoms": alert.symptoms,
            "is_acknowledged": alert.is_acknowledged
        })
    return results

@router.get("/{alert_id}/rca")
def get_alert_rca(alert_id: int, db: Session = Depends(get_db), x_gemini_key: Optional[str] = Header(None)):
    """
    Triggers the Gemini reasoning chain to execute a full Root Cause Analysis (RCA)
    and action recommendations checklist for a specific active alert.
    """
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
    try:
        # Load the sensor readings around this alert's timestamp to get precise telemetry
        sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
        telemetry = None
        if sensor_file.exists():
            df = pd.read_csv(sensor_file)
            # Find the exact reading matching equipment and timestamp
            match = df[(df["equipment_id"] == alert.equipment_id) & (df["timestamp"] == alert.timestamp)]
            if not match.empty:
                telemetry = match.iloc[0].to_dict()
                
        orchestrator = MaintenanceOrchestrator(db, api_key=x_gemini_key)
        rca_report = orchestrator.run_diagnostic_flow(alert.equipment_id, telemetry)
        
        return rca_report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing RCA workflow: {e}")

@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Acknowledges an alert, marking it as checked."""
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
    try:
        alert.is_acknowledged = True
        db.commit()
        return {"status": "success", "message": f"Alert {alert_id} acknowledged"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update alert: {e}")
