import React, { useEffect, useState } from 'react';
import { FileText, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { Alert, ReportDraft } from '../types';

interface ReportsLogbookProps {
  preselectedAlertId: number | null;
  onClearPreselect?: () => void;
}

const ReportsLogbook: React.FC<ReportsLogbookProps> = ({ 
  preselectedAlertId,
  onClearPreselect 
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string>(preselectedAlertId?.toString() || '');
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [loadingDraft, setLoadingDraft] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form states
  const [title, setTitle] = useState('');
  const [failureMode, setFailureMode] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [partsText, setPartsText] = useState('');
  const [downtime, setDowntime] = useState(0);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setLoadingAlerts(true);
        const data = await apiService.getAlerts();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      } finally {
        setLoadingAlerts(false);
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (!selectedAlertId) {
      setDraft(null);
      return;
    }

    const loadDraft = async () => {
      try {
        setLoadingDraft(true);
        setSuccessMsg('');
        const data = await apiService.getReportPreview(parseInt(selectedAlertId));
        setDraft(data);
        
        // Populate form
        setTitle(data.report_title);
        setFailureMode(data.failure_mode);
        setSymptoms(data.symptoms);
        setRootCause(data.root_cause);
        setActionTaken(data.corrective_action_taken);
        setPartsText(data.parts_replaced.join('; '));
        setDowntime(data.downtime_minutes);
        setNotes(data.preventive_notes);
      } catch (err) {
        console.error('Failed to load report draft:', err);
      } finally {
        setLoadingDraft(false);
      }
    };
    loadDraft();
  }, [selectedAlertId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertId || submitting) return;

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const activeAlertObj = alerts.find(a => a.alert_id === parseInt(selectedAlertId));
      if (!activeAlertObj) return;

      const payload = {
        equipment_id: activeAlertObj.equipment_id,
        failure_mode: failureMode,
        symptoms: symptoms,
        root_cause: rootCause,
        action_taken: actionTaken,
        parts_replaced: partsText.split(';').map(p => p.trim()).filter(Boolean),
        downtime_minutes: downtime,
        technician_notes: notes
      };

      const result = await apiService.submitLogbookEntry(payload);
      
      // Auto acknowledge alert upon report save
      await apiService.acknowledgeAlert(parseInt(selectedAlertId));
      
      setSuccessMsg(`Logbook recorded successfully! Log ID: ${result.log_id}`);
      
      // Clear forms
      setDraft(null);
      setSelectedAlertId('');
      if (onClearPreselect) onClearPreselect();
    } catch (err) {
      console.error('Failed to submit logbook:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Digital MRO Logbook Room</h1>
          <p className="page-subtitle">Submit corrective repair actions and close active plant alert cards in SQLite.</p>
        </div>
      </div>

      {/* Select Alert Dropdown */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <label style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Select Active Alert to Generate Log:
        </label>
        <select
          value={selectedAlertId}
          onChange={(e) => setSelectedAlertId(e.target.value)}
          className="input"
          style={{ width: '100%', padding: '12px' }}
          disabled={loadingAlerts}
        >
          <option value="">-- Choose active plant alert --</option>
          {alerts.filter(a => !a.is_acknowledged).map(a => (
            <option key={a.alert_id} value={a.alert_id}>
              [{a.risk_level}] {a.equipment_id} - {a.equipment_name} ({a.timestamp})
            </option>
          ))}
        </select>
      </div>

      {successMsg && (
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          background: 'var(--low-bg)', 
          border: '1px solid var(--low-border)',
          color: 'var(--low)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          <CheckCircle2 size={20} />
          <strong style={{ fontSize: '0.9rem' }}>{successMsg}</strong>
        </div>
      )}

      {loadingDraft && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '30vh', flexDirection: 'column', gap: '12px' }}>
          <div className="loading-spinner" style={{ width: '28px', height: '28px', borderWidth: '2px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Drafting failure report log with Gemini...</p>
        </div>
      )}

      {/* Form Editor */}
      {!loadingDraft && draft && (
        <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="var(--info)" />
            Report Draft Editor
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Log report Title</label>
            <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Suspected failure mode</label>
              <input type="text" className="input" value={failureMode} onChange={(e) => setFailureMode(e.target.value)} required />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Downtime Duration (minutes)</label>
              <input type="number" className="input" value={downtime} onChange={(e) => setDowntime(parseInt(e.target.value) || 0)} required />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Observed symptoms</label>
            <textarea className="input" rows={2} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} required style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Root cause analysis</label>
            <textarea className="input" rows={3} value={rootCause} onChange={(e) => setRootCause(e.target.value)} required style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Corrective action executed</label>
            <textarea className="input" rows={2} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} required style={{ resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Parts replaced (semicolon-separated spare IDs)</label>
            <input type="text" className="input" value={partsText} onChange={(e) => setPartsText(e.target.value)} placeholder="e.g. SP-BEAR-001; SP-GREASE-001" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Lessons learned & preventive notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: 'vertical' }} />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} disabled={submitting}>
              <Save size={16} />
              {submitting ? 'Recording Log...' : 'Approve & Save to Logbook'}
            </button>
          </div>
        </form>
      )}

      {!selectedAlertId && !successMsg && (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <AlertCircle size={24} style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '0.85rem' }}>Select an active alert dropdown above to edit and log its MRO action entry.</p>
        </div>
      )}

    </div>
  );
};

export default ReportsLogbook;
