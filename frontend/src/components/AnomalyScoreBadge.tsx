import React from 'react';

interface AnomalyScoreBadgeProps {
  score: number;
}

const AnomalyScoreBadge: React.FC<AnomalyScoreBadgeProps> = ({ score }) => {
  let badgeClass = 'badge-low';
  let label = 'Normal';
  
  if (score >= 0.75) {
    badgeClass = 'badge-critical';
    label = 'Critical Anomaly';
  } else if (score >= 0.5) {
    badgeClass = 'badge-high';
    label = 'High Deviation';
  } else if (score >= 0.25) {
    badgeClass = 'badge-medium';
    label = 'Mild Deviation';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {label} ({score.toFixed(2)})
    </span>
  );
};

export default AnomalyScoreBadge;
