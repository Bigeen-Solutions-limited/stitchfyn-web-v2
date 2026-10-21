import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getGroupProjection, type GroupHealthProjection } from './group-order.api';
import './GroupDashboard.css';
import { CheckCircleRounded as CheckIcon } from '@mui/icons-material';

export const GroupCoordinatorDashboard: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [projection, setProjection] = useState<GroupHealthProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setLoading(true);
      getGroupProjection(token)
        .then(setProjection)
        .catch((err) => {
          console.error(err);
          setError("Unable to load group dashboard. Please check your link.");
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Resolving Group Health...</p></div>;
  if (error || !projection) return <div className="error-container"><h1>404</h1><p>{error || "Dashboard not found"}</p></div>;

  const { metadata, aggregatedHealth, memberDetails } = projection;

  return (
    <div className="group-dashboard-root">
      <header className="group-header">
        <div className="header-content">
          <h1>{metadata.groupName}</h1>
          <p className="event-date">Event Date: {new Date(metadata.eventDate).toLocaleDateString()}</p>
        </div>
        <div className={`risk-badge large risk-${aggregatedHealth.collectiveRiskLevel.toLowerCase()}`}>
          {aggregatedHealth.collectiveRiskLevel.replace('_', ' ')}
        </div>
      </header>

      <main className="group-content">
        <section className="stats-grid">
          <div className="stat-card glass">
            <label>Group Progress</label>
            <div className="progress-bar-container">
              <div 
                className="progress-fill" 
                style={{ width: `${aggregatedHealth.collectiveProgressPercent}%` }}
              ></div>
              <span className="progress-text">{aggregatedHealth.collectiveProgressPercent}%</span>
            </div>
          </div>
          <div className="stat-card glass">
            <label>Total Members</label>
            <span className="stat-value">{aggregatedHealth.totalMemberCount}</span>
          </div>
          <div className="stat-card glass">
            <label>Ready for Collection</label>
            <span className="stat-value">{aggregatedHealth.completedMemberCount}</span>
          </div>
          <div className="stat-card glass">
            <label>At Risk</label>
            <span className={`stat-value ${aggregatedHealth.atRiskMemberCount > 0 ? 'text-danger' : ''}`}>
              {aggregatedHealth.atRiskMemberCount}
            </span>
          </div>
        </section>

        <section className="member-list-section">
          <h2>Member Garment Status</h2>
          <div className="member-table-container glass">
            <table className="member-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Current Stage</th>
                  <th>Risk</th>
                  <th>Verification</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {memberDetails.map((member) => (
                  <tr key={member.orderId}>
                    <td>
                      <div className="member-info">
                        <span className="member-name">{member.memberName}</span>
                        <span className="order-id">#{member.orderId.slice(-6)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="stage-pill">{member.displayStage}</span>
                    </td>
                    <td>
                      <span className={`risk-pill risk-${member.riskLevel.toLowerCase()}`}>
                        {member.riskLevel}
                      </span>
                    </td>
                    <td>
                      <div className="verification-stack">
                        {member.pendingVerifications.length === 0 ? (
                          <span className="verified-check"><CheckIcon sx={{ fontSize: 14, verticalAlign: '-2px', mr: 0.5 }} />Fully Verified</span>
                        ) : (
                          member.pendingVerifications.map(flag => (
                            <span key={flag} className="pending-flag">Pending {flag}</span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="mini-progress">
                        <div className="mini-progress-bar">
                          <div 
                            className="mini-progress-fill" 
                            style={{ width: `${member.completionPercentage}%` }}
                          ></div>
                        </div>
                        <span className="percent-text">{member.completionPercentage}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="group-footer">
        <p>Protected by StitchFlow Truth Protocol</p>
        <span className="token-ref">Ref: {metadata.groupToken}</span>
      </footer>
    </div>
  );
};
