from __future__ import annotations

import csv
from collections import Counter
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
RAW_DIR = BASE_DIR / "data" / "raw"


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def main() -> None:
    errors: list[str] = []
    equipment = read_csv(RAW_DIR / "equipment" / "equipment_master.csv")
    sensors = read_csv(RAW_DIR / "sensor_data" / "sensor_readings.csv")
    maintenance = read_csv(RAW_DIR / "maintenance_logs" / "maintenance_logs.csv")
    delays = read_csv(RAW_DIR / "delay_logs" / "equipment_delay_logs.csv")
    spares = read_csv(RAW_DIR / "spare_parts" / "spare_parts_inventory.csv")
    feedback = read_csv(RAW_DIR / "feedback" / "engineer_feedback.csv")

    equipment_ids = {row["equipment_id"] for row in equipment}
    spare_ids = {row["part_id"] for row in spares}
    report_ids = {path.name.split("_", 1)[0] for path in (RAW_DIR / "failure_reports").glob("FR-*.txt")}

    require(len(equipment) == 12, "Expected 12 equipment rows.", errors)
    require(len(sensors) == 12 * 30 * 96, "Expected 34,560 sensor rows.", errors)
    require(len(maintenance) == 500, "Expected 500 maintenance log rows.", errors)
    require(len(delays) == 300, "Expected 300 delay log rows.", errors)
    require(len(spares) == 150, "Expected 150 spare rows.", errors)
    require(len(report_ids) == 48, "Expected 48 failure reports.", errors)
    require(len(list((RAW_DIR / "sops").glob("*.txt"))) == 12, "Expected 12 SOP files.", errors)
    require(len(list((RAW_DIR / "manuals").glob("*.txt"))) == 12, "Expected 12 manual files.", errors)

    for name, rows in {
        "sensor": sensors,
        "maintenance": maintenance,
        "delay": delays,
        "feedback": feedback,
    }.items():
        unknown = sorted({row["equipment_id"] for row in rows} - equipment_ids)
        require(not unknown, f"{name} rows reference unknown equipment IDs: {unknown}", errors)

    anomaly_rows = [row for row in sensors if row["anomaly_label"] == "1"]
    normal_rows = [row for row in sensors if row["anomaly_label"] == "0"]
    require(len(anomaly_rows) > 350, "Expected more than 350 anomaly sensor rows.", errors)
    require(len(normal_rows) > 33000, "Expected more than 33,000 normal sensor rows.", errors)

    failure_codes = {row["failure_code"] for row in anomaly_rows}
    require("" not in failure_codes, "Anomaly rows must include failure_code.", errors)
    require(len(failure_codes) >= 5, "Expected at least five failure modes in anomaly rows.", errors)

    per_equipment = Counter(row["equipment_id"] for row in sensors)
    for equipment_id in equipment_ids:
        require(per_equipment[equipment_id] == 30 * 96, f"{equipment_id} does not have 2,880 sensor readings.", errors)

    for row in sensors[:10] + sensors[-10:]:
        try:
            datetime.fromisoformat(row["timestamp"])
        except ValueError:
            errors.append(f"Invalid sensor timestamp: {row['timestamp']}")

    for row in maintenance:
        linked = row.get("linked_failure_report_id", "")
        if linked:
            require(linked in report_ids, f"Maintenance row {row['log_id']} links missing report {linked}.", errors)
        parts = [part.strip() for part in row.get("parts_replaced", "").split(";") if part.strip()]
        missing_parts = sorted(set(parts) - spare_ids)
        require(not missing_parts, f"Maintenance row {row['log_id']} references unknown spares: {missing_parts}", errors)

    if errors:
        print("DATASET VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("DATASET VALIDATION PASSED")
    print(f"Equipment rows: {len(equipment)}")
    print(f"Sensor rows: {len(sensors)}")
    print(f"Anomaly sensor rows: {len(anomaly_rows)}")
    print(f"Maintenance log rows: {len(maintenance)}")
    print(f"Delay log rows: {len(delays)}")
    print(f"Spare rows: {len(spares)}")
    print(f"Failure reports: {len(report_ids)}")
    print(f"SOP files: {len(list((RAW_DIR / 'sops').glob('*.txt')))}")
    print(f"Manual files: {len(list((RAW_DIR / 'manuals').glob('*.txt')))}")


if __name__ == "__main__":
    main()
