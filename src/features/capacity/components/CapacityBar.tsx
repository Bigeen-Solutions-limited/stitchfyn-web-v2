import React from 'react';
import { useCapacity } from '../hooks/use-capacity';
import './CapacityBar.css';
import { WarningAmberRounded as WarningIcon } from '@mui/icons-material';

export const CapacityBar: React.FC = () => {
  const { snapshot, isLoading } = useCapacity();

  if (isLoading || !snapshot) {
    return <div className="capacity-bar-skeleton" />;
  }

  const { metrics } = snapshot;
  const isHigh = metrics.utilizationPercentage >= 80;
  const isMax = metrics.utilizationPercentage >= 100;

  return (
    <div className={`capacity-bar-container ${isMax ? 'is-max' : isHigh ? 'is-high' : ''}`}>
      <div className="capacity-bar-header">
        <span className="capacity-bar-label">Workshop Load</span>
        <span className="capacity-bar-value">
          {metrics.usedSlots} / {metrics.totalLimit} slots
        </span>
      </div>
      <div className="capacity-bar-track">
        <div
          className="capacity-bar-fill committed"
          style={{ width: `${(metrics.committedSlots / metrics.totalLimit) * 100}%` }}
        />
        <div
          className="capacity-bar-fill pending"
          style={{
            width: `${(metrics.pendingSlots / metrics.totalLimit) * 100}%`,
            left: `${(metrics.committedSlots / metrics.totalLimit) * 100}%`
          }}
        />
      </div>
      {isMax && (
        <div className="capacity-bar-warning">
          <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} aria-hidden />
          Maximum capacity reached. Owner override required for new orders.
        </div>
      )}
      {!isMax && isHigh && (
        <div className="capacity-bar-warning">
          <WarningIcon sx={{ fontSize: 16, mr: 0.5 }} aria-hidden />
          Workshop is approaching capacity limits.
        </div>
      )}
    </div>
  );
};
