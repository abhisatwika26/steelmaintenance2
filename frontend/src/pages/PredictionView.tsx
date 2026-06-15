import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { HealthPrediction } from '../types';

interface PredictionViewProps {
  onSelectEquipment: (id: string) => void;
}

const PredictionView: React.FC<PredictionViewProps> = ({ onSelectEquipment }) => {
  const [predictions, setPredictions] = useState<HealthPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const data = await apiService.getHealthPredictions();
        setPredictions(data);
      } catch (err) {
        console.error('Error fetching health predictions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Querying ML Forecasts...</p>
      </div>
    );
  }

  const getStatusColor = (health: number) => {
    if (health <= 0.25) return 'var(--critical)';
    if (health <= 0.50) return 'var(--high)';
    if (health <= 0.75) return 'var(--medium)';
    return 'var(--low)';
  };

  const getStatusLabel = (health: number) => {
    if (health <= 0.25) return 'Critical Failure Risk';
    if (health <= 0.50) return 'High Degradation';
    if (health <= 0.75) return 'Mild Deviation';
    return 'Healthy / Steady State';
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Predictive Maintenance & RUL Room</h1>
          <p className="page-subtitle">Isolation Forest health index projections and remaining useful life forecasts across plant assets.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {predictions.map(pred => {
          const color = getStatusColor(pred.health_index);
          
          return (
            <div
              key={pred.equipment_id}
              className="glass-panel glass-panel-interactive"
              onClick={() => onSelectEquipment(pred.equipment_id)}
              style={{
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                borderLeft: `4px solid ${color}`
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '42px', height: '42px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Cpu size={20} color={color} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {pred.equipment_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({pred.equipment_id})</span>
                    <span className="badge" style={{ 
                      fontSize: '0.65rem', 
                      padding: '2px 8px',
                      color, 
                      background: `${color}10`,
                      border: `1px solid ${color}25`
                    }}>
                      {getStatusLabel(pred.health_index)}
                    </span>
                  </div>
                  
                  {/* Mini health bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '150px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${pred.health_index * 100}%`, height: '100%', background: color }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Health: <strong>{(pred.health_index * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* RUL prediction */}
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Remaining Useful Life (RUL)
                  </span>
                  <strong style={{ 
                    fontSize: '1rem', 
                    color: pred.predicted_rul.includes('Immediate') ? 'var(--critical)' : 'var(--text-primary)',
                    fontWeight: '700' 
                  }}>
                    {pred.predicted_rul}
                  </strong>
                </div>
                
                <div style={{ color: 'var(--text-muted)' }}>
                  <ArrowRight size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PredictionView;
