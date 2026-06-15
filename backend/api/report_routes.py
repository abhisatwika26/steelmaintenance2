from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pandas as pd
import uuid
from datetime import datetime
from backend.db.database import get_db
from backend.db.models import AnomalyAlert, MaintenanceLog
from backend.agents.maintenance_orchestrator import MaintenanceOrchestrator
from backend.app import config

router = APIRouter()

class LogbookEntryCreateSchema(BaseModel):
    equipment_id: str
    failure_mode: str
    symptoms: str
    root_cause: str
    action_taken: str
    parts_replaced: list[str]
    downtime_minutes: int
    technician_notes: str = ""

@router.get("/preview/{alert_id}")
def preview_failure_report(alert_id: int, db: Session = Depends(get_db)):
    """
    Invokes Gemini to draft a formal failure report based on the alert's
    RCA diagnosis and action checklist.
    """
    alert = db.query(AnomalyAlert).filter(AnomalyAlert.alert_id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        
    try:
        # Load the sensor readings around this alert
        sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
        telemetry = None
        if sensor_file.exists():
            df = pd.read_csv(sensor_file)
            match = df[(df["equipment_id"] == alert.equipment_id) & (df["timestamp"] == alert.timestamp)]
            if not match.empty:
                telemetry = match.iloc[0].to_dict()
                
        orchestrator = MaintenanceOrchestrator(db)
        
        # Run diagnostic flow to get diagnosis and recommendation details
        rca_report = orchestrator.run_diagnostic_flow(alert.equipment_id, telemetry)
        
        # Draft the report log
        draft = orchestrator.generate_failure_report_draft(
            equipment_id=alert.equipment_id,
            telemetry=rca_report["telemetry"],
            diagnosis=rca_report["diagnosis"],
            recommendation=rca_report["recommendations"]
        )
        return draft
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report preview: {e}")

@router.post("/logbook")
def add_logbook_entry(data: LogbookEntryCreateSchema, db: Session = Depends(get_db)):
    """
    Commits an approved failure report draft into the SQLite maintenance logs
    as a digital logbook entry.
    """
    try:
        log_id = f"ML-ADD-{uuid.uuid4().hex[:4].upper()}"
        ml = MaintenanceLog(
            log_id=log_id,
            equipment_id=data.equipment_id,
            maintenance_date=datetime.now().date().isoformat(),
            maintenance_type="Corrective",
            symptom=data.symptoms,
            action_taken=data.action_taken,
            parts_replaced="; ".join(data.parts_replaced),
            downtime_minutes=data.downtime_minutes,
            technician_notes=f"Root Cause: {data.root_cause}. Note: {data.technician_notes}",
            linked_failure_report_id=f"FR-ADD-{uuid.uuid4().hex[:3].upper()}"
        )
        db.add(ml)
        db.commit()
        return {
            "status": "success",
            "log_id": log_id,
            "message": "Digital logbook entry recorded successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database logging failed: {e}")
