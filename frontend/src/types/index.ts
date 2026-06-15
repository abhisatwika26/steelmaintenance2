export interface Equipment {
  equipment_id: string;
  equipment_name: string;
  plant_area: string;
  equipment_type: string;
  criticality: string;
  normal_temperature_c: number;
  normal_vibration_mm_s: number;
  normal_pressure_bar: number;
  normal_rpm: number;
  normal_current_amp: number;
  normal_coolant_flow_lpm: number;
}

export interface TelemetryReading {
  timestamp: string;
  equipment_id: string;
  temperature_c: number;
  vibration_mm_s: number;
  pressure_bar: number;
  rpm: number;
  current_amp: number;
  coolant_flow_lpm: number;
  operating_load_pct: number;
  anomaly_label: number;
  failure_code: string;
}

export interface Alert {
  alert_id: number;
  equipment_id: string;
  equipment_name: string;
  plant_area: string;
  timestamp: string;
  anomaly_score: number;
  health_index: number;
  predicted_rul: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  symptoms: string;
  is_acknowledged: boolean;
}

export interface SparePart {
  part_id: string;
  part_name: string;
  compatible_equipment_types: string;
  stock_quantity: number;
  minimum_required_stock: number;
  procurement_lead_days: number;
  supplier: string;
  criticality: string;
  unit_cost_inr: number;
  status: string;
}

export interface Diagnosis {
  probable_fault: string;
  confidence_score: number;
  root_cause: string;
  process_defect_contribution: string;
  evidence_cited: string[];
}

export interface Recommendations {
  immediate_actions: string[];
  long_term_actions: string[];
  spare_procurement_strategy: string;
}

export interface RcaReport {
  equipment_id: string;
  telemetry: Partial<TelemetryReading>;
  diagnosis: Diagnosis;
  recommendations: Recommendations;
}

export interface ReportDraft {
  report_title: string;
  failure_mode: string;
  symptoms: string;
  root_cause: string;
  corrective_action_taken: string;
  parts_replaced: string[];
  downtime_minutes: number;
  preventive_notes: string;
}

export interface FeedbackLog {
  feedback_id: string;
  recommendation_id: string;
  equipment_id: string;
  submitted_by: string;
  rating: string;
  actual_outcome: string;
  correction_notes: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatCitation {
  name: string;
  type: string;
  title: string;
  snippet?: string;  // First ~220 chars of the retrieved document chunk
}

export interface ChatResponse {
  response: string;
  citations: ChatCitation[];
}

export interface HealthPrediction {
  equipment_id: string;
  equipment_name: string;
  anomaly_score: number;
  health_index: number;
  predicted_rul: string;
  last_reading_time: string;
}

export interface RiskHeatmapItem {
  equipment_id: string;
  equipment_name: string;
  plant_area: string;
  criticality: string;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  breakdown: {
    criticality_score: number;
    historical_avg_delay_mins: number;
    delay_impact_score: number;
    spare_penalty: number;
    shortage_reasons: string[];
  };
}
