import React, { useState } from 'react';
import { ThumbsUp, CheckSquare, Save, CheckCircle2 } from 'lucide-react';
import { apiService } from '../services/apiClient';

interface FeedbackWidgetProps {
  equipmentId: string;
  onFeedbackSaved: () => void;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ equipmentId, onFeedbackSaved }) => {
  const [rating, setRating] = useState<string>('accepted');
  const [outcome, setOutcome] = useState<string>('issue_resolved');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccess(false);

    try {
      await apiService.submitFeedback({
        recommendation_id: `REC-ACT-${Math.floor(Math.random() * 10000)}`,
        equipment_id: equipmentId,
        submitted_by: 'reliability_engineer',
        rating,
        actual_outcome: outcome,
        correction_notes: notes
      });
      setSuccess(true);
      setNotes('');
      setTimeout(() => {
        setSuccess(false);
        onFeedbackSaved();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
        <ThumbsUp size={18} color="var(--info)" />
        Log Operator Outcome & Feedback
      </h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
        Record the actual resolution of this repair. Your feedback is saved to improve future LLM recommendations.
      </p>

      {success ? (
        <div style={{ 
          padding: '16px', 
          borderRadius: '8px', 
          background: 'var(--low-bg)', 
          border: '1px solid var(--low-border)',
          color: 'var(--low)',
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px'
        }}>
          <CheckCircle2 size={20} />
          <strong style={{ fontSize: '0.88rem' }}>Outcome logged successfully!</strong>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>AI Recommendation Accuracy:</label>
              <select 
                value={rating} 
                onChange={(e) => setRating(e.target.value)}
                className="input"
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <option value="accepted">Approved (Accurate diagnosis & action)</option>
                <option value="partially_accepted">Partially Approved (Needed minor tweaks)</option>
                <option value="corrected">Correction Added (Incorrect diagnosis/action)</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Physical Repair Outcome:</label>
              <select 
                value={outcome} 
                onChange={(e) => setOutcome(e.target.value)}
                className="input"
                style={{ fontSize: '0.82rem', padding: '8px 12px' }}
              >
                <option value="issue_resolved">Issue Resolved (Asset running normally)</option>
                <option value="monitoring_required">Monitoring Required (Partial restoration)</option>
                <option value="repeat_inspection_needed">Repeat Inspection Needed (Ongoing anomaly)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Operator Correction Notes (Optional):</label>
            <input 
              type="text" 
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared coupling misalignment which resolved the remaining high vibration..."
              style={{ fontSize: '0.82rem', padding: '10px' }}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              disabled={submitting}
            >
              <Save size={14} />
              {submitting ? 'Saving Outcome...' : 'Save outcome'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};

export default FeedbackWidget;
