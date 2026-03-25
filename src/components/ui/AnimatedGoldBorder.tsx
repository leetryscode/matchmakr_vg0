/**
 * AnimatedGoldBorder
 *
 * Wraps children with a spinning conic-gradient gold border.
 * Uses the .animated-gold-border CSS class defined in globals.css.
 *
 * The direct child should have border-color: transparent so the gradient
 * in the 1.5px padding gap shows through unobstructed.
 *
 * Props:
 *   active       — when false, renders children unwrapped (no border overhead)
 *   borderRadius — CSS border-radius for the outer wrapper. Should be the inner
 *                  card's border-radius + 1.5px. Defaults to '17.5px' (fits
 *                  orbit-card's 16px radius).
 */

import React from 'react';

interface AnimatedGoldBorderProps {
  active?: boolean;
  borderRadius?: string;
  children: React.ReactNode;
}

export default function AnimatedGoldBorder({
  active = true,
  borderRadius = '17.5px',
  children,
}: AnimatedGoldBorderProps) {
  if (!active) {
    return <>{children}</>;
  }

  return (
    <div
      className="animated-gold-border"
      style={{ padding: '1.5px', borderRadius }}
    >
      {children}
    </div>
  );
}
