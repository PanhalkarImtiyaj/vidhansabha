import { useState } from 'react';

export const useAlert = () => {
  const [alert, setAlert] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'ठीक आहे',
    cancelText: 'रद्द करा'
  });

  // Show different types of alerts
  const showAlert = (type, title, message, onConfirm = null, confirmText = 'ठीक आहे') => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, isOpen: false }))),
      onCancel: () => setAlert(prev => ({ ...prev, isOpen: false })),
      confirmText,
      cancelText: 'रद्द करा'
    });
  };

  // Show confirmation dialog
  const showConfirm = (title, message, onConfirm, confirmText = 'हो', cancelText = 'रद्द करा') => {
    setAlert({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        setAlert(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      },
      onCancel: () => setAlert(prev => ({ ...prev, isOpen: false })),
      confirmText,
      cancelText
    });
  };

  // Convenience methods for different alert types
  const showSuccess = (title, message, onConfirm = null) => {
    showAlert('success', title, message, onConfirm);
  };

  const showError = (title, message, onConfirm = null) => {
    showAlert('error', title, message, onConfirm);
  };

  const showWarning = (title, message, onConfirm = null) => {
    showAlert('warning', title, message, onConfirm);
  };

  const showInfo = (title, message, onConfirm = null) => {
    showAlert('info', title, message, onConfirm);
  };

  // Close alert
  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  return {
    alert,
    showAlert,
    showConfirm,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeAlert
  };
};
