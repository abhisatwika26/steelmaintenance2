import os
import json
from google import genai
from google.genai import types
from backend.app import config
from backend.llm.response_schemas import DiagnosisSchema, RecommendationSchema, ReportDraftSchema

class GeminiClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or config.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                print("GeminiClient: Live Gemini API Client initialized successfully.")
            except Exception as e:
                print(f"GeminiClient: Failed to initialize live client ({e}). Falling back to Mock mode.")
        else:
            print("GeminiClient: No GEMINI_API_KEY detected. running in MOCK mode.")

    def generate_json(self, system_instruction: str, prompt: str, response_schema: type) -> str:
        """Generates a structured JSON response matching the given schema."""
        if self.client:
            try:
                # Use gemini-2.5-flash as the default model
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=0.2
                    )
                )
                return response.text
            except Exception as e:
                print(f"GeminiClient: live generation failed ({e}). Falling back to Mock content.")

        # MOCK FALLBACKS
        if response_schema == DiagnosisSchema:
            mock_data = {
                "probable_fault": "Bearing Wear (Mock Diagnosis)",
                "confidence_score": 0.88,
                "root_cause": "Telemetry trends show high vibration (3.2 mm/s) coinciding with a temperature rise (74C) on the asset. This indicates progressive bearing friction, likely due to lubrication film breakdown.",
                "process_defect_contribution": "Sustained high operating loads (>85%) over the past 48 hours accelerated grease degradation.",
                "evidence_cited": ["SOP_bearing_replacement.txt", "equipment_master.csv", "ML-0453"]
            }
            return json.dumps(mock_data)
            
        elif response_schema == RecommendationSchema:
            mock_data = {
                "immediate_actions": [
                    "Perform Lockout-Tagout (LOTO) on the equipment electrical switch.",
                    "Verify zero mechanical rotation and check bearing housing temperature.",
                    "Inspect lubricating grease nozzles for blockages, and clean housing filters.",
                    "Top up with high-temperature grease (SP-GREASE-001)."
                ],
                "long_term_actions": [
                    "Add vibration trend monitoring to daily operator round sheets.",
                    "Schedule formal shaft alignment inspection during next planned downtime."
                ],
                "spare_procurement_strategy": "Warning: Heavy Duty Bearing Set (SP-BEAR-001) is currently below minimum stock levels in the warehouse. Order replacement immediately from SKF Industrial (lead time 9 days)."
            }
            return json.dumps(mock_data)
            
        elif response_schema == ReportDraftSchema:
            mock_data = {
                "report_title": "Failure Report: Drive Bearing Overheating and High Vibration",
                "failure_mode": "Bearing Wear",
                "symptoms": "High casing temperature (74C) and abnormal bearing noise (3.2 mm/s vibration).",
                "root_cause": "Progressive drive shaft bearing wear caused by grease film thickness degradation under high loading.",
                "corrective_action_taken": "Shut down asset, isolated coupling, cleared grease nozzle blockages, topped up grease, and restarted.",
                "parts_replaced": ["SP-BEAR-001", "SP-GREASE-001"],
                "downtime_minutes": 140,
                "preventive_notes": "Ensure bearing grease flow is verified at the start of every shift."
            }
            return json.dumps(mock_data)
            
        return "{}"

    def generate_text(self, system_instruction: str, prompt: str) -> str:
        """Generates unstructured conversational text."""
        fallback_msg = (
            "**[Offline Assistant Mock Mode]**\n\n"
            "I'm currently running in offline mock mode since no `GEMINI_API_KEY` is configured or the rate limit was hit.\n\n"
            "Based on standard steel plant maintenance protocols:\n"
            "1. **Safety First**: Always verify Lockout-Tagout (LOTO) and zero-energy state before physical inspection.\n"
            "2. **Hydraulic Systems**: Check suction strainers (`SOP_hydraulic_pump_overheating.txt`) and inspect cylinder seals.\n"
            "3. **Motor Trips**: Verify coupling alignment, phase currents, and winding temperatures (`SOP_electric_motor_windings.txt`).\n\n"
            "Please check your API key status or wait a few seconds to let your rate limit reset for live conversations."
        )

        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.7
                    )
                )
                return response.text
            except Exception as e:
                print(f"GeminiClient: live text generation failed ({e})")
                return f"⚠️ **Rate Limit / API Quota Exhausted**\n\n{fallback_msg}\n\n*(Raw API Details: {e})*"

        # Conversational fallback response
        return fallback_msg

