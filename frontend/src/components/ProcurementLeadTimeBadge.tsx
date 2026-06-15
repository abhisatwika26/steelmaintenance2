import React from 'react';
import { Clock } from 'lucide-react';

interface ProcurementLeadTimeBadgeProps {
  days: number;
}

const ProcurementLeadTimeBadge: React.FC<ProcurementLeadTimeBadgeProps> = ({ days }) => {
  let badgeClass = 'badge-low';
  
  if (days >= 14) {
    badgeClass = 'badge-critical';
  } else if (days >= 7) {
    badgeClass = 'badge-high';
  }

  return (
    <span className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <Clock size={12} />
      {days} Days Lead Time
    </span>
  );
};

export default ProcurementLeadTimeBadge;
