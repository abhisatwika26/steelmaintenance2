import React, { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiClient';
import { FeedbackLog } from '../types';

const FeedbackReview: React.FC = () => {
  const [logs, setLogs] = useState<FeedbackLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const data = await apiService.getFeedbackLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load feedback logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--text-secondary)' }}>Loading Feedback Database...</p>
      </div>
    );
  }

  const getRatingBadge = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'accepted':
        return { label: 'Approved', class: 'badge-low', icon: <ThumbsUp size={12} /> };
      case 'partially_accepted':
        return { label: 'Partially Approved', class: 'badge-medium', icon: <ThumbsUp size={12} /> };
      case 'corrected':
        return { label: 'Correction Added', class: 'badge-high', icon: <ThumbsDown size={12} /> };
      default:
        return { label: rating, class: 'badge-info', icon: null };
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Engineer Feedback & Overrides Logs</h1>
          <p className="page-subtitle">Historical audit trail of operator corrections and ratings on AI maintenance recommendations.</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {logs.length === 0 ? (
          <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <AlertCircle size={24} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <h4>No Feedback Logs Recorded</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Feedback loops are automatically recorded when operators submit reviews on RCA recommendations.</p>
          </div>
        ) : (
          logs.map(log => {
            const badge = getRatingBadge(log.rating);
            
            return (
              <div 
                key={log.feedback_id}
                className="glass-panel"
                style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.02rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      Feedback {log.feedback_id}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asset: <strong>{log.equipment_id}</strong></span>
                    <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                      By: {log.submitted_by.replace('_', ' ')}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Actual Repair Outcome: <strong style={{ color: 'var(--text-primary)' }}>{log.actual_outcome.replace('_', ' ')}</strong>
                  </p>

                  {log.correction_notes && (
                    <div style={{ 
                      fontSize: '0.82rem', 
                      color: 'var(--text-secondary)',
                      background: 'rgba(0,0,0,0.15)',
                      padding: '12px 16px',
                      borderRadius: '6px',
                      marginTop: '12px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'flex-start'
                    }}>
                      <MessageSquare size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span><strong>Engineer Override Notes:</strong> {log.correction_notes}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span className={`badge ${badge.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {badge.icon}
                    {badge.label}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Rec ID: {log.recommendation_id}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeedbackReview;
