import React from 'react';
import './VachanAlert.css';

const VachanAlert = ({ 
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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && onCancel) {
      onCancel();
    }
  };

  return (
    <div className="vachan-alert-overlay" onClick={handleOverlayClick}>
      <div className="vachan-alert">
        <div className="vachan-alert-icon" style={{ color: getIconColor() }}>
          <i className={`bx ${getIcon()}`}></i>
        </div>
        
        <div className="vachan-alert-content">
          {title && <h3 className="vachan-alert-title">{title}</h3>}
          <p className="vachan-alert-message">{message}</p>
        </div>
        
        <div className="vachan-alert-buttons">
          {type === 'confirm' ? (
            <>
              <button 
                className="vachan-alert-btn cancel-btn" 
                onClick={onCancel}
              >
                <i className='bx bx-x'></i>
                {cancelText}
              </button>
              <button 
                className="vachan-alert-btn confirm-btn" 
                onClick={onConfirm}
              >
                <i className='bx bx-check'></i>
                {confirmText}
              </button>
            </>
          ) : (
            <button 
              className="vachan-alert-btn ok-btn" 
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

export default VachanAlert;
