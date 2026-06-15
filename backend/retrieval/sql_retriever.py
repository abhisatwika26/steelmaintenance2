from sqlalchemy.orm import Session
from sqlalchemy import desc
from backend.db.models import EquipmentMaster, MaintenanceLog, DelayLog, SparePart

class SQLRetriever:
    def __init__(self, db: Session):
        self.db = db

    def get_equipment_history(self, equipment_id: str) -> dict:
        """
        Retrieves all historical maintenance and delay logs for an asset,
        summarizing them into a structured report.
        """
        equipment = self.db.query(EquipmentMaster).filter(EquipmentMaster.equipment_id == equipment_id).first()
        if not equipment:
            return {"error": f"Equipment {equipment_id} not found"}

        # Fetch logs ordered by date
        maintenance_logs = self.db.query(MaintenanceLog)\
            .filter(MaintenanceLog.equipment_id == equipment_id)\
            .order_by(desc(MaintenanceLog.maintenance_date)).all()
            
        delay_logs = self.db.query(DelayLog)\
            .filter(DelayLog.equipment_id == equipment_id)\
            .order_by(desc(DelayLog.delay_start)).all()

        m_list = []
        for log in maintenance_logs:
            m_list.append({
                "date": log.maintenance_date,
                "type": log.maintenance_type,
                "symptom": log.symptom,
                "action": log.action_taken,
                "parts_replaced": log.parts_replaced,
                "downtime": f"{log.downtime_minutes} mins",
                "notes": log.technician_notes,
                "report_id": log.linked_failure_report_id
            })

        d_list = []
        for log in delay_logs:
            d_list.append({
                "start": log.delay_start,
                "category": log.delay_category,
                "impact": log.production_impact,
                "minutes": log.delay_minutes,
                "remarks": log.remarks
            })

        # Calculate summaries
        total_downtime_mins = sum(log.downtime_minutes for log in maintenance_logs)
        corrective_count = sum(1 for log in maintenance_logs if log.maintenance_type.lower() == "corrective")
        preventive_count = sum(1 for log in maintenance_logs if log.maintenance_type.lower() == "preventive")
        
        return {
            "equipment_id": equipment_id,
            "name": equipment.equipment_name,
            "area": equipment.plant_area,
            "type": equipment.equipment_type,
            "criticality": equipment.criticality,
            "total_maintenance_downtime_minutes": total_downtime_mins,
            "corrective_failures_count": corrective_count,
            "preventive_actions_count": preventive_count,
            "maintenance_logs": m_list[:10],  # Return latest 10 logs
            "delay_logs": d_list[:10]         # Return latest 10 delay logs
        }

    def get_spares_status(self, equipment_id: str) -> list[dict]:
        """
        Retrieves compatible spare parts and their stock levels for a given asset.
        """
        equipment = self.db.query(EquipmentMaster).filter(EquipmentMaster.equipment_id == equipment_id).first()
        if not equipment:
            return []

        spares = self.db.query(SparePart).all()
        compatible_spares = []
        
        for sp in spares:
            compat_types = [t.strip().lower() for t in sp.compatible_equipment_types.split(";")]
            if equipment.equipment_type.lower() in compat_types or sp.compatible_equipment_types.lower() == "all":
                status = "In Stock"
                if sp.stock_quantity == 0:
                    status = "Out of Stock (CRITICAL)"
                elif sp.stock_quantity < sp.minimum_required_stock:
                    status = "Low Stock (WARNING)"
                    
                compatible_spares.append({
                    "part_id": sp.part_id,
                    "part_name": sp.part_name,
                    "stock": sp.stock_quantity,
                    "min_stock_required": sp.minimum_required_stock,
                    "status": status,
                    "lead_days": sp.procurement_lead_days,
                    "supplier": sp.supplier,
                    "unit_cost_inr": sp.unit_cost_inr
                })
                
        return compatible_spares
