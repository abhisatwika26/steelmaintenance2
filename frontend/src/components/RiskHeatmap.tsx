import React from 'react';
import { AlertCircle, AlertOctagon, HelpCircle } from 'lucide-react';
import { RiskHeatmapItem } from '../types';

interface RiskHeatmapProps {
  data: RiskHeatmapItem[];
  onSelectEquipment: (id: string) => void;
}

const RiskHeatmap: React.FC<RiskHeatmapProps> = ({ data, onSelectEquipment }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'var(--critical)';
      case 'High': return 'var(--high)';
      case 'Medium': return 'var(--medium)';
      case 'Low': return 'var(--low)';
      default: return 'var(--text-muted)';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'Critical': return 'var(--critical-bg)';
      case 'High': return 'var(--high-bg)';
      case 'Medium': return 'var(--medium-bg)';
      case 'Low': return 'var(--low-bg)';
      default: return 'rgba(255,255,255,0.02)';
    }
  };

  const getRiskBorder = (level: string) => {
    switch (level) {
      case 'Critical': return 'var(--critical-border)';
      case 'High': return 'var(--high-border)';
      case 'Medium': return 'var(--medium-border)';
      case 'Low': return 'var(--low-border)';
      default: return 'var(--border)';
    }
  };

  // Group equipment by plant area
  const areas = Array.from(new Set(data.map(item => item.plant_area)));

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
        Plant-Wide Risk Distribution Heatmap
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Urgency prioritizations mapped by combining sensor anomaly levels, asset criticality, historical delay downtime, and spare parts stock availability.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {areas.map(area => {
          const areaItems = data.filter(item => item.plant_area === area);
          
          return (
            <div key={area} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {area}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {areaItems.map(item => {
                  const color = getRiskColor(item.risk_level);
                  
                  return (
                    <div
                      key={item.equipment_id}
                      onClick={() => onSelectEquipment(item.equipment_id)}
                      style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: getRiskBg(item.risk_level),
                        border: `1px solid ${getRiskBorder(item.risk_level)}`,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'var(--transition)'
                      }}
                      className="glass-panel-interactive"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {item.equipment_name}
                        </span>
                        {item.risk_level === 'Critical' ? (
                          <AlertOctagon size={16} color={color} />
                        ) : item.risk_level === 'High' ? (
                          <AlertCircle size={16} color={color} />
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Score: <strong>{item.risk_score.toFixed(1)}/3.0</strong></span>
                        <span style={{ 
                          color, 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          fontSize: '0.75rem',
                          letterSpacing: '0.02em'
                        }}>
                          {item.risk_level}
                        </span>
                      </div>
                      
                      {/* Show tiny warning if spares are out of stock */}
                      {item.breakdown.spare_penalty > 0 && (
                        <div style={{ 
                          fontSize: '0.7rem', 
                          color: item.breakdown.spare_penalty === 1.0 ? 'var(--critical)' : 'var(--medium)',
                          background: 'rgba(0,0,0,0.15)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>⚠️ Spares Shortage: {item.breakdown.shortage_reasons[0]}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskHeatmap;
