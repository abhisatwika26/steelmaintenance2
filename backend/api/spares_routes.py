from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import SparePart

router = APIRouter()

@router.get("")
def list_spares(db: Session = Depends(get_db)):
    """Lists all spare parts in the warehouse inventory."""
    spares = db.query(SparePart).all()
    results = []
    
    for sp in spares:
        status = "In Stock"
        if sp.stock_quantity == 0:
            status = "Out of Stock"
        elif sp.stock_quantity < sp.minimum_required_stock:
            status = "Low Stock"
            
        results.append({
            "part_id": sp.part_id,
            "part_name": sp.part_name,
            "compatible_equipment_types": sp.compatible_equipment_types,
            "stock_quantity": sp.stock_quantity,
            "minimum_required_stock": sp.minimum_required_stock,
            "procurement_lead_days": sp.procurement_lead_days,
            "supplier": sp.supplier,
            "criticality": sp.criticality,
            "unit_cost_inr": sp.unit_cost_inr,
            "status": status
        })
        
    return results
