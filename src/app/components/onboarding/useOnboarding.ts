'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useOnboardingContext } from './OnboardingContext';

const STORAGE_KEY = 'wizards-diary-onboarding-completed';
const STEP2_DELAY_MS = 1500;
const STEP3_DELAY_MS = 1000;

export type OnboardingStep = 1 | 2 | 3;

function scrollToBookshelf() {
  const el = document.getElementById('bookshelf') ?? document.querySelector('[data-onboarding-target="bookshelf"]');
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function useOnboarding() {
  const { data: session, status } = useSession();
  const ctx = useOnboardingContext();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(1);
  const stepRef = useRef(step);
  const step2ShownRef = useRef(false);
  stepRef.current = step;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed === 'true') return;

    if (status === 'loading') return;

    setVisible(true);
    setStep(session ? 2 : 1);
    if (session) step2ShownRef.current = true;
  }, [session, status]);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionToStep2 = useCallback(() => {
    setVisible(false);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
      scrollToBookshelf();
      ctx?.actionsRef.current?.scrollToBookshelf?.();
      setStep(2);
      step2ShownRef.current = true;
      setVisible(true);
    }, STEP2_DELAY_MS);
  }, [ctx]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const onNext = useCallback(() => {
    if (step === 1) {
      setVisible(false);
      ctx?.actionsRef.current?.openAuthModal?.('register');
    } else if (step === 2) {
      ctx?.actionsRef.current?.openCreateBookModal?.();
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
    }
  }, [step, ctx]);

  const onCancel = useCallback(() => {
    if (step === 1) {
      transitionToStep2();
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      setVisible(false);
    }
  }, [step, transitionToStep2]);

  useEffect(() => {
    if (!ctx) return;
    ctx.registerOnAuthComplete(() => {
      setVisible(false);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        transitionTimerRef.current = null;
        scrollToBookshelf();
        ctx.actionsRef.current?.scrollToBookshelf?.();
        setStep(2);
        step2ShownRef.current = true;
        setVisible(true);
      }, STEP2_DELAY_MS);
    });
    ctx.registerOnBookCreated(() => {
      setTimeout(() => {
        setStep(3);
        setVisible(true);
      }, STEP3_DELAY_MS);
    });
    ctx.registerOnAuthModalClosedWithoutSuccess(() => {
      if (stepRef.current === 1) setVisible(true);
    });
  }, [ctx]);

  useEffect(() => {
    if (step === 2 && visible && !step2ShownRef.current) {
      step2ShownRef.current = true;
      scrollToBookshelf();
      ctx?.actionsRef.current?.scrollToBookshelf?.();
    }
  }, [step, visible, ctx]);

  return {
    visible,
    step,
    onNext,
    onCancel,
    isSessionReady: status !== 'loading',
  };
}
