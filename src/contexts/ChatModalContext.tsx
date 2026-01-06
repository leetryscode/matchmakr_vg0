'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface ChatModalContextType {
  isAnyChatModalOpen: boolean;
  registerChatModal: (id: string) => void;
  unregisterChatModal: (id: string) => void;
}

const ChatModalContext = createContext<ChatModalContextType | undefined>(undefined);

export function ChatModalProvider({ children }: { children: React.ReactNode }) {
  const [openChatModalIds, setOpenChatModalIds] = useState<Set<string>>(new Set());

  const registerChatModal = useCallback((id: string) => {
    setOpenChatModalIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const unregisterChatModal = useCallback((id: string) => {
    setOpenChatModalIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isAnyChatModalOpen = useMemo(() => openChatModalIds.size > 0, [openChatModalIds.size]);

  const value = useMemo(
    () => ({
      isAnyChatModalOpen,
      registerChatModal,
      unregisterChatModal,
    }),
    [isAnyChatModalOpen, registerChatModal, unregisterChatModal]
  );

  return (
    <ChatModalContext.Provider value={value}>
      {children}
    </ChatModalContext.Provider>
  );
}

export function useChatModal() {
  const context = useContext(ChatModalContext);
  if (context === undefined) {
    throw new Error('useChatModal must be used within a ChatModalProvider');
  }
  return context;
}

