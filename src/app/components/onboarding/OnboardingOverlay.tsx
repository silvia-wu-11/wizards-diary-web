'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import type { OnboardingStep } from './useOnboarding';

const TARGET_SELECTORS: Record<OnboardingStep, string> = {
  1: '[data-onboarding-target="step1-login"]',
  2: '[data-onboarding-target="step2-add-book"]',
  3: '[data-onboarding-target="step3-first-book"]',
};

const STEP_CONFIG: Record<
  OnboardingStep,
  { title: string; description: string; nextLabel: string }
> = {
  1: {
    title: 'Begin the Enchanted Tale',
    description: 'Sign in or create an account to awaken your magical diary.',
    nextLabel: 'Next',
  },
  2: {
    title: 'Bind Your First Grimoire',
    description: 'Tap the "+" on the shelf, then name and bind your very first book.',
    nextLabel: 'Next',
  },
  3: {
    title: 'Write the First Page',
    description: 'Open the grimoire you just bound and inscribe your first memory within.',
    nextLabel: 'Open the Book',
  },
};

interface OnboardingOverlayProps {
  visible: boolean;
  step: OnboardingStep;
  onNext: () => void;
  onCancel: () => void;
  canProceedFromStep2?: boolean;
}

export function OnboardingOverlay({
  visible,
  step,
  onNext,
  onCancel,
}: OnboardingOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    if (visible) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    const updateTargetRect = () => {
      const selector = TARGET_SELECTORS[step];
      const el = document.querySelector(selector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateTargetRect();

    const resizeObserver = new ResizeObserver(() => {
      rafRef.current = requestAnimationFrame(updateTargetRect);
    });
    const targetEl = document.querySelector(TARGET_SELECTORS[step]);
    if (targetEl) resizeObserver.observe(targetEl);

    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', updateTargetRect, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, step]);

  const config = STEP_CONFIG[step];

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-black/60 pointer-events-auto"
        data-testid="onboarding-overlay"
      >
        {/* 箭头：从卡片指向目标 */}
        {targetRect && (
          <ArrowIndicator
            targetRect={targetRect}
            cardRef={cardRef}
            step={step}
          />
        )}

        {/* 引导卡片 */}
        <div className="fixed inset-0 flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#EBE5DC] border-2 border-[#8B5A5A]/40 rounded-xl shadow-2xl p-6 max-w-md w-full pointer-events-auto"
            style={{ zIndex: 151 }}
          >
            <h3 className="font-['Cinzel'] font-bold text-2xl text-[#4A4540] mb-2">
              {config.title}
            </h3>
            <p className="font-['Caveat'] text-xl text-[#4A4540]/90 mb-6">
              {config.description}
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-[#8B5A5A]/50 text-[#4A4540] hover:bg-[#8B5A5A]/10"
              >
                Leave It Be
              </Button>
              <Button
                onClick={onNext}
                className="bg-vintage-burgundy hover:bg-vintage-burgundy/90 text-parchment-white"
              >
                {config.nextLabel}
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function ArrowIndicator({
  targetRect,
  cardRef,
}: {
  targetRect: DOMRect;
  cardRef: React.RefObject<HTMLDivElement | null>;
  step: OnboardingStep;
}) {
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const cardCenterY = cardRect.top + cardRect.height / 2;

    const dx = targetCenterX - cardCenterX;
    const dy = targetCenterY - cardCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const angle = Math.atan2(dy, dx);

    const arrowSize = 28;
    const offsetFromTarget = 36;
    const arrowX =
      targetCenterX - ux * offsetFromTarget - arrowSize / 2;
    const arrowY =
      targetCenterY - uy * offsetFromTarget - arrowSize / 2;

    setArrowStyle({
      position: 'fixed',
      left: arrowX,
      top: arrowY,
      width: arrowSize,
      height: arrowSize,
      transform: `rotate(${angle}rad)`,
      zIndex: 151,
      pointerEvents: 'none',
    });
  }, [targetRect, cardRef]);

  return (
    <div style={arrowStyle} aria-hidden>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C9B896"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-md"
      >
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    </div>
  );
}
