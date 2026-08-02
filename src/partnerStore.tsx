// Local, ephemeral partner-app UI state not yet backed by the database:
// which decline reason/note was picked, and the before/after photo URIs
// for the job currently in progress. Job status itself lives in Supabase
// (see src/lib/partner.ts) — this store no longer duplicates it.
import React, { createContext, useContext, useMemo, useState } from 'react';

interface PartnerUiState {
  declineReason: string;
  declineNote: string;
  beforePhoto: string | null;
  afterPhoto: string | null;
}

interface PartnerContext extends PartnerUiState {
  setDecline: (reason: string, note: string) => void;
  setBeforePhoto: (uri: string | null) => void;
  setAfterPhoto: (uri: string | null) => void;
  reset: () => void;
}

const initial: PartnerUiState = {
  declineReason: '',
  declineNote: '',
  beforePhoto: null,
  afterPhoto: null,
};

const Ctx = createContext<PartnerContext | null>(null);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PartnerUiState>(initial);

  const value = useMemo<PartnerContext>(
    () => ({
      ...state,
      setDecline: (reason, note) => setState((s) => ({ ...s, declineReason: reason, declineNote: note })),
      setBeforePhoto: (uri) => setState((s) => ({ ...s, beforePhoto: uri })),
      setAfterPhoto: (uri) => setState((s) => ({ ...s, afterPhoto: uri })),
      reset: () => setState(initial),
    }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePartnerJob() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePartnerJob must be used inside <PartnerProvider>');
  return ctx;
}
