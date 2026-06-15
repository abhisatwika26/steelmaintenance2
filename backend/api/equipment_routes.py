from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from backend.db.database import get_db
from backend.db.models import EquipmentMaster
from backend.app import config

router = APIRouter()

@router.get("")
def list_equipment(db: Session = Depends(get_db)):
    """Lists all equipment master records in the plant."""
    equipment_list = db.query(EquipmentMaster).all()
    return equipment_list

@router.get("/{equipment_id}")
def get_equipment(equipment_id: str, db: Session = Depends(get_db)):
    """Fetches details for a specific equipment asset."""
    eq = db.query(EquipmentMaster).filter(EquipmentMaster.equipment_id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail=f"Equipment {equipment_id} not found")
    return eq

@router.get("/{equipment_id}/sensors")
def get_sensor_history(equipment_id: str, limit: int = 96):
    """
    Fetches the latest telemetry readings for an asset from the sensor log.
    Default limit is 96 readings (last 24 hours of 15-minute readings).
    """
    sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
    if not sensor_file.exists():
        raise HTTPException(status_code=404, detail="Telemetry log file not found")
        
    try:
        df = pd.read_csv(sensor_file)
        df_eq = df[df["equipment_id"] == equipment_id].tail(limit)
        
        if df_eq.empty:
            return []
            
        # Convert NaN values to empty string or None for JSON compatibility
        df_eq = df_eq.fillna("")
        return df_eq.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading telemetry logs: {e}")
