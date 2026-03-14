'use client';

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';

export interface OnboardingActions {
  openAuthModal?: (mode?: 'login' | 'register') => void;
  openCreateBookModal?: () => void;
  scrollToBookshelf?: () => void;
}

interface OnboardingListeners {
  onAuthComplete?: () => void;
  onBookCreated?: () => void;
  onAuthModalClosedWithoutSuccess?: () => void;
}

interface OnboardingContextValue {
  actionsRef: React.MutableRefObject<OnboardingActions>;
  listenersRef: React.MutableRefObject<OnboardingListeners>;
  registerActions: (actions: OnboardingActions) => void;
  registerOnAuthComplete: (fn: () => void) => void;
  registerOnBookCreated: (fn: () => void) => void;
  registerOnAuthModalClosedWithoutSuccess: (fn: () => void) => void;
  emitAuthComplete: () => void;
  emitBookCreated: () => void;
  emitAuthModalClosedWithoutSuccess: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function useOnboardingContext() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) return null;
  return ctx;
}

export function OnboardingContextProvider({ children }: { children: ReactNode }) {
  const actionsRef = useRef<OnboardingActions>({});
  const listenersRef = useRef<OnboardingListeners>({});

  const registerActions = useCallback((actions: OnboardingActions) => {
    actionsRef.current = actions;
  }, []);

  const registerOnAuthComplete = useCallback((fn: () => void) => {
    listenersRef.current.onAuthComplete = fn;
  }, []);

  const registerOnBookCreated = useCallback((fn: () => void) => {
    listenersRef.current.onBookCreated = fn;
  }, []);

  const registerOnAuthModalClosedWithoutSuccess = useCallback((fn: () => void) => {
    listenersRef.current.onAuthModalClosedWithoutSuccess = fn;
  }, []);

  const emitAuthComplete = useCallback(() => {
    listenersRef.current.onAuthComplete?.();
  }, []);

  const emitBookCreated = useCallback(() => {
    listenersRef.current.onBookCreated?.();
  }, []);

  const emitAuthModalClosedWithoutSuccess = useCallback(() => {
    listenersRef.current.onAuthModalClosedWithoutSuccess?.();
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        actionsRef,
        listenersRef,
        registerActions,
        registerOnAuthComplete,
        registerOnBookCreated,
        registerOnAuthModalClosedWithoutSuccess,
        emitAuthComplete,
        emitBookCreated,
        emitAuthModalClosedWithoutSuccess,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
