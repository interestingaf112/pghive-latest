import React from 'react';

const Logo = ({ fontSize = '22px', className = '' }) => {
  return (
    <div
      className={`logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer'
      }}
    >
      <img
        src="/logo-cropped.png"
        alt="PGhive Logo"
        id="header-logo-img"
        style={{
          height: '32px',
          display: 'block'
        }}
      />
    </div>
  );
};

export default Logo;
