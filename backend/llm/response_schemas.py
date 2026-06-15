from pydantic import BaseModel, Field
from typing import List

class DiagnosisSchema(BaseModel):
    probable_fault: str = Field(description="Name of the suspected/diagnosed fault mode.")
    confidence_score: float = Field(description="Confidence rating of this diagnosis from 0.0 to 1.0.")
    root_cause: str = Field(description="Detailed analysis of the underlying root cause of the anomaly.")
    process_defect_contribution: str = Field(description="Any process-related defects or operating issues that contributed to the fault.")
    evidence_cited: List[str] = Field(description="Specific references to historical failure reports, maintenance logs, or SOP sections used to support this conclusion.")


class RecommendationSchema(BaseModel):
    immediate_actions: List[str] = Field(description="List of step-by-step immediate repair or check actions the maintenance team must take.")
    long_term_actions: List[str] = Field(description="Preventive recommendations and monitoring steps to prevent recurrences.")
    spare_procurement_strategy: str = Field(description="Strategy for procuring required spare parts based on stock status and supplier lead times.")


class ReportDraftSchema(BaseModel):
    report_title: str = Field(description="Formal title for the failure report.")
    failure_mode: str = Field(description="Suspicion of failure mode name.")
    symptoms: str = Field(description="List of symptoms observed in sensor telemetry and logs.")
    root_cause: str = Field(description="Detailed root cause summary.")
    corrective_action_taken: str = Field(description="Maintenance tasks executed to address the issue.")
    parts_replaced: List[str] = Field(description="Specific spare parts replaced during the corrective action.")
    downtime_minutes: int = Field(description="Estimated equipment downtime in minutes.")
    preventive_notes: str = Field(description="Lessons learned and preventive checks for shift logs.")
