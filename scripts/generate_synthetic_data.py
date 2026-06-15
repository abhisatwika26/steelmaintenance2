from __future__ import annotations

import csv
import random
import shutil
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from textwrap import dedent


SEED = 42
BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"


@dataclass(frozen=True)
class Equipment:
    equipment_id: str
    name: str
    area: str
    equipment_type: str
    criticality: str
    temp_mean: float
    vibration_mean: float
    pressure_mean: float
    rpm_mean: float
    current_mean: float
    coolant_mean: float


@dataclass(frozen=True)
class FailureMode:
    code: str
    name: str
    symptom: str
    root_cause: str
    corrective_action: str
    sop_slug: str
    required_parts: tuple[str, ...]


EQUIPMENT = [
    Equipment("EQ-001", "Caster Hydraulic Pump", "Continuous Casting", "Hydraulic Pump", "Critical", 68, 3.2, 145, 1480, 42, 78),
    Equipment("EQ-002", "Rolling Mill Main Motor", "Hot Rolling Mill", "Electric Motor", "Critical", 74, 2.8, 0, 960, 260, 65),
    Equipment("EQ-003", "Blast Furnace Blower", "Blast Furnace", "Blower", "Critical", 82, 4.0, 210, 1780, 310, 72),
    Equipment("EQ-004", "Ladle Crane Gearbox", "Steel Melting Shop", "Gearbox", "High", 71, 4.5, 0, 420, 88, 50),
    Equipment("EQ-005", "Cooling Water Pump", "Utilities", "Centrifugal Pump", "High", 58, 2.4, 120, 1450, 58, 92),
    Equipment("EQ-006", "Conveyor Drive Unit", "Raw Material Handling", "Drive Unit", "Medium", 61, 3.1, 0, 720, 44, 48),
    Equipment("EQ-007", "Dust Collector Fan", "Environmental Control", "Fan", "Medium", 64, 3.6, 95, 1320, 39, 45),
    Equipment("EQ-008", "Reheat Furnace Burner", "Reheat Furnace", "Burner", "High", 88, 2.2, 32, 0, 28, 40),
    Equipment("EQ-009", "Scale Breaker Motor", "Hot Rolling Mill", "Electric Motor", "High", 69, 3.0, 0, 1180, 132, 58),
    Equipment("EQ-010", "Air Compressor", "Utilities", "Compressor", "High", 76, 3.8, 185, 1520, 96, 70),
    Equipment("EQ-011", "Lubrication Pump", "Hot Rolling Mill", "Lubrication Pump", "Critical", 62, 2.5, 75, 1420, 35, 55),
    Equipment("EQ-012", "Cooling Tower Fan", "Utilities", "Fan", "Medium", 57, 3.4, 0, 880, 52, 96),
]


FAILURE_MODES = [
    FailureMode(
        "FM-001",
        "Bearing Wear",
        "rising vibration and abnormal bearing noise",
        "progressive bearing wear caused by lubrication degradation",
        "inspect bearing housing, verify lubrication flow, replace bearing if vibration remains high",
        "SOP_bearing_replacement",
        ("SP-BEAR-001", "SP-GREASE-001"),
    ),
    FailureMode(
        "FM-002",
        "Hydraulic Leakage",
        "pressure drop with increasing pump temperature",
        "seal wear or suction-side leakage reducing hydraulic pressure",
        "isolate pump, inspect suction strainer and seal kit, restore pressure before restart",
        "SOP_hydraulic_pump_overheating",
        ("SP-SEAL-001", "SP-FILTER-001"),
    ),
    FailureMode(
        "FM-003",
        "Motor Overload",
        "current spike and repeated overload trip",
        "mechanical load increase or phase imbalance causing motor overload",
        "check load coupling, verify phase current balance, inspect motor winding temperature",
        "SOP_motor_overload_trip",
        ("SP-CONTACTOR-001", "SP-FUSE-001"),
    ),
    FailureMode(
        "FM-004",
        "Cooling Flow Restriction",
        "temperature rise with reduced coolant flow",
        "cooling line blockage or pump strainer fouling",
        "flush cooling line, clean strainer, verify flow rate before releasing equipment",
        "SOP_cooling_flow_drop",
        ("SP-FILTER-002", "SP-GASKET-001"),
    ),
    FailureMode(
        "FM-005",
        "Gearbox Misalignment",
        "high vibration during load changes",
        "coupling misalignment transferring shock load into gearbox bearings",
        "check alignment, inspect coupling, tighten foundation bolts, monitor vibration trend",
        "SOP_gearbox_vibration_inspection",
        ("SP-COUPLING-001", "SP-BOLT-001"),
    ),
    FailureMode(
        "FM-006",
        "Lubrication Failure",
        "oil level drop with heat buildup",
        "low oil level or blocked lubrication line reducing film strength",
        "top up oil, inspect lubrication line, replace clogged filter, verify pump discharge",
        "SOP_lubrication_failure_response",
        ("SP-OIL-001", "SP-FILTER-003"),
    ),
]


SOP_TITLES = {
    "SOP_bearing_replacement": "Bearing Replacement and Vibration Response",
    "SOP_hydraulic_pump_overheating": "Hydraulic Pump Overheating and Pressure Loss",
    "SOP_motor_overload_trip": "Motor Overload Trip Response",
    "SOP_cooling_flow_drop": "Cooling Water Flow Drop Response",
    "SOP_gearbox_vibration_inspection": "Gearbox Vibration Inspection",
    "SOP_lubrication_failure_response": "Lubrication Failure Response",
    "SOP_conveyor_misalignment": "Conveyor Drive Misalignment Response",
    "SOP_burner_instability": "Reheat Furnace Burner Instability",
    "SOP_fan_vibration": "Fan Vibration and Balancing",
    "SOP_compressor_pressure_surge": "Air Compressor Pressure Surge",
    "SOP_emergency_shutdown": "Critical Equipment Emergency Shutdown",
    "SOP_post_maintenance_restart": "Post Maintenance Restart Checklist",
}


def reset_output() -> None:
    if RAW_DIR.exists():
        shutil.rmtree(RAW_DIR)
    for child in [
        "equipment",
        "sensor_data",
        "maintenance_logs",
        "delay_logs",
        "spare_parts",
        "failure_reports",
        "sops",
        "manuals",
        "feedback",
    ]:
        (RAW_DIR / child).mkdir(parents=True, exist_ok=True)


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def choose_failure_for_equipment(rng: random.Random, equipment: Equipment) -> FailureMode:
    if "Pump" in equipment.equipment_type:
        options = ["FM-002", "FM-004", "FM-006", "FM-001"]
    elif "Motor" in equipment.equipment_type:
        options = ["FM-003", "FM-001", "FM-004"]
    elif equipment.equipment_type in {"Fan", "Blower", "Compressor"}:
        options = ["FM-001", "FM-005", "FM-004"]
    elif equipment.equipment_type == "Gearbox":
        options = ["FM-005", "FM-001", "FM-006"]
    else:
        options = ["FM-004", "FM-003", "FM-001"]
    by_code = {mode.code: mode for mode in FAILURE_MODES}
    return by_code[rng.choice(options)]


def generate_equipment() -> None:
    rows = [
        {
            "equipment_id": item.equipment_id,
            "equipment_name": item.name,
            "plant_area": item.area,
            "equipment_type": item.equipment_type,
            "criticality": item.criticality,
            "normal_temperature_c": item.temp_mean,
            "normal_vibration_mm_s": item.vibration_mean,
            "normal_pressure_bar": item.pressure_mean,
            "normal_rpm": item.rpm_mean,
            "normal_current_amp": item.current_mean,
            "normal_coolant_flow_lpm": item.coolant_mean,
        }
        for item in EQUIPMENT
    ]
    write_csv(RAW_DIR / "equipment" / "equipment_master.csv", rows, list(rows[0].keys()))


def generate_spares(rng: random.Random) -> None:
    base_parts = [
        ("SP-BEAR-001", "Heavy Duty Bearing Set", 16, 6, 9, "Critical"),
        ("SP-GREASE-001", "High Temperature Grease Cartridge", 80, 24, 2, "Medium"),
        ("SP-SEAL-001", "Hydraulic Pump Seal Kit", 4, 8, 14, "Critical"),
        ("SP-FILTER-001", "Hydraulic Suction Filter", 18, 10, 5, "High"),
        ("SP-CONTACTOR-001", "Motor Power Contactor", 7, 5, 8, "High"),
        ("SP-FUSE-001", "High Current Fuse Set", 35, 12, 3, "Medium"),
        ("SP-FILTER-002", "Cooling Water Strainer Element", 11, 10, 6, "High"),
        ("SP-GASKET-001", "Cooling Line Gasket Kit", 42, 16, 4, "Medium"),
        ("SP-COUPLING-001", "Flexible Coupling Assembly", 3, 5, 18, "Critical"),
        ("SP-BOLT-001", "Foundation Bolt Kit", 60, 20, 4, "Medium"),
        ("SP-OIL-001", "ISO VG 220 Gear Oil Drum", 14, 8, 7, "High"),
        ("SP-FILTER-003", "Lubrication Line Filter", 9, 8, 6, "High"),
    ]
    rows = []
    for part_id, name, stock, min_stock, lead, criticality in base_parts:
        rows.append(
            {
                "part_id": part_id,
                "part_name": name,
                "compatible_equipment_types": "; ".join(sorted({eq.equipment_type for eq in EQUIPMENT})),
                "stock_quantity": stock,
                "minimum_required_stock": min_stock,
                "procurement_lead_days": lead,
                "supplier": rng.choice(["Tata Industrial Supplies", "JSW Vendor Hub", "SKF Industrial", "Siemens Service", "Local MRO Store"]),
                "criticality": criticality,
                "unit_cost_inr": rng.randint(2500, 180000),
            }
        )
    for index in range(13, 151):
        eq = rng.choice(EQUIPMENT)
        rows.append(
            {
                "part_id": f"SP-GEN-{index:03d}",
                "part_name": f"{eq.equipment_type} Service Spare {index:03d}",
                "compatible_equipment_types": eq.equipment_type,
                "stock_quantity": rng.randint(0, 40),
                "minimum_required_stock": rng.randint(2, 12),
                "procurement_lead_days": rng.randint(3, 30),
                "supplier": rng.choice(["Tata Industrial Supplies", "JSW Vendor Hub", "OEM Service Center", "Local MRO Store"]),
                "criticality": rng.choice(["Low", "Medium", "High"]),
                "unit_cost_inr": rng.randint(1000, 95000),
            }
        )
    write_csv(RAW_DIR / "spare_parts" / "spare_parts_inventory.csv", rows, list(rows[0].keys()))


def build_anomaly_schedule(rng: random.Random, start: datetime) -> list[dict[str, object]]:
    events: list[dict[str, object]] = []
    event_id = 1
    for eq in EQUIPMENT:
        for _ in range(4):
            day = rng.randint(2, 28)
            slot = rng.randint(8, 80)
            mode = choose_failure_for_equipment(rng, eq)
            events.append(
                {
                    "event_id": f"AE-{event_id:03d}",
                    "equipment_id": eq.equipment_id,
                    "failure_code": mode.code,
                    "start_time": start + timedelta(days=day, minutes=15 * slot),
                    "duration_slots": rng.randint(5, 18),
                    "severity": rng.choice(["Medium", "High", "Critical"] if eq.criticality in {"High", "Critical"} else ["Low", "Medium", "High"]),
                }
            )
            event_id += 1
    return sorted(events, key=lambda item: item["start_time"])


def event_for_time(events: list[dict[str, object]], equipment_id: str, timestamp: datetime) -> dict[str, object] | None:
    for event in events:
        if event["equipment_id"] != equipment_id:
            continue
        start = event["start_time"]
        end = start + timedelta(minutes=15 * int(event["duration_slots"]))
        if start <= timestamp <= end:
            return event
    return None


def generate_sensor_data(rng: random.Random, events: list[dict[str, object]], start: datetime) -> None:
    rows = []
    failure_by_code = {mode.code: mode for mode in FAILURE_MODES}
    for eq in EQUIPMENT:
        for index in range(30 * 96):
            ts = start + timedelta(minutes=15 * index)
            event = event_for_time(events, eq.equipment_id, ts)
            load = max(35, min(104, rng.gauss(72, 13)))
            temp = rng.gauss(eq.temp_mean, 2.3) + (load - 72) * 0.08
            vibration = max(0.1, rng.gauss(eq.vibration_mean, 0.35))
            pressure = max(0, rng.gauss(eq.pressure_mean, 4.5)) if eq.pressure_mean else 0
            rpm = max(0, rng.gauss(eq.rpm_mean, max(10, eq.rpm_mean * 0.015))) if eq.rpm_mean else 0
            current = max(0, rng.gauss(eq.current_mean, max(2, eq.current_mean * 0.04)))
            coolant = max(0, rng.gauss(eq.coolant_mean, 5.0))
            anomaly_label = 0
            failure_code = ""
            if event:
                anomaly_label = 1
                failure_code = str(event["failure_code"])
                mode = failure_by_code[failure_code]
                multiplier = {"Low": 1.0, "Medium": 1.4, "High": 1.8, "Critical": 2.2}[str(event["severity"])]
                if mode.code in {"FM-001", "FM-005"}:
                    vibration += rng.uniform(1.5, 3.5) * multiplier
                    temp += rng.uniform(2, 6) * multiplier
                if mode.code == "FM-002":
                    pressure = max(0, pressure - rng.uniform(20, 45) * multiplier)
                    temp += rng.uniform(5, 12) * multiplier
                if mode.code == "FM-003":
                    current += rng.uniform(20, 55) * multiplier
                    temp += rng.uniform(4, 9) * multiplier
                    rpm = max(0, rpm - rng.uniform(20, 90))
                if mode.code == "FM-004":
                    coolant = max(0, coolant - rng.uniform(18, 42) * multiplier)
                    temp += rng.uniform(6, 14) * multiplier
                if mode.code == "FM-006":
                    temp += rng.uniform(7, 16) * multiplier
                    vibration += rng.uniform(0.7, 2.2) * multiplier
            rows.append(
                {
                    "timestamp": ts.isoformat(timespec="minutes"),
                    "equipment_id": eq.equipment_id,
                    "temperature_c": round(temp, 2),
                    "vibration_mm_s": round(vibration, 3),
                    "pressure_bar": round(pressure, 2),
                    "rpm": round(rpm, 1),
                    "current_amp": round(current, 2),
                    "coolant_flow_lpm": round(coolant, 2),
                    "operating_load_pct": round(load, 2),
                    "anomaly_label": anomaly_label,
                    "failure_code": failure_code,
                }
            )
    write_csv(RAW_DIR / "sensor_data" / "sensor_readings.csv", rows, list(rows[0].keys()))


def generate_logs_and_reports(rng: random.Random, events: list[dict[str, object]]) -> None:
    failure_by_code = {mode.code: mode for mode in FAILURE_MODES}
    equipment_by_id = {eq.equipment_id: eq for eq in EQUIPMENT}
    maintenance_rows = []
    delay_rows = []
    feedback_rows = []

    for index, event in enumerate(events, 1):
        eq = equipment_by_id[str(event["equipment_id"])]
        mode = failure_by_code[str(event["failure_code"])]
        downtime = {"Low": 20, "Medium": 55, "High": 140, "Critical": 260}[str(event["severity"])] + rng.randint(-15, 35)
        log_id = f"ML-{index:04d}"
        report_id = f"FR-{index:03d}"
        maintenance_rows.append(
            {
                "log_id": log_id,
                "equipment_id": eq.equipment_id,
                "maintenance_date": (event["start_time"] + timedelta(hours=2)).date().isoformat(),
                "maintenance_type": rng.choice(["Corrective", "Inspection", "Condition-Based"]),
                "symptom": mode.symptom,
                "action_taken": mode.corrective_action,
                "parts_replaced": "; ".join(mode.required_parts),
                "downtime_minutes": max(5, downtime),
                "technician_notes": f"{mode.name} suspected on {eq.name}. Action followed {mode.sop_slug}.",
                "linked_failure_report_id": report_id,
            }
        )
        delay_rows.append(
            {
                "delay_id": f"DL-{index:04d}",
                "equipment_id": eq.equipment_id,
                "delay_start": event["start_time"].isoformat(timespec="minutes"),
                "delay_minutes": max(5, downtime),
                "delay_category": mode.name,
                "production_impact": rng.choice(["Minor", "Moderate", "Severe"] if eq.criticality != "Medium" else ["Minor", "Moderate"]),
                "remarks": f"Delay caused by {mode.symptom}.",
            }
        )
        feedback_rows.append(
            {
                "feedback_id": f"FB-{index:04d}",
                "recommendation_id": f"REC-{index:04d}",
                "equipment_id": eq.equipment_id,
                "submitted_by": rng.choice(["maintenance_engineer", "shift_supervisor", "reliability_engineer"]),
                "rating": rng.choice(["accepted", "accepted", "partially_accepted", "corrected"]),
                "actual_outcome": rng.choice(["issue_resolved", "monitoring_required", "repeat_inspection_needed"]),
                "correction_notes": "" if rng.random() < 0.75 else "Root cause required additional inspection before final confirmation.",
            }
        )
        report_text = dedent(
            f"""
            Failure Report: {report_id}
            Equipment ID: {eq.equipment_id}
            Equipment Name: {eq.name}
            Plant Area: {eq.area}
            Failure Mode: {mode.name}
            Fault Code: {mode.code}
            Event Time: {event["start_time"].isoformat(timespec="minutes")}
            Severity: {event["severity"]}

            Observed Symptoms:
            The maintenance team observed {mode.symptom}. Sensor history around the event showed abnormal behavior compared with the normal operating band for this asset.

            Root Cause:
            {mode.root_cause}.

            Corrective Action:
            {mode.corrective_action}. The required spare references were {", ".join(mode.required_parts)}.

            Downtime:
            Total equipment delay was {max(5, downtime)} minutes.

            Lessons Learned:
            Future alerts should combine anomaly score, equipment criticality, recent maintenance history, and spare availability before assigning intervention priority.
            """
        ).strip()
        (RAW_DIR / "failure_reports" / f"{report_id}_{eq.equipment_id}_{mode.code}.txt").write_text(report_text + "\n", encoding="utf-8")

    while len(maintenance_rows) < 500:
        eq = rng.choice(EQUIPMENT)
        mode = choose_failure_for_equipment(rng, eq)
        date = datetime(2026, 5, 1) + timedelta(days=rng.randint(0, 60))
        maintenance_rows.append(
            {
                "log_id": f"ML-{len(maintenance_rows) + 1:04d}",
                "equipment_id": eq.equipment_id,
                "maintenance_date": date.date().isoformat(),
                "maintenance_type": rng.choice(["Preventive", "Inspection", "Lubrication", "Calibration"]),
                "symptom": rng.choice(["routine inspection", mode.symptom, "no abnormality observed"]),
                "action_taken": rng.choice(["checked alignment", "cleaned filter", "topped up lubricant", mode.corrective_action]),
                "parts_replaced": "" if rng.random() < 0.55 else "; ".join(mode.required_parts[:1]),
                "downtime_minutes": rng.randint(0, 90),
                "technician_notes": f"Routine maintenance record for {eq.name}.",
                "linked_failure_report_id": "",
            }
        )

    while len(delay_rows) < 300:
        eq = rng.choice(EQUIPMENT)
        mode = choose_failure_for_equipment(rng, eq)
        delay_start = datetime(2026, 5, 1) + timedelta(days=rng.randint(0, 60), minutes=15 * rng.randint(0, 95))
        delay_rows.append(
            {
                "delay_id": f"DL-{len(delay_rows) + 1:04d}",
                "equipment_id": eq.equipment_id,
                "delay_start": delay_start.isoformat(timespec="minutes"),
                "delay_minutes": rng.randint(5, 160),
                "delay_category": rng.choice([mode.name, "Planned maintenance", "Process hold", "Inspection"]),
                "production_impact": rng.choice(["Minor", "Moderate", "Severe"]),
                "remarks": f"Delay log associated with {eq.name}.",
            }
        )

    write_csv(RAW_DIR / "maintenance_logs" / "maintenance_logs.csv", maintenance_rows, list(maintenance_rows[0].keys()))
    write_csv(RAW_DIR / "delay_logs" / "equipment_delay_logs.csv", delay_rows, list(delay_rows[0].keys()))
    write_csv(RAW_DIR / "feedback" / "engineer_feedback.csv", feedback_rows, list(feedback_rows[0].keys()))


def generate_sops_and_manuals() -> None:
    failure_by_sop = {mode.sop_slug: mode for mode in FAILURE_MODES}
    for slug, title in SOP_TITLES.items():
        mode = failure_by_sop.get(slug)
        symptom = mode.symptom if mode else "abnormal operating behavior"
        action = mode.corrective_action if mode else "inspect asset condition, isolate unsafe equipment, and record observations"
        parts = ", ".join(mode.required_parts) if mode else "site-approved spare parts"
        content = dedent(
            f"""
            {title}

            Purpose:
            Provide a standard maintenance response for {symptom}.

            Safety Precautions:
            1. Inform the shift supervisor before intervention.
            2. Follow lockout and tagout procedure for rotating or energized equipment.
            3. Verify zero stored energy before opening guards, panels, or hydraulic lines.

            Inspection Steps:
            1. Review recent alarm history and sensor trends.
            2. Compare temperature, vibration, pressure, current, and coolant flow against normal operating bands.
            3. Check recent maintenance logs for repeated symptoms.
            4. Inspect related components for leakage, wear, blockage, looseness, or overheating.

            Recommended Action:
            {action}.

            Required Spares:
            {parts}.

            Escalation Rule:
            Escalate to the reliability engineer if the equipment is critical, if anomaly score remains high after corrective action, or if required spares are below minimum stock.
            """
        ).strip()
        (RAW_DIR / "sops" / f"{slug}.txt").write_text(content + "\n", encoding="utf-8")

    for eq in EQUIPMENT:
        content = dedent(
            f"""
            Equipment Manual: {eq.name}

            Equipment ID: {eq.equipment_id}
            Plant Area: {eq.area}
            Equipment Type: {eq.equipment_type}
            Criticality: {eq.criticality}

            Normal Operating Bands:
            Temperature: {eq.temp_mean - 8:.1f} C to {eq.temp_mean + 10:.1f} C
            Vibration: 0.5 mm/s to {eq.vibration_mean + 1.5:.1f} mm/s
            Pressure: {max(0, eq.pressure_mean - 25):.1f} bar to {eq.pressure_mean + 25:.1f} bar
            Current: {max(0, eq.current_mean - eq.current_mean * 0.25):.1f} A to {eq.current_mean + eq.current_mean * 0.25:.1f} A
            Coolant Flow: {max(0, eq.coolant_mean - 20):.1f} lpm to {eq.coolant_mean + 20:.1f} lpm

            Maintenance Notes:
            This asset should be monitored for temperature rise, vibration increase, abnormal current draw, and process delay impact. Critical assets require immediate review when anomaly score is high.
            """
        ).strip()
        safe_name = eq.name.lower().replace(" ", "_").replace("/", "_")
        (RAW_DIR / "manuals" / f"{eq.equipment_id}_{safe_name}_manual.txt").write_text(content + "\n", encoding="utf-8")


def main() -> None:
    rng = random.Random(SEED)
    reset_output()
    start = datetime(2026, 5, 1, 0, 0)
    events = build_anomaly_schedule(rng, start)
    generate_equipment()
    generate_spares(rng)
    generate_sensor_data(rng, events, start)
    generate_logs_and_reports(rng, events)
    generate_sops_and_manuals()
    print(f"Generated synthetic maintenance dataset at {RAW_DIR}")
    print(f"Equipment assets: {len(EQUIPMENT)}")
    print(f"Injected anomaly events / failure reports: {len(events)}")
    print("Sensor rows: 34560")


if __name__ == "__main__":
    main()
