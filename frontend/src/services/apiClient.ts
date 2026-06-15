import axios from 'axios';
import { 
  Equipment, 
  TelemetryReading, 
  Alert, 
  SparePart, 
  RcaReport, 
  ReportDraft, 
  FeedbackLog, 
  ChatMessage, 
  ChatResponse,
  HealthPrediction,
  RiskHeatmapItem
} from '../types';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


export const apiService = {
  // Equipment endpoints
  getEquipment: async (): Promise<Equipment[]> => {
    const response = await client.get<Equipment[]>('/equipment');
    return response.data;
  },
  
  getEquipmentDetail: async (id: string): Promise<Equipment> => {
    const response = await client.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },
  
  getSensorHistory: async (id: string, limit: number = 96): Promise<TelemetryReading[]> => {
    const response = await client.get<TelemetryReading[]>(`/equipment/${id}/sensors?limit=${limit}`);
    return response.data;
  },

  // Alerts endpoints
  getAlerts: async (): Promise<Alert[]> => {
    const response = await client.get<Alert[]>('/alerts');
    return response.data;
  },
  
  acknowledgeAlert: async (id: number): Promise<{ status: string; message: string }> => {
    const response = await client.post<{ status: string; message: string }>(`/alerts/${id}/acknowledge`);
    return response.data;
  },
  
  getAlertRca: async (id: number): Promise<RcaReport> => {
    const response = await client.get<RcaReport>(`/alerts/${id}/rca`);
    return response.data;
  },

  // Predictions endpoints
  getHealthPredictions: async (): Promise<HealthPrediction[]> => {
    const response = await client.get<HealthPrediction[]>('/predictions/health-index');
    return response.data;
  },
  
  getRiskHeatmap: async (): Promise<RiskHeatmapItem[]> => {
    const response = await client.get<RiskHeatmapItem[]>('/predictions/risk-heatmap');
    return response.data;
  },

  // Spares endpoints
  getSpares: async (): Promise<SparePart[]> => {
    const response = await client.get<SparePart[]>('/spares');
    return response.data;
  },

  // Reports endpoints
  getReportPreview: async (alertId: number): Promise<ReportDraft> => {
    const response = await client.get<ReportDraft>(`/reports/preview/${alertId}`);
    return response.data;
  },
  
  submitLogbookEntry: async (entry: {
    equipment_id: string;
    failure_mode: string;
    symptoms: string;
    root_cause: string;
    action_taken: string;
    parts_replaced: string[];
    downtime_minutes: number;
    technician_notes?: string;
  }): Promise<{ status: string; log_id: string }> => {
    const response = await client.post<{ status: string; log_id: string }>('/reports/logbook', entry);
    return response.data;
  },

  // Feedback endpoints
  submitFeedback: async (feedback: {
    recommendation_id: string;
    equipment_id: string;
    submitted_by: string;
    rating: string;
    actual_outcome: string;
    correction_notes?: string;
  }): Promise<{ status: string; feedback_id: string }> => {
    const response = await client.post<{ status: string; feedback_id: string }>('/feedback', feedback);
    return response.data;
  },
  
  getFeedbackLogs: async (): Promise<FeedbackLog[]> => {
    const response = await client.get<FeedbackLog[]>('/feedback');
    return response.data;
  },

  // Chat/Wizard endpoint
  postChatMessage: async (
    message: string, 
    equipmentId?: string | null, 
    history: ChatMessage[] = []
  ): Promise<ChatResponse> => {
    const response = await client.post<ChatResponse>('/chat', {
      message,
      equipment_id: equipmentId || null,
      history,
    });
    return response.data;
  },
};
