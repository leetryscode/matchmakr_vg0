"use client";
import React, { useState } from 'react';
import ConfettiBlast from './ConfettiBlast';

interface GlobalConfettiBlastProps {
  children: React.ReactNode;
}

const GlobalConfettiBlast: React.FC<GlobalConfettiBlastProps> = ({ children }) => {
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  return (
    <>
      {/* Full-page ConfettiBlast overlay */}
      <ConfettiBlast
        isActive={showMatchAnimation}
        onComplete={() => setShowMatchAnimation(false)}
        width="100vw"
        height="100vh"
        style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}
      />
      {/* Temporary test button */}
      <button
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          zIndex: 10000,
          background: 'linear-gradient(90deg, #0066FF, #00C9A7)',
          color: '#fff',
          border: 'none',
          borderRadius: 9999,
          padding: '16px 28px',
          fontWeight: 700,
          fontSize: 18,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          cursor: 'pointer',
        }}
        onClick={() => setShowMatchAnimation(true)}
      >
        Do Animation
      </button>
      {children}
    </>
  );
};

export default GlobalConfettiBlast; 