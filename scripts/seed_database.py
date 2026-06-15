import csv
import os
import sys
from pathlib import Path

# Add project root to path so we can import from backend
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.db.database import engine, SessionLocal, Base
from backend.db.models import (
    EquipmentMaster,
    MaintenanceLog,
    DelayLog,
    SparePart,
    EngineerFeedback,
)

BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"

def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))

def seed_db() -> None:
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Seed Equipment Master
        equipment_file = RAW_DIR / "equipment" / "equipment_master.csv"
        if equipment_file.exists():
            print("Seeding Equipment Master...")
            # Clear existing data to prevent primary key duplicates if running multiple times
            db.query(EquipmentMaster).delete()
            for row in read_csv(equipment_file):
                eq = EquipmentMaster(
                    equipment_id=row["equipment_id"],
                    equipment_name=row["equipment_name"],
                    plant_area=row["plant_area"],
                    equipment_type=row["equipment_type"],
                    criticality=row["criticality"],
                    normal_temperature_c=float(row["normal_temperature_c"]),
                    normal_vibration_mm_s=float(row["normal_vibration_mm_s"]),
                    normal_pressure_bar=float(row["normal_pressure_bar"]),
                    normal_rpm=float(row["normal_rpm"]),
                    normal_current_amp=float(row["normal_current_amp"]),
                    normal_coolant_flow_lpm=float(row["normal_coolant_flow_lpm"]),
                )
                db.add(eq)
            db.commit()
            print("Equipment Master seeded successfully.")
        
        # 2. Seed Spare Parts Inventory
        spares_file = RAW_DIR / "spare_parts" / "spare_parts_inventory.csv"
        if spares_file.exists():
            print("Seeding Spare Parts Inventory...")
            db.query(SparePart).delete()
            for row in read_csv(spares_file):
                sp = SparePart(
                    part_id=row["part_id"],
                    part_name=row["part_name"],
                    compatible_equipment_types=row["compatible_equipment_types"],
                    stock_quantity=int(row["stock_quantity"]),
                    minimum_required_stock=int(row["minimum_required_stock"]),
                    procurement_lead_days=int(row["procurement_lead_days"]),
                    supplier=row["supplier"],
                    criticality=row["criticality"],
                    unit_cost_inr=float(row["unit_cost_inr"]),
                )
                db.add(sp)
            db.commit()
            print("Spare Parts seeded successfully.")

        # 3. Seed Maintenance Logs
        maintenance_file = RAW_DIR / "maintenance_logs" / "maintenance_logs.csv"
        if maintenance_file.exists():
            print("Seeding Maintenance Logs...")
            db.query(MaintenanceLog).delete()
            for row in read_csv(maintenance_file):
                ml = MaintenanceLog(
                    log_id=row["log_id"],
                    equipment_id=row["equipment_id"],
                    maintenance_date=row["maintenance_date"],
                    maintenance_type=row["maintenance_type"],
                    symptom=row["symptom"],
                    action_taken=row["action_taken"],
                    parts_replaced=row.get("parts_replaced", ""),
                    downtime_minutes=int(row["downtime_minutes"]),
                    technician_notes=row.get("technician_notes", ""),
                    linked_failure_report_id=row.get("linked_failure_report_id", ""),
                )
                db.add(ml)
            db.commit()
            print("Maintenance Logs seeded successfully.")

        # 4. Seed Delay Logs
        delay_file = RAW_DIR / "delay_logs" / "equipment_delay_logs.csv"
        if delay_file.exists():
            print("Seeding Delay Logs...")
            db.query(DelayLog).delete()
            for row in read_csv(delay_file):
                dl = DelayLog(
                    delay_id=row["delay_id"],
                    equipment_id=row["equipment_id"],
                    delay_start=row["delay_start"],
                    delay_minutes=int(row["delay_minutes"]),
                    delay_category=row["delay_category"],
                    production_impact=row["production_impact"],
                    remarks=row.get("remarks", ""),
                )
                db.add(dl)
            db.commit()
            print("Delay Logs seeded successfully.")

        # 5. Seed Feedback Logs
        feedback_file = RAW_DIR / "feedback" / "engineer_feedback.csv"
        if feedback_file.exists():
            print("Seeding Engineer Feedback...")
            db.query(EngineerFeedback).delete()
            for row in read_csv(feedback_file):
                fb = EngineerFeedback(
                    feedback_id=row["feedback_id"],
                    recommendation_id=row["recommendation_id"],
                    equipment_id=row["equipment_id"],
                    submitted_by=row["submitted_by"],
                    rating=row["rating"],
                    actual_outcome=row["actual_outcome"],
                    correction_notes=row.get("correction_notes", ""),
                )
                db.add(fb)
            db.commit()
            print("Engineer Feedback seeded successfully.")

        print("Database seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
