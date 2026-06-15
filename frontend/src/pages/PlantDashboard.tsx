import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, AlertOctagon, Wrench } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { Equipment, Alert, HealthPrediction, RiskHeatmapItem } from '../types';

import EquipmentStatusGrid from '../components/EquipmentStatusGrid';
import AlertPriorityQueue from '../components/AlertPriorityQueue';
import RiskHeatmap from '../components/RiskHeatmap';

interface PlantDashboardProps {
  onSelectEquipment: (id: string) => void;
  onSelectAlert: (id: number) => void;
}

const PlantDashboard: React.FC<PlantDashboardProps> = ({ 
  onSelectEquipment, 
  onSelectAlert 
}) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [predictions, setPredictions] = useState<HealthPrediction[]>([]);
  const [heatmap, setHeatmap] = useState<RiskHeatmapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sparesAlertCount, setSparesAlertCount] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eqData, alertData, predData, heatData, sparesData] = await Promise.all([
          apiService.getEquipment(),
          apiService.getAlerts(),
          apiService.getHealthPredictions(),
          apiService.getRiskHeatmap(),
          apiService.getSpares()
        ]);
        
        setEquipment(eqData);
        setAlerts(alertData);
        setPredictions(predData);
        setHeatmap(heatData);
        
        // Count spares low or out of stock
        const lowSpares = sparesData.filter(s => s.stock_quantity < s.minimum_required_stock).length;
        setSparesAlertCount(lowSpares);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Plant Cockpit Operations...</p>
      </div>
    );
  }

  // Calculate stats
  const activeAlerts = alerts.filter(a => !a.is_acknowledged);
  const criticalAlerts = activeAlerts.filter(a => a.risk_level === 'Critical').length;
  const avgHealth = predictions.length > 0
    ? predictions.reduce((acc, curr) => acc + curr.health_index, 0) / predictions.length
    : 1.0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">MRO Operations Cockpit</h1>
          <p className="page-subtitle">Real-time status overview of continuous casting, rolling mills, and auxiliary assets.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '8px', 
            backgroundColor: activeAlerts.length > 0 ? 'var(--critical-bg)' : 'var(--low-bg)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${activeAlerts.length > 0 ? 'var(--critical-border)' : 'var(--low-border)'}`
          }}>
            <ShieldAlert size={24} color={activeAlerts.length > 0 ? 'var(--critical)' : 'var(--low)'} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Unresolved Alerts
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '2px' }}>
              {activeAlerts.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '400' }}>({criticalAlerts} Critical)</span>
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '8px', 
            backgroundColor: avgHealth > 0.85 ? 'var(--low-bg)' : 'var(--medium-bg)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${avgHealth > 0.85 ? 'var(--low-border)' : 'var(--medium-border)'}`
          }}>
            <Activity size={24} color={avgHealth > 0.85 ? 'var(--low)' : 'var(--medium)'} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Plant Health Index
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '2px' }}>
              {(avgHealth * 100).toFixed(1)}%
            </h3>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: '8px', 
            backgroundColor: sparesAlertCount > 0 ? 'var(--high-bg)' : 'var(--low-bg)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${sparesAlertCount > 0 ? 'var(--high-border)' : 'var(--low-border)'}`
          }}>
            <Wrench size={24} color={sparesAlertCount > 0 ? 'var(--high)' : 'var(--low)'} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Warehouse Spares Alert
            </span>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '2px' }}>
              {sparesAlertCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '400' }}>below min</span>
            </h3>
          </div>
        </div>

      </div>

      {/* Main Section: Left Status Grid, Right Priority Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px', marginBottom: '32px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Equipment Health Status Grid
          </h3>
          <EquipmentStatusGrid 
            equipment={equipment} 
            predictions={predictions} 
            onSelectEquipment={onSelectEquipment} 
          />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Urgency Dispatch
          </h3>
          <AlertPriorityQueue 
            alerts={alerts} 
            onSelectAlert={onSelectAlert} 
          />
        </div>
      </div>

      {/* Heatmap Section */}
      <div style={{ marginTop: '40px' }}>
        <RiskHeatmap 
          data={heatmap} 
          onSelectEquipment={onSelectEquipment} 
        />
      </div>
    </div>
  );
};

export default PlantDashboard;
