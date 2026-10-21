import React from 'react';
import './CapacityBlockingModal.css';
import { BRAND_NAME } from '../../../config/brand';
import { Block as BlockIcon } from '@mui/icons-material';

interface CapacityBlockingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverride?: () => void;
  metrics?: {
    usedSlots: number;
    totalLimit: number;
  };
}

export const CapacityBlockingModal: React.FC<CapacityBlockingModalProps> = ({ 
  isOpen, 
  onClose, 
  onOverride,
  metrics 
}) => {
  if (!isOpen) return null;

  const declineMessage = "Thank you for reaching out! Our workshop is currently at full capacity to ensure the highest quality for our existing orders. We'll be happy to take new bookings starting [Insert Date]. Thank you for your understanding!";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(declineMessage);
    alert('Message copied to clipboard');
  };

  return (
    <div className="capacity-modal-overlay">
      <div className="capacity-modal-content">
        <div className="capacity-modal-header">
          <div className="capacity-modal-icon"><BlockIcon sx={{ fontSize: 'inherit', color: 'inherit' }} /></div>
          <h2>Workshop at Capacity</h2>
        </div>
        
        <div className="capacity-modal-body">
          <p>
            You have reached your limit of <strong>{metrics?.totalLimit} slots</strong>. 
            To maintain the {BRAND_NAME} quality standard, new orders are currently blocked.
          </p>
          
          <div className="decline-message-box">
            <label>Polite Decline Message:</label>
            <div className="message-content">{declineMessage}</div>
            <button className="copy-btn" onClick={copyToClipboard}>
              Copy Message
            </button>
          </div>
        </div>

        <div className="capacity-modal-actions">
          <button className="btn-secondary" onClick={onClose}>
            Back to Dashboard
          </button>
          {onOverride && (
            <button className="btn-primary override-btn" onClick={onOverride}>
              Owner Override
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
