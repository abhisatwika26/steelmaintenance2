import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, Check, BrainCircuit } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { Alert } from '../types';

interface AlertCenterProps {
  onSelectAlert: (id: number) => void;
}

const AlertCenter: React.FC<AlertCenterProps> = ({ onSelectAlert }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('unacknowledged'); // unacknowledged, critical, high, all

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Avoid triggering page routing
    try {
      await apiService.acknowledgeAlert(id);
      // Refresh list
      fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Alerts Queue...</p>
      </div>
    );
  }

  // Filter & Search alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.equipment_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.equipment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.symptoms.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterMode === 'unacknowledged') {
      return !alert.is_acknowledged;
    } else if (filterMode === 'critical') {
      return alert.risk_level === 'Critical' && !alert.is_acknowledged;
    } else if (filterMode === 'high') {
      return (alert.risk_level === 'High' || alert.risk_level === 'Critical') && !alert.is_acknowledged;
    }
    return true; // 'all'
  });

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'var(--critical)';
      case 'High': return 'var(--high)';
      case 'Medium': return 'var(--medium)';
      case 'Low': return 'var(--low)';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Alert Control Center</h1>
          <p className="page-subtitle">Plant-wide dispatch queue showing abnormal sensor signals, risk indices, and diagnostics logs.</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel" style={{ 
        padding: '16px 24px', 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '16px' 
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${filterMode === 'unacknowledged' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('unacknowledged')}
          >
            Active Alerts
          </button>
          <button 
            className={`btn ${filterMode === 'critical' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('critical')}
          >
            Critical Only
          </button>
          <button 
            className={`btn ${filterMode === 'high' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('high')}
          >
            High & Critical
          </button>
          <button 
            className={`btn ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setFilterMode('all')}
          >
            Alert History
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            className="input"
            placeholder="Search by asset or symptom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', width: '100%' }}
          />
        </div>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredAlerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={32} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h4>No Alerts Found</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              All matching assets are operating within normal limits.
            </p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const color = getRiskColor(alert.risk_level);
            
            return (
              <div
                key={alert.alert_id}
                className="glass-panel glass-panel-interactive"
                onClick={() => onSelectAlert(alert.alert_id)}
                style={{
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '24px',
                  opacity: alert.is_acknowledged ? 0.6 : 1,
                  borderLeft: `4px solid ${color}`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {alert.equipment_name}
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({alert.equipment_id})</span>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                      {alert.plant_area}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    <strong>Observed Symptoms:</strong> {alert.symptoms}
                  </p>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>Reported: <strong>{alert.timestamp.replace('T', ' ')}</strong></span>
                    <span>Health Index: <strong style={{ color: color }}>{(alert.health_index * 100).toFixed(0)}%</strong></span>
                    <span>Risk Priority Score: <strong style={{ color: 'var(--text-primary)' }}>{alert.risk_score.toFixed(1)}/3.0</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`badge ${
                    alert.risk_level === 'Critical' ? 'badge-critical' :
                    alert.risk_level === 'High' ? 'badge-high' :
                    alert.risk_level === 'Medium' ? 'badge-medium' : 'badge-low'
                  }`}>
                    {alert.risk_level}
                  </span>
                  
                  {!alert.is_acknowledged && (
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={(e) => handleAcknowledge(e, alert.alert_id)}
                    >
                      <Check size={14} color="var(--low)" />
                      Acknowledge
                    </button>
                  )}
                  
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <BrainCircuit size={14} />
                    Analyze RCA
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AlertCenter;
