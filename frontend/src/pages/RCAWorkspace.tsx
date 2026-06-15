import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  BrainCircuit, 
  Activity, 
  CheckSquare, 
  ClipboardList, 
  Package, 
  Check, 
  ShieldAlert,
  Download,
  AlertTriangle
} from 'lucide-react';
import { apiService } from '../services/apiClient';
import { RcaReport } from '../types';
import FeedbackWidget from '../components/FeedbackWidget';

interface RCAWorkspaceProps {
  alertId: number | null;
  onBack: () => void;
  onGenerateReport: () => void;
}

const RCAWorkspace: React.FC<RCAWorkspaceProps> = ({ alertId, onBack, onGenerateReport }) => {
  const [report, setReport] = useState<RcaReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (alertId === null) return;
    
    const fetchRca = async () => {
      try {
        setLoading(true);
        const data = await apiService.getAlertRca(alertId);
        setReport(data);
        
        // Reset checklist state
        setCheckedActions({});
      } catch (err) {
        console.error('Error fetching RCA report:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRca();
  }, [alertId]);

  if (alertId === null) {
    return (
      <div className="glass-panel" style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <BrainCircuit size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
        <h3>RCA Diagnostic Workshop</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '450px', margin: '8px auto 24px auto' }}>
          Select an anomalous alert from the Alert Center to trigger the Gemini retrieval and diagnostic reasoning workflow.
        </p>
        <button className="btn btn-primary" onClick={onBack}>
          Go to Alert Center
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '20px' }}>
        <div className="loading-spinner" />
        <h4 style={{ color: 'var(--text-primary)' }}>Running AI Knowledge Retrieval & Reasoner...</h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '380px', textAlign: 'center' }}>
          Querying SQLite databases, scanning vector documentation indices, checking Graph relations, and prompting Gemini.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
        <AlertTriangle size={24} color="var(--critical)" />
        <p style={{ marginTop: '12px' }}>Failed to execute Root Cause Analysis.</p>
        <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={onBack}>
          Go Back
        </button>
      </div>
    );
  }

  const toggleAction = (action: string) => {
    setCheckedActions(prev => ({
      ...prev,
      [action]: !prev[action]
    }));
  };

  const diag = report.diagnosis;
  const recs = report.recommendations;
  const tel = report.telemetry;

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          Back to Alerts
        </button>
        
        <button 
          className="btn btn-primary" 
          onClick={onGenerateReport} 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={16} />
          Create Failure Log
        </button>
      </div>

      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">RCA Diagnostic Workspace</h1>
          <p className="page-subtitle">Gemini-driven Root Cause Analysis and corrective action checklist for <strong>{report.equipment_id}</strong>.</p>
        </div>
      </div>

      {/* Symptoms & Telemetry Values */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--info)" />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature</span>
            <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{tel.temperature_c}°C</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--high)" />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vibration</span>
            <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{tel.vibration_mm_s} mm/s</p>
          </div>
        </div>
        {tel.pressure_bar !== undefined && tel.pressure_bar > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={18} color="var(--info)" />
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pressure</span>
              <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{tel.pressure_bar} bar</p>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--low)" />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current</span>
            <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{tel.current_amp} A</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--info)" />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Operating Load</span>
            <p style={{ fontSize: '0.95rem', fontWeight: '700' }}>{tel.operating_load_pct}%</p>
          </div>
        </div>
      </div>

      {/* Main Two Column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
        
        {/* Left Column: Diagnosis & Evidence */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Fault Diagnosis Card */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <BrainCircuit size={18} color="var(--info)" />
              Diagnosis & Fault Identification
            </h3>
            
            <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <strong style={{ fontSize: '1.05rem', color: 'var(--critical)' }}>{diag.probable_fault}</strong>
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                  Confidence: {(diag.confidence_score * 100).toFixed(0)}%
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
                {diag.root_cause}
              </p>
            </div>
            
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Process Contributor:</strong> {diag.process_defect_contribution}
            </div>
          </div>

          {/* Evidence Citations */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <ClipboardList size={18} color="var(--low)" />
              Retrieved Evidence Citations
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              The diagnosing engine backed up this decision using the following raw manuals, history logs, and SOP chunks:
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {diag.evidence_cited.map((evidence, index) => (
                <span 
                  key={index} 
                  className="badge badge-info"
                  style={{ fontSize: '0.75rem', padding: '6px 12px', textTransform: 'none', cursor: 'pointer' }}
                >
                  {evidence}
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Recommendations & Spares */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* Actions Checklist */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <CheckSquare size={18} color="var(--low)" />
              Corrective Action Checklist
            </h3>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Verify LOTO safety protocols are active before checking off completed operations.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recs.immediate_actions.map((action, idx) => (
                <div 
                  key={idx} 
                  onClick={() => toggleAction(`imm_${idx}`)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    padding: '12px',
                    borderRadius: '6px',
                    background: checkedActions[`imm_${idx}`] ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${checkedActions[`imm_${idx}`] ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`,
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ 
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '4px', 
                    border: '1px solid var(--border-focus)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: checkedActions[`imm_${idx}`] ? 'var(--low)' : 'transparent',
                    marginTop: '2px'
                  }}>
                    {checkedActions[`imm_${idx}`] && <Check size={12} color="#fff" />}
                  </div>
                  <span style={{ 
                    fontSize: '0.85rem', 
                    color: checkedActions[`imm_${idx}`] ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: checkedActions[`imm_${idx}`] ? 'line-through' : 'none'
                  }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Spares Strategy */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <Package size={18} color="var(--high)" />
              Spare Parts Strategy
            </h3>
            
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              background: 'rgba(249, 115, 22, 0.04)', 
              border: '1px solid rgba(249, 115, 22, 0.15)',
              display: 'flex', 
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <ShieldAlert size={20} color="var(--high)" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--high)', display: 'block', marginBottom: '4px' }}>Warehouse Logistics Strategy</strong>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {recs.spare_procurement_strategy}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Feedback Loop Widget */}
        <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
          <FeedbackWidget 
            equipmentId={report.equipment_id} 
            onFeedbackSaved={onBack} 
          />
        </div>

      </div>
    </div>
  );
};

export default RCAWorkspace;
