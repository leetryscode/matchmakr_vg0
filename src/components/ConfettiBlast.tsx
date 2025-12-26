import React, { useRef, useEffect } from 'react';

export interface ConfettiBlastProps {
  isActive: boolean;
  onComplete?: () => void;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

// decorative-only, excluded from theme tokens
const CONFETTI_COLORS = [
  '#0066FF', // primary blue
  '#00C9A7', // primary blue-light
  '#4D9CFF', // accent blue-light
];
const CONFETTI_COUNT = 324; // Reduced by another 80% from 1620 (now 94% total reduction)
const DURATION = 15000; // Increased to 15 seconds for much longer trickle

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// Heart drawing function
function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.3);
  ctx.bezierCurveTo(x, y, x - size * 0.5, y, x - size * 0.5, y + size * 0.3);
  ctx.bezierCurveTo(x - size * 0.5, y + size * 0.6, x, y + size * 0.8, x, y + size * 0.8);
  ctx.bezierCurveTo(x, y + size * 0.8, x + size * 0.5, y + size * 0.6, x + size * 0.5, y + size * 0.3);
  ctx.bezierCurveTo(x + size * 0.5, y, x, y, x, y + size * 0.3);
  ctx.fill();
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
    
    // Spawn all pieces at top edge with upward velocity
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      // Create burst effect along top edge - more concentrated in center
      const burstCenter = canvasSize.w / 2;
      const burstWidth = canvasSize.w * 0.8; // 80% of screen width
      const x = randomBetween(burstCenter - burstWidth/2, burstCenter + burstWidth/2);
      const y = 0; // Top edge of screen
      
      // Stagger spawn over first 5 seconds for longer trickle
      const spawnDelay = randomBetween(0, 5000); // 0-5 seconds delay
      
      // Initial upward velocity (-50 to -100px/s)
      const initialVy = randomBetween(-100, -50);
      
      // Random horizontal spread (-150 to +150px/s)
      const vx = randomBetween(-150, 150);
      
      // Shape selection: 30% hearts, 35% rectangles, 35% circles
      const shapeRoll = Math.random();
      const shape = shapeRoll < 0.3 ? 'heart' : shapeRoll < 0.65 ? 'rect' : 'circle';
      const baseSize = randomBetween(8, 18);
      const sizeVariation = randomBetween(0.6, 1.4); // 60-140% of base size
      const size = baseSize * sizeVariation;
      
      // Fall duration: 4-7 seconds
      const fallDuration = randomBetween(4000, 7000);
      
      // Gravity acceleration: 800-1200px/s²
      const gravity = randomBetween(800, 1200);
      
      // Air resistance factor
      const airResistance = 0.995;
      
      // Horizontal drift parameters
      const driftFrequency = randomBetween(0.5, 2); // 0.5-2Hz
      const driftAmplitude = randomBetween(30, 80); // 30-80px amplitude
      const driftPhase = randomBetween(0, Math.PI * 2);
      
      // Rotation parameters (360-720 degrees during fall)
      const totalRotation = randomBetween(Math.PI * 2, Math.PI * 4); // 360-720 degrees
      const angularVelocity = totalRotation / (fallDuration / 1000); // degrees per second
      
      confetti.push({
        x,
        y,
        vx,
        vy: initialVy,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape,
        size,
        gravity,
        airResistance,
        driftFrequency,
        driftAmplitude,
        driftPhase,
        rotation: randomBetween(0, Math.PI * 2),
        angularVelocity: randomBetween(-angularVelocity, angularVelocity),
        alpha: 1,
        life: 0,
        maxLife: fallDuration / 16.67, // Assuming 60fps
        spawnTime: spawnDelay, // Staggered spawn time
        scale: 0, // Start at 0 for scaling effect
        targetScale: 1,
        isActive: false, // Start inactive
      });
    }
    
    function animate(now: number) {
      if (!startTimeRef.current) startTimeRef.current = now;
      const elapsed = now - startTimeRef.current;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);
      
      for (const c of confetti) {
        // Only activate confetti when spawn time has been reached
        if (elapsed < c.spawnTime) continue;
        
        // Activate confetti when spawn time is reached
        if (!c.isActive && elapsed >= c.spawnTime) {
          c.isActive = true;
        }
        
        if (c.isActive && c.life < c.maxLife) {
          // Scale effect: scale from 0 to full size over first 200ms
          const scaleTime = Math.min(elapsed - c.spawnTime, 200);
          c.scale = (scaleTime / 200) * c.targetScale;
          
          // Update position
          c.x += c.vx / 60; // Convert to per-frame velocity
          c.y += c.vy / 60;
          
          // Apply gravity
          c.vy += c.gravity / 60;
          
          // Apply air resistance
          c.vx *= c.airResistance;
          c.vy *= c.airResistance;
          
          // Apply horizontal drift (sine wave oscillation)
          const driftTime = elapsed - c.spawnTime;
          const driftOffset = Math.sin(driftTime * 0.001 * c.driftFrequency + c.driftPhase) * c.driftAmplitude;
          c.x += driftOffset / 60;
          
          // Update rotation
          c.rotation += c.angularVelocity / 60;
          
          c.life++;
          
          // Fade timing: maintain full opacity for first 60%, then fade over final 40%
          const fadeStart = c.maxLife * 0.6;
          if (c.life > fadeStart) {
            const fadeProgress = (c.life - fadeStart) / (c.maxLife - fadeStart);
            c.alpha = 1 - fadeProgress;
          }
          
          // Draw confetti piece
          ctx.save();
          ctx.globalAlpha = c.alpha;
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rotation);
          ctx.scale(c.scale, c.scale);
          ctx.fillStyle = c.color;
          
          if (c.shape === 'rect') {
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
          } else if (c.shape === 'heart') {
            drawHeart(ctx, 0, 0, c.size);
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