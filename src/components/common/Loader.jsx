import React from 'react';
import './Loader.css';

const Loader = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...', 
  overlay = false,
  className = '' 
}) => {
  const sizeClass = `loader-${size}`;
  const colorClass = `loader-${color}`;

  const loaderContent = (
    <div className={`loader-container ${className}`}>
      <div className={`loader ${sizeClass} ${colorClass}`}>
        <div className="loader-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
      </div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );

  if (overlay) {
    return (
      <div className="loader-overlay">
        {loaderContent}
      </div>
    );
  }

  return loaderContent;
};

export default Loader;
