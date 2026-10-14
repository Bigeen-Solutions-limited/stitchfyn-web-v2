import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTrackingInfo } from '../features/portal/portal.api';
import './styles/TrackingPage.css';

export const TrackingPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['tracking', slug],
    queryFn: () => getTrackingInfo(slug!),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="portal-container">
        <div className="portal-loading">
          <p>Consulting the workshop ledger...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="portal-container">
        <div className="portal-error">
          <div className="portal-error-icon">🔒</div>
          <h2>Tracking Code Not Found</h2>
          <p>Please verify your code or contact the workshop for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <header className="portal-header">
        <img src="/logo-icon.png" alt="StitchFyn" className="portal-logo-icon" />
        <div className="portal-logo">STITCH<span>FYN</span></div>
        <p>Independent Transparency Mirror</p>
      </header>

      <main className="portal-card">
        <div className={`portal-status-badge ${data.currentStatus.toLowerCase() === 'completed' ? 'completed' : ''}`}>
          {data.currentStatus}
        </div>

        <h1 className="portal-greeting">Hello, {data.customerDisplayName}</h1>
        
        <blockquote className="portal-narrative">
          "{data.dignifiedNarrative}"
        </blockquote>

        <div className="portal-timeline">
          {data.progressMilestones.map((milestone) => (
            <div 
              key={milestone.id} 
              className={`portal-timeline-item ${milestone.status.toLowerCase()}`}
            >
              <div className="portal-timeline-marker">
                {milestone.status === 'COMPLETED' && '✓'}
              </div>
              <div className="portal-timeline-content">
                <span className="portal-timeline-name">{milestone.name}</span>
                {milestone.completedAt && (
                  <span className="portal-timeline-date">Completed on {milestone.completedAt}</span>
                )}
                {milestone.status === 'IN_PROGRESS' && (
                  <span className="portal-timeline-date">Currently in progress</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="portal-footer">
        <p>Last synchronization: {data.lastUpdated}</p>
        <p>© 2024 Stitchfyn. Secure. Dignified. Transparent.</p>
      </footer>
    </div>
  );
};
