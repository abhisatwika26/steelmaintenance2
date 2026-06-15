from sqlalchemy.orm import Session
from backend.db.models import EquipmentMaster, DelayLog, SparePart

def calculate_risk_priority(db: Session, equipment_id: str, anomaly_score: float) -> tuple[float, str, dict]:
    """
    Computes a risk score (0.0 to 3.0) and translates it to a risk level:
    RiskScore = (AnomalyScore * CriticalityWeight) + DelayImpactScore + SpareShortagePenalty
    
    Returns:
        risk_score (float)
        risk_level (str)
        breakdown (dict): Breakdown of the computed score factors for explainability
    """
    # 1. Criticality Weight
    equipment = db.query(EquipmentMaster).filter(EquipmentMaster.equipment_id == equipment_id).first()
    if not equipment:
        return 0.0, "Low", {}
        
    crit_map = {
        "Critical": 1.0,
        "High": 0.8,
        "Medium": 0.5,
        "Low": 0.2
    }
    crit_weight = crit_map.get(equipment.criticality, 0.5)
    crit_score = anomaly_score * crit_weight

    # 2. Delay Impact Score
    # Fetch historical delays for this equipment to determine average downtime impact
    delays = db.query(DelayLog).filter(DelayLog.equipment_id == equipment_id).all()
    if delays:
        avg_delay = sum(d.delay_minutes for d in delays) / len(delays)
    else:
        avg_delay = 0.0
        
    # Scale delay score: 240 mins (4 hours) is mapped to 1.0 (max penalty)
    delay_impact_score = min(1.0, avg_delay / 240.0)

    # 3. Spare Parts Shortage Penalty
    # Query spare parts compatible with this equipment type
    spares = db.query(SparePart).all()
    compatible_spares = []
    for sp in spares:
        # Check if the part's compatible_equipment_types string contains the equipment's type
        # compatible_equipment_types can be a semicolon-separated list like "Hydraulic Pump; Blower"
        compat_types = [t.strip().lower() for t in sp.compatible_equipment_types.split(";")]
        if equipment.equipment_type.lower() in compat_types or sp.compatible_equipment_types.lower() == "all":
            compatible_spares.append(sp)

    spare_penalty = 0.0
    critical_shortage = False
    warning_shortage = False
    shortage_details = []

    for sp in compatible_spares:
        if sp.stock_quantity == 0:
            critical_shortage = True
            shortage_details.append(f"{sp.part_id} (Out of Stock)")
        elif sp.stock_quantity < sp.minimum_required_stock:
            warning_shortage = True
            shortage_details.append(f"{sp.part_id} (Below Min Stock)")

    # Apply penalty: 1.0 for out of stock, 0.5 if below minimum required stock
    if critical_shortage:
        spare_penalty = 1.0
    elif warning_shortage:
        spare_penalty = 0.5

    # Total Risk Score (cap at 3.0)
    total_score = min(3.0, crit_score + delay_impact_score + spare_penalty)

    # Determine Risk Level
    if total_score >= 2.0:
        risk_level = "Critical"
    elif total_score >= 1.2:
        risk_level = "High"
    elif total_score >= 0.5:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    breakdown = {
        "equipment_id": equipment_id,
        "equipment_name": equipment.equipment_name,
        "criticality": equipment.criticality,
        "criticality_score": round(crit_score, 2),
        "historical_avg_delay_mins": round(avg_delay, 1),
        "delay_impact_score": round(delay_impact_score, 2),
        "spare_penalty": round(spare_penalty, 2),
        "shortage_reasons": shortage_details,
        "raw_score": round(total_score, 2)
    }

    return round(total_score, 2), risk_level, breakdown
