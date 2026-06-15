import React from 'react';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { Equipment, HealthPrediction } from '../types';

interface EquipmentStatusGridProps {
  equipment: Equipment[];
  predictions: HealthPrediction[];
  onSelectEquipment: (id: string) => void;
}

const EquipmentStatusGrid: React.FC<EquipmentStatusGridProps> = ({ 
  equipment, 
  predictions, 
  onSelectEquipment 
}) => {
  
  const getHealthData = (eqId: string) => {
    return predictions.find(p => p.equipment_id === eqId) || {
      health_index: 1.0,
      anomaly_score: 0.0,
      predicted_rul: "Normal (30+ days)"
    };
  };

  const getStatusDetails = (healthIndex: number, anomalyScore: number) => {
    if (anomalyScore >= 0.75 || healthIndex <= 0.25) {
      return { label: 'Anomaly Detected', color: 'var(--critical)', class: 'pulse-critical' };
    } else if (anomalyScore >= 0.5 || healthIndex <= 0.5) {
      return { label: 'High Deviation', color: 'var(--high)', class: 'pulse-high' };
    } else if (anomalyScore >= 0.25 || healthIndex <= 0.75) {
      return { label: 'Mild Deviation', color: 'var(--medium)', class: '' };
    }
    return { label: 'Normal / Healthy', color: 'var(--low)', class: '' };
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
      {equipment.map(eq => {
        const health = getHealthData(eq.equipment_id);
        const status = getStatusDetails(health.health_index, health.anomaly_score);
        
        return (
          <div 
            key={eq.equipment_id}
            className="glass-panel glass-panel-interactive"
            onClick={() => onSelectEquipment(eq.equipment_id)}
            style={{ 
              padding: '24px', 
              position: 'relative',
              overflow: 'hidden',
              boxShadow: health.anomaly_score >= 0.5 ? `0 4px 25px rgba(239, 68, 68, 0.05)` : 'none'
            }}
          >
            {/* Status light top right */}
            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span 
                className={status.class}
                style={{ 
                  width: '10px', 
                  height: '10px', 
                  borderRadius: '50%', 
                  backgroundColor: status.color,
                  display: 'inline-block' 
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(255, 255, 255, 0.03)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '1px solid var(--border)'
              }}>
                <Cpu size={20} color={status.color} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {eq.equipment_name}
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{eq.equipment_id}</p>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Area: <strong style={{ color: 'var(--text-primary)' }}>{eq.plant_area}</strong>
            </p>

            {/* Health Index Bar */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Operating Health</span>
                <strong style={{ color: status.color }}>{(health.health_index * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${health.health_index * 100}%`, 
                  height: '100%', 
                  backgroundColor: status.color,
                  transition: 'width 0.5s ease-out'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <span className={`badge ${
                eq.criticality === 'Critical' ? 'badge-critical' : 
                eq.criticality === 'High' ? 'badge-high' : 'badge-medium'
              }`}>
                {eq.criticality}
              </span>
              
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                RUL: <strong style={{ color: 'var(--text-primary)' }}>{health.predicted_rul}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EquipmentStatusGrid;
