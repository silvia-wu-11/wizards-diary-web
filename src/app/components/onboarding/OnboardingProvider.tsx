'use client';

import { useOnboarding } from './useOnboarding';
import { OnboardingOverlay } from './OnboardingOverlay';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { visible, step, onNext, onCancel, isSessionReady } = useOnboarding();

  return (
    <>
      {children}
      {isSessionReady && (
        <OnboardingOverlay
          visible={visible}
          step={step}
          onNext={onNext}
          onCancel={onCancel}
        />
      )}
    </>
  );
}
