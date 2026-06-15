import React from 'react';
import { AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { Alert } from '../types';

interface AlertPriorityQueueProps {
  alerts: Alert[];
  onSelectAlert: (id: number) => void;
}

const AlertPriorityQueue: React.FC<AlertPriorityQueueProps> = ({ alerts, onSelectAlert }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'var(--critical)';
      case 'High': return 'var(--high)';
      case 'Medium': return 'var(--medium)';
      case 'Low': return 'var(--low)';
      default: return 'var(--text-muted)';
    }
  };

  // Filter out acknowledged alerts for the priority queue
  const activeAlerts = alerts.filter(a => !a.is_acknowledged);

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          Alerts Priority Queue
        </h3>
        <span className="badge badge-critical" style={{ fontSize: '0.75rem' }}>
          {activeAlerts.length} Active
        </span>
      </div>

      {activeAlerts.length === 0 ? (
        <div style={{ 
          padding: '48px 24px', 
          textAlign: 'center', 
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '50%', 
            backgroundColor: 'var(--low-bg)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Check size={24} color="var(--low)" />
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>All systems normal. No active anomalies.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
          {activeAlerts.map(alert => {
            const color = getRiskColor(alert.risk_level);
            
            return (
              <div 
                key={alert.alert_id}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${color}`,
                  background: 'rgba(255,255,255,0.02)',
                  transition: 'var(--transition)'
                }}
                className="glass-panel-interactive"
                onClick={() => onSelectAlert(alert.alert_id)}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <div style={{ marginTop: '2px' }}>
                    <AlertTriangle size={18} color={color} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {alert.equipment_name}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {alert.timestamp.split('T')[1]?.substring(0, 5) || alert.timestamp}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', lineBreak: 'anywhere' }}>
                      {alert.symptoms}
                    </p>
                    
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`badge ${
                        alert.risk_level === 'Critical' ? 'badge-critical' :
                        alert.risk_level === 'High' ? 'badge-high' : 'badge-medium'
                      }`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                        {alert.risk_level}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Score: <strong>{alert.risk_score.toFixed(1)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>
                  <ChevronRight size={18} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertPriorityQueue;
