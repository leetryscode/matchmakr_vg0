"use client";
import React, { useState, createContext, useContext } from 'react';
import ConfettiBlast from './ConfettiBlast';

interface ConfettiContextType {
  triggerConfetti: () => void;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (!context) {
    throw new Error('useConfetti must be used within a GlobalConfettiBlast');
  }
  return context;
};

interface GlobalConfettiBlastProps {
  children: React.ReactNode;
}

const GlobalConfettiBlast: React.FC<GlobalConfettiBlastProps> = ({ children }) => {
  const [showMatchAnimation, setShowMatchAnimation] = useState(false);
  
  const triggerConfetti = () => {
    setShowMatchAnimation(true);
  };

  return (
    <ConfettiContext.Provider value={{ triggerConfetti }}>
      {/* Full-page ConfettiBlast overlay */}
      <ConfettiBlast
        isActive={showMatchAnimation}
        onComplete={() => setShowMatchAnimation(false)}
        width="100vw"
        height="100vh"
        style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 10001, pointerEvents: 'none' }}
      />
      {/* Temporary test button */}
      <button
        style={{
          position: 'fixed',
          bottom: 88,
          right: 20,
          zIndex: 10000,
          background: 'linear-gradient(90deg, #0066FF, #00C9A7)',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          opacity: 0.5,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        onClick={triggerConfetti}
        aria-label="Trigger confetti animation"
      >
        <span role="img" aria-label="Confetti">🎉</span>
      </button>
      {children}
    </ConfettiContext.Provider>
  );
};

export default GlobalConfettiBlast; 