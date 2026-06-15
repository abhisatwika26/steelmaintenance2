from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from backend.db.database import Base

class EquipmentMaster(Base):
    __tablename__ = "equipment_master"

    equipment_id = Column(String, primary_key=True, index=True)
    equipment_name = Column(String, nullable=False)
    plant_area = Column(String, nullable=False)
    equipment_type = Column(String, nullable=False)
    criticality = Column(String, nullable=False)
    normal_temperature_c = Column(Float, nullable=False)
    normal_vibration_mm_s = Column(Float, nullable=False)
    normal_pressure_bar = Column(Float, nullable=False)
    normal_rpm = Column(Float, nullable=False)
    normal_current_amp = Column(Float, nullable=False)
    normal_coolant_flow_lpm = Column(Float, nullable=False)

    maintenance_logs = relationship("MaintenanceLog", back_populates="equipment")
    delay_logs = relationship("DelayLog", back_populates="equipment")
    feedback = relationship("EngineerFeedback", back_populates="equipment")
    alerts = relationship("AnomalyAlert", back_populates="equipment")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    log_id = Column(String, primary_key=True, index=True)
    equipment_id = Column(String, ForeignKey("equipment_master.equipment_id"), nullable=False)
    maintenance_date = Column(String, nullable=False)
    maintenance_type = Column(String, nullable=False)
    symptom = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    parts_replaced = Column(String, nullable=True)  # Semicolon-separated IDs
    downtime_minutes = Column(Integer, nullable=False)
    technician_notes = Column(String, nullable=True)
    linked_failure_report_id = Column(String, nullable=True)

    equipment = relationship("EquipmentMaster", back_populates="maintenance_logs")


class DelayLog(Base):
    __tablename__ = "delay_logs"

    delay_id = Column(String, primary_key=True, index=True)
    equipment_id = Column(String, ForeignKey("equipment_master.equipment_id"), nullable=False)
    delay_start = Column(String, nullable=False)
    delay_minutes = Column(Integer, nullable=False)
    delay_category = Column(String, nullable=False)
    production_impact = Column(String, nullable=False)
    remarks = Column(String, nullable=True)

    equipment = relationship("EquipmentMaster", back_populates="delay_logs")


class SparePart(Base):
    __tablename__ = "spare_parts_inventory"

    part_id = Column(String, primary_key=True, index=True)
    part_name = Column(String, nullable=False)
    compatible_equipment_types = Column(String, nullable=False)  # Semicolon-separated types
    stock_quantity = Column(Integer, nullable=False)
    minimum_required_stock = Column(Integer, nullable=False)
    procurement_lead_days = Column(Integer, nullable=False)
    supplier = Column(String, nullable=False)
    criticality = Column(String, nullable=False)
    unit_cost_inr = Column(Float, nullable=False)


class EngineerFeedback(Base):
    __tablename__ = "engineer_feedback"

    feedback_id = Column(String, primary_key=True, index=True)
    recommendation_id = Column(String, nullable=False)
    equipment_id = Column(String, ForeignKey("equipment_master.equipment_id"), nullable=False)
    submitted_by = Column(String, nullable=False)
    rating = Column(String, nullable=False)  # accepted, partially_accepted, corrected
    actual_outcome = Column(String, nullable=False)
    correction_notes = Column(String, nullable=True)

    equipment = relationship("EquipmentMaster", back_populates="feedback")


class AnomalyAlert(Base):
    __tablename__ = "anomaly_alerts"

    alert_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    equipment_id = Column(String, ForeignKey("equipment_master.equipment_id"), nullable=False)
    timestamp = Column(String, nullable=False, index=True)
    anomaly_score = Column(Float, nullable=False)
    health_index = Column(Float, nullable=False)
    predicted_rul = Column(String, nullable=False)  # e.g., "12 days" or "Normal (30+ days)"
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)  # Low, Medium, High, Critical
    symptoms = Column(String, nullable=True)
    is_acknowledged = Column(Boolean, default=False, nullable=False)

    equipment = relationship("EquipmentMaster", back_populates="alerts")
