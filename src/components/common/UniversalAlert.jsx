import React from 'react';
import './UniversalAlert.css';

const UniversalAlert = ({ 
  isOpen, 
  type = 'info', // 'success', 'error', 'warning', 'confirm', 'info'
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = 'ठीक आहे',
  cancelText = 'रद्द करा'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'bx-check-circle';
      case 'error':
        return 'bx-error-circle';
      case 'warning':
        return 'bx-error';
      case 'confirm':
        return 'bx-help-circle';
      default:
        return 'bx-info-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#28a745';
      case 'error':
        return '#dc3545';
      case 'warning':
        return '#ffc107';
      case 'confirm':
        return '#ff9933';
      default:
        return '#17a2b8';
    }
  };

  const getHeaderGradient = () => {
    switch (type) {
      case 'success':
        return 'linear-gradient(135deg, #d4edda, #c3e6cb)';
      case 'error':
        return 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
      case 'warning':
        return 'linear-gradient(135deg, #fff3cd, #ffeaa7)';
      case 'confirm':
        return 'linear-gradient(135deg, #fff3cd, #ffeaa7)';
      default:
        return 'linear-gradient(135deg, #d1ecf1, #bee5eb)';
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="universal-alert-overlay" onClick={handleOverlayClick}>
      <div className="universal-alert">
        <div 
          className="universal-alert-icon" 
          style={{ 
            background: getHeaderGradient(),
            color: getIconColor() 
          }}
        >
          <i className={`bx ${getIcon()}`}></i>
        </div>
        
        <div className="universal-alert-content">
          {title && <h3 className="universal-alert-title">{title}</h3>}
          <p className="universal-alert-message">{message}</p>
        </div>
        
        <div className="universal-alert-buttons">
          {type === 'confirm' ? (
            <>
              <button 
                className="universal-alert-btn cancel-btn" 
                onClick={onCancel}
              >
                <i className='bx bx-x'></i>
                {cancelText}
              </button>
              <button 
                className="universal-alert-btn confirm-btn" 
                onClick={onConfirm}
              >
                <i className='bx bx-check'></i>
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              className="universal-alert-btn ok-btn" 
              onClick={onConfirm || onCancel}
              style={{ backgroundColor: getIconColor() }}
            >
              <i className='bx bx-check'></i>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UniversalAlert;
