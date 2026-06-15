import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { TelemetryReading } from '../types';

interface SensorTrendChartProps {
  data: TelemetryReading[];
}

const SensorTrendChart: React.FC<SensorTrendChartProps> = ({ data }) => {
  const [activeMetric, setActiveMetric] = useState<string>('temperature');

  // Format data for Recharts
  const chartData = data.map(d => ({
    time: d.timestamp.split('T')[1]?.substring(0, 5) || d.timestamp,
    temperature: d.temperature_c,
    vibration: d.vibration_mm_s,
    pressure: d.pressure_bar,
    current: d.current_amp,
    load: d.operating_load_pct,
    coolant: d.coolant_flow_lpm,
    is_anomaly: d.anomaly_label === 1
  }));

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'temperature': return '#ef4444'; // red
      case 'vibration': return '#f59e0b'; // amber
      case 'pressure': return '#3b82f6'; // blue
      case 'current': return '#a855f7'; // purple
      case 'load': return '#10b981'; // emerald
      case 'coolant': return '#06b6d4'; // cyan
      default: return '#3b82f6';
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'temperature': return 'Temperature (°C)';
      case 'vibration': return 'Vibration (mm/s)';
      case 'pressure': return 'Pressure (bar)';
      case 'current': return 'Current (A)';
      case 'load': return 'Operating Load (%)';
      case 'coolant': return 'Coolant Flow (L/min)';
      default: return metric;
    }
  };

  const buttonStyle = (metric: string) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    border: '1px solid',
    backgroundColor: activeMetric === metric ? `${getMetricColor(metric)}15` : 'rgba(255,255,255,0.02)',
    borderColor: activeMetric === metric ? getMetricColor(metric) : 'var(--border)',
    color: activeMetric === metric ? getMetricColor(metric) : 'var(--text-secondary)',
    transition: 'var(--transition)'
  });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Telemetry Trends</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click metrics below to toggle chart view.</p>
        </div>
        
        {/* Metric Selector Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['temperature', 'vibration', 'pressure', 'current', 'load', 'coolant'].map(m => (
            <button 
              key={m}
              style={buttonStyle(m)}
              onClick={() => setActiveMetric(m)}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: '100%', height: '320px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '16px 8px 4px 4px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis 
              dataKey="time" 
              stroke="var(--text-muted)" 
              fontSize={10} 
              tickLine={false}
              dy={10}
            />
            <YAxis 
              stroke="var(--text-muted)" 
              fontSize={10} 
              tickLine={false} 
              domain={['auto', 'auto']}
              dx={-5}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 13, 20, 0.95)',
                border: '1px solid var(--border-focus)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.85rem'
              }}
              labelStyle={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}
            />
            <Line
              type="monotone"
              dataKey={activeMetric}
              stroke={getMetricColor(activeMetric)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: getMetricColor(activeMetric) }}
              name={getMetricLabel(activeMetric)}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SensorTrendChart;
