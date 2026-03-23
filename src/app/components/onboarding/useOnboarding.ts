'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useOnboardingContext } from './OnboardingContext';
import { useDiaryStore } from '../../store';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'wizards-diary-onboarding-completed';
const STEP2_DELAY_MS = 1000;
const STEP3_DELAY_MS = 1000;

export type OnboardingStep = 1 | 2 | 3;

export function useOnboarding() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { books, entries, isLoaded } = useDiaryStore();
  const ctx = useOnboardingContext();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<OnboardingStep>(1);
  const stepRef = useRef(step);
  const step2ShownRef = useRef(false);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const completed = localStorage.getItem(STORAGE_KEY);
    if (completed === "true") return;

    if (!isLoaded || status === 'loading') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }

    // 检查用户是否已经使用过应用（有日记本、有日记、或已登录）
    const hasBooks = books.length > 0;
    const hasEntries = entries.length > 0;
    // 如果已经创建过日记本、写过日记或已登录，不再展示新手引导
    if (hasBooks && hasEntries) {
      return;
    }

    const isLoggedIn = !!session;
    if (!isLoggedIn) {
      setStep(1);
    } else if (!hasBooks) {
      setStep(2);
      step2ShownRef.current = true;
      ctx?.actionsRef.current?.scrollToBookshelf?.();
    } else if (!hasEntries) {
      setStep(3);
      ctx?.actionsRef.current?.scrollToBookshelf?.();
    }

    setVisible(true);

  }, [session, status, books, entries, isLoaded, ctx]);

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transitionToStep2 = useCallback(() => {
    setVisible(false);
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = setTimeout(() => {
      transitionTimerRef.current = null;
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
      ctx?.actionsRef.current?.openAuthModal?.("register");
    } else if (step === 2) {
      setVisible(false);
      ctx?.actionsRef.current?.openCreateBookModal?.();
      localStorage.setItem(STORAGE_KEY, "2");
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setVisible(false);
      const bookId = books[0]?.id;
      if (bookId) {
        router.push(`/book/${bookId}`);
      }
    }
  }, [step, ctx, books, router]);

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
    ctx.registerOnBookCreated(() => {
      setTimeout(() => {
        setStep(3);
        setVisible(true);
      }, STEP3_DELAY_MS);
    });
  }, [ctx]);

  return {
    visible,
    step,
    onNext,
    onCancel,
    isSessionReady: status !== 'loading',
  };
}
