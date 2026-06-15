import json
from sqlalchemy.orm import Session
import pandas as pd
from backend.app import config
from backend.llm.gemini_client import GeminiClient
from backend.llm.response_schemas import DiagnosisSchema, RecommendationSchema, ReportDraftSchema
from backend.retrieval.hybrid_retriever import HybridRetriever
from backend.agents import prompt_templates

class MaintenanceOrchestrator:
    def __init__(self, db: Session, api_key: str = None):
        self.db = db
        self.retriever = HybridRetriever(db, api_key=api_key)
        self.gemini_client = GeminiClient(api_key=api_key)

    def run_diagnostic_flow(self, equipment_id: str, telemetry: dict = None) -> dict:
        """
        Runs the complete diagnostic and recommendation chain for a given equipment.
        If telemetry is not supplied, it loads the latest telemetry from sensor_readings.csv.
        """
        # 1. Fetch latest telemetry if not provided
        if not telemetry:
            sensor_file = config.RAW_DIR / "sensor_data" / "sensor_readings.csv"
            if sensor_file.exists():
                try:
                    df = pd.read_csv(sensor_file)
                    df_eq = df[df["equipment_id"] == equipment_id]
                    if not df_eq.empty:
                        telemetry = df_eq.iloc[-1].to_dict()
                except Exception as e:
                    print(f"Orchestrator: Error loading telemetry for {equipment_id}: {e}")
            
            if not telemetry:
                # Fallback to default empty values
                telemetry = {
                    "temperature_c": 0.0, "vibration_mm_s": 0.0, "pressure_bar": 0.0,
                    "rpm": 0, "current_amp": 0.0, "coolant_flow_lpm": 0.0, "operating_load_pct": 0.0
                }

        # 2. Gather context and evidence (Hybrid Retriever)
        # Try to infer if a failure code is already present in the latest telemetry (useful for injected anomalies)
        failure_code = telemetry.get("failure_code", "")
        evidence_pack = self.retriever.retrieve_evidence(
            equipment_id=equipment_id,
            query=telemetry.get("failure_code", ""),
            failure_code=failure_code
        )
        evidence_prompt_text = self.retriever.format_evidence_for_prompt(evidence_pack)

        # 3. Step 1: Suspected Diagnosis & RCA
        diag_prompt = prompt_templates.build_diagnostic_prompt(
            eq_id=equipment_id,
            telemetry=telemetry,
            evidence_text=evidence_prompt_text
        )
        diag_json_str = self.gemini_client.generate_json(
            system_instruction=prompt_templates.DIAGNOSTIC_SYSTEM_PROMPT,
            prompt=diag_prompt,
            response_schema=DiagnosisSchema
        )
        try:
            diagnosis = json.loads(diag_json_str)
        except Exception as e:
            print(f"Orchestrator: Failed to parse diagnosis JSON ({e})")
            diagnosis = {}

        # 4. Step 2: Chained Recommendations & Spares Strategy
        rec_prompt = prompt_templates.build_recommendation_prompt(
            eq_id=equipment_id,
            diagnosis=diagnosis,
            evidence_text=evidence_prompt_text
        )
        rec_json_str = self.gemini_client.generate_json(
            system_instruction=prompt_templates.RECOMMENDATION_SYSTEM_PROMPT,
            prompt=rec_prompt,
            response_schema=RecommendationSchema
        )
        try:
            recommendation = json.loads(rec_json_str)
        except Exception as e:
            print(f"Orchestrator: Failed to parse recommendation JSON ({e})")
            recommendation = {}

        return {
            "equipment_id": equipment_id,
            "telemetry": telemetry,
            "diagnosis": diagnosis,
            "recommendations": recommendation
        }

    def generate_failure_report_draft(self, equipment_id: str, telemetry: dict, diagnosis: dict, recommendation: dict) -> dict:
        """
        Generates a structured logbook report draft based on RCA results.
        """
        report_prompt = prompt_templates.build_report_prompt(
            eq_id=equipment_id,
            telemetry=telemetry,
            diagnosis=diagnosis,
            recommendation=recommendation
        )
        report_json_str = self.gemini_client.generate_json(
            system_instruction=prompt_templates.REPORT_SYSTEM_PROMPT,
            prompt=report_prompt,
            response_schema=ReportDraftSchema
        )
        try:
            return json.loads(report_json_str)
        except Exception as e:
            print(f"Orchestrator: Failed to parse report JSON ({e})")
            return {}
