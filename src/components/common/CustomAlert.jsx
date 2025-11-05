import React from 'react';
import './CustomAlert.css';

const CustomAlert = ({ isOpen, message, onConfirm, onCancel, type = 'confirm' }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-overlay">
      <div className="custom-alert">
        <div className="alert-icon">
          <i className='bx bx-log-out'></i>
        </div>
        
        <div className="alert-content">
          <h3>लॉगआउट पुष्टीकरण</h3>
          <p>{message}</p>
        </div>
        
        <div className="alert-buttons">
          <button className="alert-btn cancel-btn" onClick={onCancel}>
            <i className='bx bx-x'></i>
            रद्द करा
          </button>
          <button className="alert-btn confirm-btn" onClick={onConfirm}>
            <i className='bx bx-check'></i>
            हो, लॉगआउट करा
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
