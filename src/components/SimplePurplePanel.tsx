import React from 'react';

const SimplePurplePanel: React.FC = () => {
  return (
    <div 
      style={{
        position: 'fixed',
        right: 0,
        top: 0,
        width: '250px',
        height: '100vh',
        backgroundColor: 'purple',
        zIndex: 1000,
        padding: '20px',
        color: 'white'
      }}
    >
      <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Edit Tools</h3>
      <button 
        style={{ 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '5px',
          color: 'white',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Lasso Tool
      </button>
    </div>
  );
};

export default SimplePurplePanel;