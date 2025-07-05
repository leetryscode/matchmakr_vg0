import React, { useRef, useEffect } from 'react';

export interface ConfettiBlastProps {
  isActive: boolean;
  onComplete?: () => void;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

const CONFETTI_COLORS = [
  '#0066FF', // primary blue
  '#00C9A7', // primary blue-light
  '#4D9CFF', // accent blue-light
];
const CONFETTI_COUNT = 5400;
const DURATION = 3200;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

const ConfettiBlast: React.FC<ConfettiBlastProps> = ({
  isActive,
  onComplete,
  width = '100%',
  height = 320,
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const confetti: any[] = [];
  const startTimeRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    function updateSize() {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        setCanvasSize({
          w: typeof width === 'number' ? width : parent.offsetWidth,
          h: typeof height === 'number' ? height : parent.offsetHeight || 320,
        });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [width, height, isActive]);

  useEffect(() => {
    if (!isActive) return;
    confetti.length = 0;
    startTimeRef.current = null;
    // Blast from bottom corners upward
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const corner = i % 2 === 0 ? 'left' : 'right';
      const x = corner === 'left' ? randomBetween(0, canvasSize.w * 0.15) : randomBetween(canvasSize.w * 0.85, canvasSize.w);
      const y = canvasSize.h;
      // Angles pointing upward: -π/2 is straight up, so we want angles around that
      const angle = corner === 'left' ? randomBetween(-Math.PI/2 - 0.4, -Math.PI/2 + 0.4) : randomBetween(-Math.PI/2 - 0.4, -Math.PI/2 + 0.4);
      const speed = randomBetween(30, 42);
      const shape = Math.random() < 0.5 ? 'rect' : 'circle';
      const size = randomBetween(8, 18);
      confetti.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape,
        size,
        gravity: randomBetween(0.35, 0.50),
        rotation: randomBetween(0, Math.PI * 2),
        rotationSpeed: randomBetween(-0.08, 0.08),
        alpha: 1,
        life: 0,
        maxLife: randomBetween(140, 200),
      });
    }
    function animate(now: number) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      for (const c of confetti) {
        if (c.life < c.maxLife) {
          c.x += c.vx;
          c.y += c.vy;
          c.vy += c.gravity;
          c.rotation += c.rotationSpeed;
          c.life++;
          c.alpha = 1 - c.life / c.maxLife;
          ctx.save();
          ctx.globalAlpha = c.alpha;
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rotation);
          ctx.fillStyle = c.color;
          if (c.shape === 'rect') {
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
          } else {
            ctx.beginPath();
            ctx.arc(0, 0, c.size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      if (elapsed < DURATION) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (onComplete) onComplete();
      }
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line
  }, [isActive, canvasSize.w, canvasSize.h]);

  // Accessibility: prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      style={{
        width: typeof width === 'number' ? width : '100%',
        height: typeof height === 'number' ? height : canvasSize.h,
        display: isActive ? 'block' : 'none',
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 9999,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

export default ConfettiBlast; 