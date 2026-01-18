'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Orbit path constants (single source of truth)
const HEADER_H = 220; // Must match Tailwind h-[220px]
const CX = 0.52; // Fallback center X as fraction of width (used only if sponsor not measured yet)
const CY = 0.48; // Fallback center Y as fraction of height (used only if sponsor not measured yet)
// RX and RY are now calculated in pixel space based on container dimensions
// Approximate proportions: RX ~38% of width, RY ~28% of height
const RX_RATIO = 0.38; // Horizontal radius as fraction of container width
const RY_RATIO = 0.28; // Vertical radius as fraction of container height
const ROT_DEG = -18; // Tilt angle in degrees

// Phase offsets for even spacing (in clock degrees)
// Clock convention: 0° = 12 o'clock (top), increases clockwise
// These phases control the starting angle for even 360/N spacing
// Each count has an optimized phase for best visual distribution
const PHASE_BY_COUNT: Record<number, number> = {
  1: 225,  // hero anchor position
  2: 225,  // hero + opposite
  3: 210,  // optimized for 3 satellites
  4: 210,  // optimized for 4 satellites
  5: 210,  // optimized for 5 satellites (locked)
};

// Motion configuration
const MOTION_ENABLED = true; // Feature flag
const REVOLUTION_MINUTES = 0.5; // 0.5 minutes per full rotation (2 revolutions per minute) - temporarily sped up for testing
const ROTATION_RATE_DEG_PER_MS = 360 / (REVOLUTION_MINUTES * 60 * 1000); // degrees per millisecond

// Orbit visual tuning constants (single source of truth)
const ORBIT_VISUALS = {
  scale: {
    front: {
      k: 0.05, // multiplier for front scale variation
      min: 1.04,
      max: 1.055,
    },
    back: {
      k: 0.03, // multiplier for back scale variation
      min: 0.94,
      max: 1.0,
    },
  },
  opacity: {
    min: 0.70, // minimum opacity (far back)
    max: 1.0,  // maximum opacity (far front)
    // span = max - min = 0.30, but computed as (depthScore + 1) * 0.15
  },
  shadow: {
    baseline: {
      y: 6,     // shadow offset Y (px)
      blur: 18, // shadow blur (px)
      alpha: 0.18, // baseline shadow alpha
    },
    strength: {
      min: 0.80, // minimum shadow strength (far back, 80% of baseline)
      max: 1.10, // maximum shadow strength (far front, 110% of baseline)
    },
  },
  border: {
    width: '1px',
    color: 'rgba(255, 255, 255, 0.15)',
  },
  sponsorShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
} as const;

export type OrbitAvatar = {
  id: string;
  name: string;
  avatarUrl?: string | null;
};

export type OrbitCarouselHeaderProps = {
  centerUser: OrbitAvatar;
  satellites: OrbitAvatar[]; // pass sponsored singles; may be empty
};

// Math helpers
const degToRad = (deg: number): number => (deg * Math.PI) / 180;

// Convert clock-style degrees to parametric ellipse degrees
// Clock convention: 0° = 12 o'clock (top), increases clockwise
// Parametric: 0° = 3 o'clock (right), increases counter-clockwise
// Formula: parametricDeg = (270 + clockDeg) % 360
function clockDegToParametricDeg(clockDeg: number): number {
  return (270 + clockDeg) % 360;
}

// Geometry-driven depth calculation
// depthScore = (y - cyPx) / ryPx
// positive = lower than center (front/closer)
// negative = higher than center (back/farther)
function calculateDepthScore(y: number, cyPx: number, ryPx: number): number {
  if (ryPx === 0) return 0;
  return (y - cyPx) / ryPx;
}

// Visual computation helpers (pure functions, used by both initial render and animation loop)

// Normalize depthScore (-1 to +1) to depth01 (0 to 1)
function computeDepth01(depthSigned: number): number {
  return Math.max(0, Math.min(1, (depthSigned + 1) / 2));
}

// Compute scale from depthScore using ORBIT_VISUALS config
function computeScale(depthSigned: number, visuals: typeof ORBIT_VISUALS): number {
  const isFront = depthSigned > 0;
  const isBack = depthSigned < 0;
  
  let scale = 1.0;
  if (isFront) {
    scale = 1.0 + (depthSigned * visuals.scale.front.k);
    scale = Math.min(visuals.scale.front.max, Math.max(visuals.scale.front.min, scale));
  } else if (isBack) {
    scale = 1.0 + (depthSigned * visuals.scale.back.k);
    scale = Math.min(visuals.scale.back.max, Math.max(visuals.scale.back.min, scale));
  }
  
  return scale;
}

// Compute opacity from depth01 using ORBIT_VISUALS config
function computeOpacity(depth01: number, visuals: typeof ORBIT_VISUALS): number {
  const span = visuals.opacity.max - visuals.opacity.min;
  // Map depth01 (0..1) to opacity (min..max)
  // depth01 = 0 → opacity = min (far back)
  // depth01 = 1 → opacity = max (far front)
  let opacity = visuals.opacity.min + (depth01 * span);
  opacity = Math.min(visuals.opacity.max, Math.max(visuals.opacity.min, opacity));
  return opacity;
}

// Compute shadow from depth01 using ORBIT_VISUALS config
function computeShadow(depth01: number, visuals: typeof ORBIT_VISUALS): string {
  const { baseline, strength } = visuals.shadow;
  // Lerp shadow strength from min to max based on depth01
  const shadowStrength = strength.min + (depth01 * (strength.max - strength.min));
  const shadowAlpha = baseline.alpha * shadowStrength;
  return `0 ${baseline.y}px ${baseline.blur}px rgba(0, 0, 0, ${shadowAlpha})`;
}

// Map depthScore to z-index (continuous)
// depthScore typically ranges from ~-1 to ~+1
function depthScoreToZIndex(depthScore: number, allowAboveSponsor: boolean = true): number {
  // Sponsor is at z-35
  // Front satellites (positive depthScore) should be above sponsor (z > 35)
  // Back satellites (negative depthScore) should be below sponsor (z < 35)
  
  if (!allowAboveSponsor) {
    // Force all satellites below sponsor
    let z = 20 + Math.round(depthScore * 10);
    return Math.max(10, Math.min(34, z));
  }
  
  // Map depthScore to z-index with sponsor (35) as the pivot point
  // depthScore = 0 → z = 35 (at sponsor level)
  // depthScore > 0 → z > 35 (in front, above sponsor)
  // depthScore < 0 → z < 35 (behind, below sponsor)
  let z = 35 + Math.round(depthScore * 5);
  
  // Clamp to sane range: back satellites 10-34, front satellites 36-40
  z = Math.max(10, Math.min(40, z));
  
  return z;
}

const rotatePoint = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  rotRad: number
): { x: number; y: number } => {
  const dx = x - centerX;
  const dy = y - centerY;
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  return {
    x: centerX + dx * cos - dy * sin,
    y: centerY + dx * sin + dy * cos,
  };
};

export default function OrbitCarouselHeader({
  centerUser,
  satellites,
}: OrbitCarouselHeaderProps) {
  const router = useRouter();
  
  // Cap satellites to 5 for now
  const displaySatellites = satellites.slice(0, 5);

  // Container ref and size state
  const containerRef = useRef<HTMLDivElement>(null);
  const sponsorAvatarRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [sponsorCenter, setSponsorCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Animation refs
  const rotationOffsetDegRef = useRef<number>(0);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);
  const satelliteRefsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const geometryRef = useRef<{ cxPx: number; cyPx: number; rxPx: number; ryPx: number; count: number; containerW: number; containerH: number } | null>(null);
  const isPausedRef = useRef<boolean>(false); // Visibility pause (document.hidden)
  const isUserPausedRef = useRef<boolean>(false); // Tap-to-pause (user interaction)
  const resumeTimeoutRef = useRef<number | null>(null); // Delayed resume timeout
  const isPointerDownRef = useRef<boolean>(false); // Track if pointer is currently held

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Measure container and sponsor avatar center, set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const sponsorAvatar = sponsorAvatarRef.current;
    if (!container || !sponsorAvatar) return;

    const updateMeasurements = () => {
      const containerRect = container.getBoundingClientRect();
      const sponsorRect = sponsorAvatar.getBoundingClientRect();
      
      // Container size
      setContainerSize({ w: containerRect.width, h: containerRect.height });
      
      // Sponsor avatar center relative to container
      const sponsorCenterX = sponsorRect.left + sponsorRect.width / 2 - containerRect.left;
      const sponsorCenterY = sponsorRect.top + sponsorRect.height / 2 - containerRect.top;
      setSponsorCenter({ x: sponsorCenterX, y: sponsorCenterY });
    };

    // Initial measurement
    updateMeasurements();

    // Set up ResizeObserver for both container and sponsor avatar
    const resizeObserver = new ResizeObserver(updateMeasurements);
    resizeObserver.observe(container);
    resizeObserver.observe(sponsorAvatar);

    // Also observe window resize for layout changes
    window.addEventListener('resize', updateMeasurements);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateMeasurements);
    };
  }, []);

  // Calculate ellipse parameters in pixel space
  // Use measured sponsor center instead of fractional constants
  const cxPx = sponsorCenter.x > 0 ? sponsorCenter.x : containerSize.w * CX;
  const cyPx = sponsorCenter.y > 0 ? sponsorCenter.y : containerSize.h * CY;
  const rxPx = containerSize.w * RX_RATIO;
  const ryPx = containerSize.h * RY_RATIO;

  // Update geometry ref when measurements change (avoids stale closures)
  const count = Math.min(displaySatellites.length, 5);
  useEffect(() => {
    if (containerSize.w > 0 && containerSize.h > 0) {
      geometryRef.current = {
        cxPx: sponsorCenter.x > 0 ? sponsorCenter.x : containerSize.w * CX,
        cyPx: sponsorCenter.y > 0 ? sponsorCenter.y : containerSize.h * CY,
        rxPx: containerSize.w * RX_RATIO,
        ryPx: containerSize.h * RY_RATIO,
        count,
        containerW: containerSize.w,
        containerH: containerSize.h,
      };
    }
  }, [containerSize.w, containerSize.h, sponsorCenter.x, sponsorCenter.y, count]);

  // Helper: Get point on orbit at parametric angle t (in radians)
  // Returns coordinates in pixel space
  // Accepts geometry params to avoid closure issues
  const getOrbitPoint = (tRad: number, cx: number, cy: number, rx: number, ry: number): { x: number; y: number } => {
    if (containerSize.w === 0 || containerSize.h === 0) {
      return { x: 0, y: 0 };
    }
    
    // Parametric ellipse: x = cx + rx * cos(t), y = cy + ry * sin(t)
    const xUnrotated = cx + rx * Math.cos(tRad);
    const yUnrotated = cy + ry * Math.sin(tRad);
    
    // Apply rotation around center
    const rotRad = degToRad(ROT_DEG);
    return rotatePoint(xUnrotated, yUnrotated, cx, cy, rotRad);
  };

  // Helper: Calculate point on rotated ellipse at given angle (in radians)
  // Returns coordinates in pixel space
  // Accepts geometry params to avoid closure issues
  const getEllipsePoint = (angleRad: number, cx: number, cy: number, rx: number, ry: number) => {
    if (containerSize.w === 0 || containerSize.h === 0) {
      return { x: 0, y: 0 };
    }
    
    // Calculate point on unrotated ellipse
    const xUnrotated = rx * Math.cos(angleRad);
    const yUnrotated = ry * Math.sin(angleRad);
    
    // Apply rotation transform
    const rotRad = degToRad(ROT_DEG);
    const x = cx + xUnrotated * Math.cos(rotRad) - yUnrotated * Math.sin(rotRad);
    const y = cy + xUnrotated * Math.sin(rotRad) + yUnrotated * Math.cos(rotRad);
    
    return { x, y };
  };

  // Build orbit arcs: split based on depthScore (geometry-driven)
  // Back arc: points where depthScore < 0 (y > cyPx, higher than center)
  // Front arc: points where depthScore > 0 (y < cyPx, lower than center)
  
  const buildEllipseArcPath = (startRad: number, endRad: number, sweepClockwise: boolean): string => {
    if (containerSize.w === 0 || containerSize.h === 0) return '';
    
    // Calculate start and end points
    const startPoint = getEllipsePoint(startRad);
    const endPoint = getEllipsePoint(endRad);
    
    // For half ellipse (180°), use small arc
    const largeArcFlag = 0;
    const sweepFlag = sweepClockwise ? 1 : 0;
    
    return `M ${startPoint.x} ${startPoint.y} A ${rxPx} ${ryPx} ${ROT_DEG} ${largeArcFlag} ${sweepFlag} ${endPoint.x} ${endPoint.y}`;
  };

  // Determine which parametric range is back vs front by checking sample points
  // Sample points: π (left), 0 (right), π/2 (bottom), 3π/2 (top)
  let backArcPath = '';
  let frontArcPath = '';
  
  if (containerSize.w > 0) {
    // Check sample points to determine which arc is back (depthScore < 0)
    const sampleTop = getEllipsePoint((3 * Math.PI) / 2, cxPx, cyPx, rxPx, ryPx); // Top
    const sampleBottom = getEllipsePoint(Math.PI / 2, cxPx, cyPx, rxPx, ryPx); // Bottom
    
    const topDepthScore = calculateDepthScore(sampleTop.y, cyPx, ryPx);
    const bottomDepthScore = calculateDepthScore(sampleBottom.y, cyPx, ryPx);
    
    // Top should be back (negative depthScore), bottom should be front (positive depthScore)
    // If top has negative depthScore, then π to 0 (through top) is back arc
    // If top has positive depthScore, we need to swap
    
    if (topDepthScore < 0 && bottomDepthScore > 0) {
      // Correct: top is back, bottom is front
      backArcPath = buildEllipseArcPath(Math.PI, 0, true); // π to 0 through top
      frontArcPath = buildEllipseArcPath(0, Math.PI, true); // 0 to π through bottom
    } else {
      // Swapped: need to reverse
      backArcPath = buildEllipseArcPath(0, Math.PI, true); // 0 to π through bottom
      frontArcPath = buildEllipseArcPath(Math.PI, 0, true); // π to 0 through top
    }
  }

  // Compute even spacing with count-specific phase
  const stepDeg = count > 0 ? 360 / count : 0;
  const startDeg = PHASE_BY_COUNT[count] ?? 225; // Default to 225° if count not in map
  
  // Generate clock angles using even spacing: (startDeg + index * stepDeg) % 360
  const clockAnglesDeg = displaySatellites.map((_, i) => (startDeg + i * stepDeg) % 360);
  
  // Convert to parametric degrees, then to radians
  const parametricAnglesDeg = clockAnglesDeg.map(clockDegToParametricDeg);
  const anglesRad = parametricAnglesDeg.map(degToRad);

  // Compute satellites with geometry-driven depth
  const SATELLITE_SIZE_PX = 56; // w-14 h-14 = 56px
  
  // First pass: Get base orbit points and compute depthScore
  const satellitesWithDepth = displaySatellites.map((satellite, index) => {
    const angleRad = anglesRad[index];
    const baseOrbitPoint = getOrbitPoint(angleRad, cxPx, cyPx, rxPx, ryPx); // Base point after rotation
    
    // Calculate depthScore from geometry
    const depthScore = calculateDepthScore(baseOrbitPoint.y, cyPx, ryPx);
    
    // Calculate z-index from depthScore
    const zIndex = depthScoreToZIndex(depthScore, true); // Allow above sponsor
    
    // Calculate visual properties from depthScore using shared helpers
    const depth01 = computeDepth01(depthScore);
    const scale = computeScale(depthScore, ORBIT_VISUALS);
    const opacity = computeOpacity(depth01, ORBIT_VISUALS);
    
    let orbitPoint = { ...baseOrbitPoint };
    
      // Fix crowding: apply tangential nudge when satellites are too close
      if (count >= 4 && containerSize.w > 0) {
        // Check distance to previous satellites
        const nearbySatellites = displaySatellites.slice(0, index).map((other, otherIndex) => {
          const otherAngleRad = anglesRad[otherIndex];
          const otherPoint = getOrbitPoint(otherAngleRad, cxPx, cyPx, rxPx, ryPx);
          return otherPoint;
        });
      
      // Find closest satellite
      let minDistance = Infinity;
      let closestPoint: { x: number; y: number } | null = null;
      
      nearbySatellites.forEach(otherPoint => {
        const distX = orbitPoint.x - otherPoint.x;
        const distY = orbitPoint.y - otherPoint.y;
        const dist = Math.sqrt(distX * distX + distY * distY);
        if (dist < minDistance) {
          minDistance = dist;
          closestPoint = otherPoint;
        }
      });
      
      // If too close, apply tangential nudge
      const minSeparation = SATELLITE_SIZE_PX * 0.9; // ~50px
      if (closestPoint && minDistance < minSeparation) {
        // Compute tangent direction at this parametric angle
        // Tangent is perpendicular to radius vector
        const dx = orbitPoint.x - cxPx;
        const dy = orbitPoint.y - cyPx;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
          // Normalize radius vector
          const normalizedX = dx / distance;
          const normalizedY = dy / distance;
          
          // Perpendicular vector (tangent)
          const tangentX = -normalizedY;
          const tangentY = normalizedX;
          
          // Alternate direction for each satellite
          const nudgeAmount = 6 + (minDistance / minSeparation) * 4; // 6-10px
          const nudgeDirection = index % 2 === 0 ? 1 : -1;
          
          orbitPoint = {
            x: orbitPoint.x + tangentX * nudgeAmount * nudgeDirection,
            y: orbitPoint.y + tangentY * nudgeAmount * nudgeDirection,
          };
        }
      }
    }
    
    return {
      satellite,
      orbitPoint,
      depthScore,
      depth01,
      zIndex,
      scale,
      opacity,
      angleRad,
    };
  });

  // Update satellite transforms via DOM (bypasses React re-renders)
  const updateSatelliteTransforms = () => {
    const geometry = geometryRef.current;
    if (!geometry || satelliteRefsRef.current.size === 0) return;

    const { cxPx, cyPx, rxPx, ryPx, count, containerW, containerH } = geometry;
    const stepDeg = count > 0 ? 360 / count : 0;
    const basePhase = PHASE_BY_COUNT[count] ?? 225;
    const effectivePhase = basePhase + rotationOffsetDegRef.current;

    displaySatellites.forEach((satellite, index) => {
      const el = satelliteRefsRef.current.get(satellite.id);
      if (!el) return;

      // Calculate clock angle with rotation offset
      const clockAngleDeg = (effectivePhase + index * stepDeg) % 360;
      const parametricDeg = clockDegToParametricDeg(clockAngleDeg);
      const angleRad = degToRad(parametricDeg);

      // Get orbit point
      const orbitPoint = getOrbitPoint(angleRad, cxPx, cyPx, rxPx, ryPx);

      // Calculate depth properties using shared helpers
      const depthScore = calculateDepthScore(orbitPoint.y, cyPx, ryPx);
      const zIndex = depthScoreToZIndex(depthScore, true);
      const depth01 = computeDepth01(depthScore);
      const scale = computeScale(depthScore, ORBIT_VISUALS);
      const opacity = computeOpacity(depth01, ORBIT_VISUALS);
      const boxShadow = computeShadow(depth01, ORBIT_VISUALS);

      // Calculate transform: translate3d(dx, dy, 0) translate3d(-50%, -50%, 0) scale(scale)
      const dx = orbitPoint.x - containerW / 2;
      const dy = orbitPoint.y - containerH / 2;
      const transform = `translate3d(${dx}px, ${dy}px, 0) translate3d(-50%, -50%, 0) scale(${scale})`;

      // Update DOM directly
      el.style.transform = transform;
      el.style.zIndex = String(zIndex);
      el.style.opacity = String(opacity);
      el.style.boxShadow = boxShadow;
    });
  };

  // Animation frame function
  const animateFrame = (now: number) => {
    // Pause if visibility is hidden OR user is interacting (tap-to-pause)
    const isPaused = isPausedRef.current || isUserPausedRef.current;
    if (isPaused) {
      // Still schedule next frame even when paused
      animationFrameIdRef.current = requestAnimationFrame(animateFrame);
      return;
    }

    const geometry = geometryRef.current;
    if (!geometry || !MOTION_ENABLED || prefersReducedMotion) {
      animationFrameIdRef.current = null;
      return;
    }

    // Calculate delta time
    const lastTime = lastFrameTimeRef.current ?? now;
    let dt = now - lastTime;
    dt = Math.min(dt, 50); // Clamp to prevent teleporting if tab wakes

    // Advance rotation offset
    rotationOffsetDegRef.current += dt * ROTATION_RATE_DEG_PER_MS;
    lastFrameTimeRef.current = now;

    // Update satellite transforms
    updateSatelliteTransforms();

    // Schedule next frame
    animationFrameIdRef.current = requestAnimationFrame(animateFrame);
  };

  // Start animation loop when ready
  useEffect(() => {
    if (!MOTION_ENABLED || prefersReducedMotion || containerSize.w === 0) {
      return;
    }

    // Start animation
    lastFrameTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(animateFrame);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [containerSize.w, containerSize.h, prefersReducedMotion]);

  // Handle visibility change (pause when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isPausedRef.current = document.hidden;
      
      // If going hidden, clear any pending resume timer
      // Prevents resume while hidden / time-jump oddities
      if (document.hidden) {
        if (resumeTimeoutRef.current !== null) {
          clearTimeout(resumeTimeoutRef.current);
          resumeTimeoutRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Tap-to-pause: pause motion on pointer down, resume 1s after release
  // This quiet interaction signals the orbit is intentional and alive
  // Inert if prefers-reduced-motion is on (no motion to pause)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return; // No motion to pause
    
    isUserPausedRef.current = true;
    isPointerDownRef.current = true;
    
    // Capture pointer to prevent stray cancels when finger drifts
    e.currentTarget.setPointerCapture(e.pointerId);
    
    // Clear any existing resume timeout
    if (resumeTimeoutRef.current !== null) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return; // No motion to pause
    
    isPointerDownRef.current = false;
    
    // Release pointer capture
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    // Clear any existing resume timeout
    if (resumeTimeoutRef.current !== null) {
      clearTimeout(resumeTimeoutRef.current);
    }
    
    // Resume after 1000ms delay, but only if pointer is not still held
    resumeTimeoutRef.current = window.setTimeout(() => {
      // Guard: don't resume if user is still holding
      if (!isPointerDownRef.current) {
        isUserPausedRef.current = false;
      }
      resumeTimeoutRef.current = null;
    }, 1000);
  };

  // Cleanup resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current !== null) {
        clearTimeout(resumeTimeoutRef.current);
        resumeTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .orbit-avatar-highlight::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: 50%;
            pointer-events: none;
            background: radial-gradient(
              circle at top left,
              rgba(255, 255, 255, 0.08),
              rgba(255, 255, 255, 0.04) 30%,
              rgba(255, 255, 255, 0.0) 60%
            );
          }
          .orbit-avatar-sponsor::after {
            background: radial-gradient(
              circle at top left,
              rgba(255, 255, 255, 0.10),
              rgba(255, 255, 255, 0.05) 30%,
              rgba(255, 255, 255, 0.0) 60%
            );
          }
        `
      }} />
      <div 
        ref={containerRef} 
        className="w-full h-[220px] relative px-4"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={(e) => {
          isPointerDownRef.current = false;
          if (prefersReducedMotion) return;
          // Try to release capture, but handle gracefully if not captured
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {}
          handlePointerUp(e);
        }}
        onPointerLeave={(e) => {
          // Only handle if we had capture (pointer was down)
          if (isPointerDownRef.current) {
            isPointerDownRef.current = false;
            if (prefersReducedMotion) return;
            // Try to release capture, but handle gracefully if not captured
            try {
              e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
            handlePointerUp(e);
          }
        }}
      >
      {/* Back arc SVG layer - behind everything (z-10) */}
      {containerSize.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
          preserveAspectRatio="none"
        >
          <path
            d={backArcPath}
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 10"
          />
        </svg>
      )}

      {/* Satellites layer - rendered with geometry-driven z-index */}
      {containerSize.w > 0 && (
        <>
          {satellitesWithDepth.map(({ satellite, orbitPoint, zIndex, scale, opacity, depth01 }) => {
            // Calculate transform for initial render (static fallback)
            const dx = orbitPoint.x - containerSize.w / 2;
            const dy = orbitPoint.y - containerSize.h / 2;
            const transform = `translate3d(${dx}px, ${dy}px, 0) translate3d(-50%, -50%, 0) scale(${scale})`;
            const boxShadow = computeShadow(depth01, ORBIT_VISUALS);

            return (
              <div
                key={satellite.id}
                ref={(el) => {
                  if (el) {
                    satelliteRefsRef.current.set(satellite.id, el);
                  } else {
                    satelliteRefsRef.current.delete(satellite.id);
                  }
                }}
                className="orbit-avatar-highlight absolute left-1/2 top-1/2 w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
                style={{
                  transform: transform,
                  opacity: opacity,
                  zIndex: zIndex,
                  willChange: 'transform',
                  border: `${ORBIT_VISUALS.border.width} solid ${ORBIT_VISUALS.border.color}`,
                  boxShadow: boxShadow,
                }}
                onClick={() => router.push(`/profile/${satellite.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/profile/${satellite.id}`);
                  }
                }}
                aria-label={`View ${satellite.name}'s profile`}
              >
              {satellite.avatarUrl ? (
                <img
                  src={satellite.avatarUrl}
                  alt={satellite.name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-white font-bold text-sm">
                  {satellite.name?.charAt(0).toUpperCase() || '?'}
                </span>
              )}
              </div>
            );
          })}
        </>
      )}

      {/* Content layer - sponsor avatar and debug text (z-35) */}
      <div className="relative h-full flex items-center justify-center" style={{ zIndex: 35 }}>
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Center avatar (sponsor) */}
          <div 
            ref={sponsorAvatarRef}
            className="orbit-avatar-highlight orbit-avatar-sponsor w-20 h-20 rounded-full border border-white/15 bg-gray-200 overflow-hidden flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform duration-200"
            style={{
              boxShadow: ORBIT_VISUALS.sponsorShadow,
            }}
            onClick={() => router.push(`/profile/${centerUser.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/profile/${centerUser.id}`);
              }
            }}
            aria-label={`View ${centerUser.name}'s profile`}
          >
            {centerUser.avatarUrl ? (
              <img
                src={centerUser.avatarUrl}
                alt={centerUser.name}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-white font-bold text-2xl">
                {centerUser.name?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
          
          {/* Debug: minimal spacing info (development only, behind feature flag) */}
          {process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_SHOW_ORBIT_DEBUG === 'true' && (
            <div className="type-meta text-white/50 mt-2 text-xs">
              <div>count: {count} | phase: {startDeg}° | step: {stepDeg.toFixed(1)}°</div>
            </div>
          )}
        </div>
      </div>

      {/* Front arc SVG layer - above sponsor, below front satellites (z-38) */}
      {containerSize.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 38 }}
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
          preserveAspectRatio="none"
        >
          <path
            d={frontArcPath}
            stroke="rgba(255, 255, 255, 0.22)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 10"
          />
        </svg>
      )}
    </div>
    </>
  );
}

