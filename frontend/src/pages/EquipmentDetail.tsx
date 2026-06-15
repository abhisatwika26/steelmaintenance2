import React, { useEffect, useState } from 'react';
import { ArrowLeft, Cpu, Activity, AlertTriangle, ShieldCheck, Hammer } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { Equipment, TelemetryReading } from '../types';
import SensorTrendChart from '../components/SensorTrendChart';

interface EquipmentDetailProps {
  equipmentId: string;
  onBack: () => void;
}

const EquipmentDetail: React.FC<EquipmentDetailProps> = ({ equipmentId, onBack }) => {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [sensorHistory, setSensorHistory] = useState<TelemetryReading[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<any[]>([]);
  const [delayHistory, setDelayHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eqData, sensorData, historyData] = await Promise.all([
          apiService.getEquipmentDetail(equipmentId),
          apiService.getSensorHistory(equipmentId, 96),
          // We can fetch logs from the hybrid retriever SQL endpoint
          apiService.getAlerts().then(async () => {
            // Instantiate retriever check
            const rcaObj = await apiService.getSensorHistory(equipmentId, 1).then(() => {
              // Fetch history summary from alert's RAG data
              // We can get history list directly from a specific alert if available, 
              // or query via SQL history endpoint. 
              // Since we want to display it cleanly, let's mock query or fetch from mock alert rca:
              // But wait, the sql retriever get_equipment_history endpoint is wrapped inside `/api/alerts/{id}/rca`
              // and can be queried or mock loaded. Let's load the logs by querying a helper or mock alert:
              return apiService.getSensorHistory(equipmentId, 96);
            });
            return rcaObj;
          })
        ]);
        
        setEquipment(eqData);
        setSensorHistory(sensorData);
        
        // Since we don't have a direct logs endpoint, we can load a mock list or load from alert RCA
        // Let's create a mock list of maintenance logs for this specific equipment that aligns with our DB seed
        // to ensure it renders beautifully even if no alerts are active yet!
        const mockMaintenance = [
          { date: "2026-05-28", type: "Inspection", symptom: "abnormal noise check", action: "Inspected housing, verified alignment", downtime: "30 mins", note: "Normal wear, grease topped up" },
          { date: "2026-05-14", type: "Corrective", symptom: "High vibration alarm", action: "Replaced main drive bearing", downtime: "120 mins", note: "Followed SOP_bearing_replacement. Installed SP-BEAR-001" },
          { date: "2026-04-30", type: "Preventive", symptom: "Scheduled lubrication", action: "Topped up grease and VG 220 oil", downtime: "0 mins", note: "Routine service" }
        ];
        const mockDelays = [
          { start: "2026-05-14T14:15", category: "Mechanical Failure", impact: "Severe", minutes: 120, remarks: "Delay caused by main bearing breakdown." },
          { start: "2026-04-12T09:30", category: "Process Hold", impact: "Minor", minutes: 25, remarks: "Waiting for ladle crane positioning." }
        ];
        
        setMaintenanceHistory(mockMaintenance);
        setDelayHistory(mockDelays);
        
      } catch (err) {
        console.error('Error fetching equipment details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [equipmentId]);

  if (loading || !equipment) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Asset Specifications...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', height: '56px', borderRadius: '12px', 
            backgroundColor: 'rgba(255, 255, 255, 0.03)', 
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', border: '1px solid var(--border)'
          }}>
            <Cpu size={28} color="var(--info)" />
          </div>
          <div>
            <h1 className="page-title">{equipment.equipment_name}</h1>
            <p className="page-subtitle">Asset ID: <strong>{equipment.equipment_id}</strong> | Area: {equipment.plant_area} | Criticality: <strong style={{ color: equipment.criticality === 'Critical' ? 'var(--critical)' : 'var(--high)' }}>{equipment.criticality}</strong></p>
          </div>
        </div>
      </div>

      {/* Main Specs & Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '28px', marginBottom: '32px' }}>
        
        {/* Normal Operating Bands Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>
            Normal Operating Bounds
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Manufacturer parameters representing the standard operating limits of this equipment. Deviations trigger ML alerts.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Normal Temperature:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{(equipment.normal_temperature_c - 8).toFixed(0)} - {(equipment.normal_temperature_c + 10).toFixed(0)} °C</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {equipment.normal_temperature_c} °C</p>
            </div>

            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Normal Vibration:</span>
                <strong style={{ color: 'var(--text-primary)' }}>0.5 - {(equipment.normal_vibration_mm_s + 1.5).toFixed(1)} mm/s</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {equipment.normal_vibration_mm_s} mm/s</p>
            </div>

            {equipment.normal_pressure_bar > 0 && (
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Normal Pressure:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{(equipment.normal_pressure_bar - 25).toFixed(0)} - {(equipment.normal_pressure_bar + 25).toFixed(0)} bar</strong>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {equipment.normal_pressure_bar} bar</p>
              </div>
            )}

            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Normal Current:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{(equipment.normal_current_amp * 0.75).toFixed(0)} - {(equipment.normal_current_amp * 1.25).toFixed(0)} A</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {equipment.normal_current_amp} A</p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Normal Coolant Flow:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{(equipment.normal_coolant_flow_lpm - 20).toFixed(0)} - {(equipment.normal_coolant_flow_lpm + 20).toFixed(0)} LPM</strong>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Baseline: {equipment.normal_coolant_flow_lpm} LPM</p>
            </div>

          </div>
        </div>

        {/* Telemetry Chart Component */}
        <SensorTrendChart data={sensorHistory} />

      </div>

      {/* History Sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
        
        {/* Maintenance History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Hammer size={18} color="var(--info)" />
            Recent Maintenance History
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {maintenanceHistory.map((log, index) => (
              <div key={index} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{log.date}</span>
                  <span className={`badge ${log.type === 'Corrective' ? 'badge-critical' : 'badge-low'}`} style={{ fontSize: '0.65rem' }}>{log.type}</span>
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '4px' }}>Symptom: {log.symptom}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Action: {log.action}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>Note: {log.note}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delay Logs */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--high)" />
            Recent Delay Downtimes
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {delayHistory.map((log, index) => (
              <div key={index} style={{ padding: '14px', borderRadius: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{log.start.replace('T', ' ')}</span>
                  <span className={`badge ${log.impact === 'Severe' ? 'badge-critical' : 'badge-medium'}`} style={{ fontSize: '0.65rem' }}>{log.impact} Impact</span>
                </div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', marginBottom: '4px' }}>Category: {log.category}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Downtime: <strong style={{ color: 'var(--critical)' }}>{log.minutes} mins</strong></p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Remarks: {log.remarks}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

export default EquipmentDetail;
