'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface HowItWorksStepProps {
  onNext: () => void;
  onRegisterBackHandler?: (handler: (() => boolean) | null) => void;
}

type Bullet = {
  bold: string;
  description: string;
};

const TYPE_SPEED_MS = 20;

const BULLETS: Bullet[] = [
  {
    bold: 'Sponsors introduce friends.',
    description:
      "Create a profile for someone you know and connect them with other sponsors' singles.",
  },
  {
    bold: 'Singles get introduced.',
    description:
      'No swiping, no browsing - you only meet people through someone who knows you.',
  },
  {
    bold: 'Built on trust.',
    description:
      'Sponsors can only communicate with other sponsors. Singles are introduced, never contacted directly.',
  },
];

export default function HowItWorksStep({ onNext, onRegisterBackHandler }: HowItWorksStepProps) {
  const [completedCount, setCompletedCount] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [animateCurrent, setAnimateCurrent] = useState(true);

  const currentIndex = completedCount < BULLETS.length ? completedCount : null;
  const currentText = useMemo(() => {
    if (currentIndex === null) return '';
    return `${BULLETS[currentIndex].bold} ${BULLETS[currentIndex].description}`;
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex === null) {
      setIsTyping(false);
      return;
    }
    if (!animateCurrent) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const interval = window.setInterval(() => {
      setTypedChars((prev) => {
        const next = prev + 1;
        if (next >= currentText.length) {
          window.clearInterval(interval);
          setIsTyping(false);
          setAnimateCurrent(false);
          return currentText.length;
        }
        return next;
      });
    }, TYPE_SPEED_MS);

    return () => window.clearInterval(interval);
  }, [animateCurrent, currentIndex, currentText]);

  const finishCurrentBullet = () => {
    if (currentIndex === null) return;
    setTypedChars(currentText.length);
    setIsTyping(false);
    setAnimateCurrent(false);
  };

  useEffect(() => {
    if (!onRegisterBackHandler) return;

    onRegisterBackHandler(() => {
      const phase = completedCount + 1;
      if (phase <= 1) return false;

      const previousCount = completedCount - 1;
      const previousText = `${BULLETS[previousCount].bold} ${BULLETS[previousCount].description}`;
      setCompletedCount(previousCount);
      setTypedChars(previousText.length);
      setAnimateCurrent(false);
      setIsTyping(false);
      return true;
    });

    return () => onRegisterBackHandler(null);
  }, [completedCount, onRegisterBackHandler]);

  const handleNextClick = () => {
    if (isTyping) {
      finishCurrentBullet();
      return;
    }

    if (completedCount < BULLETS.length - 1) {
      setCompletedCount((prev) => prev + 1);
      setTypedChars(0);
      setAnimateCurrent(true);
      return;
    }

    onNext();
  };

  const nextLabel = completedCount >= BULLETS.length - 1 ? 'Continue' : 'Next';

  return (
    <div className="onboarding-step-shell">
      <div
        className="onboarding-step-content"
        onClick={() => {
          if (isTyping) finishCurrentBullet();
        }}
      >
        <h1 className="onboarding-heading text-3xl leading-[1.1] tracking-tight sm:text-5xl">
          How Orbit works
        </h1>

        <div className="flex w-full max-w-2xl flex-col gap-6 text-left">
          {BULLETS.map((bullet, idx) => {
            if (idx < completedCount) {
              return (
                <p key={bullet.bold} className="onboarding-muted text-base sm:text-lg">
                  <span className="font-medium text-white/90">{bullet.bold}</span>{' '}
                  {bullet.description}
                </p>
              );
            }
            if (idx !== currentIndex) return null;

            const visible = currentText.slice(0, typedChars);
            const boldPart =
              visible.length <= bullet.bold.length ? visible : bullet.bold;
            const descPart =
              visible.length <= bullet.bold.length ? '' : visible.slice(bullet.bold.length);

            return (
              <p key={bullet.bold} className="onboarding-muted text-base sm:text-lg">
                <span className="font-medium text-white/90">{boldPart}</span>
                <span>{descPart}</span>
                {isTyping && (
                  <span
                    className="ml-0.5 inline-block h-[1.05em] w-[1px] align-[-0.16em] bg-[rgb(var(--orbit-gold)_/_0.95)]"
                    style={{ animation: 'cursor-blink 0.9s steps(1, end) infinite' }}
                  />
                )}
              </p>
            );
          })}
        </div>
      </div>

      <div className="onboarding-step-actions">
        <button
          onClick={handleNextClick}
          aria-disabled={isTyping}
          className={`onboarding-btn-primary ${isTyping ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {nextLabel}
        </button>
      </div>

      <style jsx>{`
        @keyframes cursor-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
