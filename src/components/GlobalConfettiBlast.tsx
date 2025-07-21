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
      {children}
    </ConfettiContext.Provider>
  );
};

export default GlobalConfettiBlast; 