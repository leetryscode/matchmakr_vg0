'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

type OpenInviteModalFn = () => void;

const InviteSingleModalContext = createContext<{
  openInviteModal: () => void;
  register: (fn: OpenInviteModalFn) => void;
} | null>(null);

export function InviteSingleModalProvider({ children }: { children: React.ReactNode }) {
  const fnRef = useRef<OpenInviteModalFn | null>(null);

  const register = useCallback((fn: OpenInviteModalFn) => {
    fnRef.current = fn;
  }, []);

  const openInviteModal = useCallback(() => {
    fnRef.current?.();
  }, []);

  return (
    <InviteSingleModalContext.Provider value={{ openInviteModal, register }}>
      {children}
    </InviteSingleModalContext.Provider>
  );
}

export function useInviteSingleModal() {
  const ctx = useContext(InviteSingleModalContext);
  return ctx?.openInviteModal ?? null;
}

export function useRegisterInviteSingleModal(openInviteModal: OpenInviteModalFn) {
  const ctx = useContext(InviteSingleModalContext);
  React.useEffect(() => {
    if (ctx) {
      ctx.register(openInviteModal);
      return () => ctx.register(() => {});
    }
  }, [ctx, openInviteModal]);
}
