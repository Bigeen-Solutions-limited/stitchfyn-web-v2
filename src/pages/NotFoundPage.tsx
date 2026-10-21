import { useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EmailIcon from '@mui/icons-material/Email';
import error404Image from '../assets/error_404.png';
import '../design-system/pages/error.css';
import { BRAND_NAME } from '../config/brand';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="error-page-container">
      <div className="error-visual-pane light">
        <img src={error404Image} alt="Tailor measuring" />
        
        <div style={{ 
          position: 'absolute', 
          top: '24px', 
          left: '24px', 
          background: 'white', 
          padding: '12px 20px', 
          borderRadius: '8px',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 3
        }}>
          <div style={{ width: '12px', height: '8px', background: '#c49a1a', borderRadius: '2px' }}></div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '1px' }}>PRECISION ERROR: 404</span>
        </div>
      </div>

      <div className="error-message-pane">
        <div className="error-code-badge">Structural Inconsistency Detected</div>
        <h1 className="error-title">
          Measure Twice, Cut Once... <span className="highlight">But this page is missing.</span>
        </h1>
        <p className="error-description">
          The page you are looking for might have been moved or doesn't exist. 
          In the {BRAND_NAME} architecture, every thread counts, yet this one 
          seems to have frayed.
        </p>

        <div className="error-actions">
          <button 
            className="error-button primary" 
            onClick={() => navigate('/dashboard')}
          >
            <DashboardIcon />
            Back to Dashboard
          </button>
          <a 
            href="mailto:info@bigeensolutions.com" 
            className="error-button secondary"
          >
            <EmailIcon />
            Contact Admin
          </a>
        </div>

        <div className="error-meta">
          <div className="error-meta-item">
            Error Hash
            <strong>SF-ERR-0404-X</strong>
          </div>
          <div className="error-meta-item" style={{ textAlign: 'right' }}>
            Deployment
            <strong>V2.4.0-Stable</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
