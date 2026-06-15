from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid
from backend.db.database import get_db
from backend.db.models import EngineerFeedback

router = APIRouter()

class FeedbackCreateSchema(BaseModel):
    recommendation_id: str
    equipment_id: str
    submitted_by: str
    rating: str          # accepted, partially_accepted, corrected
    actual_outcome: str  # issue_resolved, monitoring_required, repeat_inspection_needed
    correction_notes: str = ""

@router.post("")
def submit_feedback(data: FeedbackCreateSchema, db: Session = Depends(get_db)):
    """Logs engineer review feedback on recommendations to the database."""
    try:
        feedback_id = f"FB-{uuid.uuid4().hex[:6].upper()}"
        fb = EngineerFeedback(
            feedback_id=feedback_id,
            recommendation_id=data.recommendation_id,
            equipment_id=data.equipment_id,
            submitted_by=data.submitted_by,
            rating=data.rating,
            actual_outcome=data.actual_outcome,
            correction_notes=data.correction_notes
        )
        db.add(fb)
        db.commit()
        return {
            "status": "success",
            "feedback_id": feedback_id,
            "message": "Feedback logged successfully"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database logging failed: {e}")

@router.get("")
def list_feedback(db: Session = Depends(get_db)):
    """Retrieves all feedback records."""
    logs = db.query(EngineerFeedback).all()
    return logs
