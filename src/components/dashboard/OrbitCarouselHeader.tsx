'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Orbit path constants (single source of truth)
const HEADER_H = 220; // Must match Tailwind h-[220px]
const CX = 0.52; // Center X as fraction of width
const CY = 0.48; // Center Y as fraction of height
// RX and RY are now calculated in pixel space based on container dimensions
// Approximate proportions: RX ~38% of width, RY ~28% of height
const RX_RATIO = 0.38; // Horizontal radius as fraction of container width
const RY_RATIO = 0.28; // Vertical radius as fraction of container height
const ROT_DEG = -18; // Tilt angle in degrees

// Clock-style angle presets for satellite positions by count (in degrees)
// Clock convention: 0° = 12 o'clock (top), 90° = 3 o'clock (right), 
// 180° = 6 o'clock (bottom), 270° = 9 o'clock (left)
// Degrees increase clockwise (like a clock face)
// 1: front-lower-left "hero" anchor position (~7:30)
// 2-5: progressively fill clockwise around the orbit
const CLOCK_PRESETS_DEG: Record<number, number[]> = {
  1: [225],                 // lower-left anchor (~7:30)
  2: [225, 45],             // add upper-right (~1:30)
  3: [225, 45, 330],        // add near top (~11:00)
  4: [225, 45, 330, 135],   // add lower-right (~4:30)
  5: [225, 45, 330, 135, 270], // add left (~9:00)
};

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

// Map depthScore to z-index (continuous)
// depthScore typically ranges from ~-1 to ~+1
function depthScoreToZIndex(depthScore: number, allowAboveSponsor: boolean = true): number {
  // Map depthScore to z-index range
  // More positive (front) = higher z-index
  let z = 20 + Math.round(depthScore * 10);
  
  // Clamp to sane range
  z = Math.max(10, Math.min(40, z));
  
  // If allowAboveSponsor, front satellites can go above sponsor (z-35)
  if (allowAboveSponsor && z >= 35) {
    z = Math.max(35, z); // Allow up to z-40
  } else {
    z = Math.min(34, z); // Keep below sponsor
  }
  
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
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Measure container and set up ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ w: rect.width, h: rect.height });
    };

    // Initial measurement
    updateSize();

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate ellipse parameters in pixel space
  const cxPx = containerSize.w * CX;
  const cyPx = containerSize.h * CY;
  const rxPx = containerSize.w * RX_RATIO;
  const ryPx = containerSize.h * RY_RATIO;

  // Helper: Get point on orbit at parametric angle t (in radians)
  // Returns coordinates in pixel space
  const getOrbitPoint = (tRad: number): { x: number; y: number } => {
    if (containerSize.w === 0 || containerSize.h === 0) {
      return { x: 0, y: 0 };
    }
    
    // Parametric ellipse: x = cx + rx * cos(t), y = cy + ry * sin(t)
    const xUnrotated = cxPx + rxPx * Math.cos(tRad);
    const yUnrotated = cyPx + ryPx * Math.sin(tRad);
    
    // Apply rotation around center
    const rotRad = degToRad(ROT_DEG);
    return rotatePoint(xUnrotated, yUnrotated, cxPx, cyPx, rotRad);
  };

  // Helper: Calculate point on rotated ellipse at given angle (in radians)
  // Returns coordinates in pixel space
  const getEllipsePoint = (angleRad: number) => {
    if (containerSize.w === 0 || containerSize.h === 0) {
      return { x: 0, y: 0 };
    }
    
    // Calculate point on unrotated ellipse
    const xUnrotated = rxPx * Math.cos(angleRad);
    const yUnrotated = ryPx * Math.sin(angleRad);
    
    // Apply rotation transform
    const rotRad = degToRad(ROT_DEG);
    const x = cxPx + xUnrotated * Math.cos(rotRad) - yUnrotated * Math.sin(rotRad);
    const y = cyPx + xUnrotated * Math.sin(rotRad) + yUnrotated * Math.cos(rotRad);
    
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
    const sampleTop = getEllipsePoint((3 * Math.PI) / 2); // Top
    const sampleBottom = getEllipsePoint(Math.PI / 2); // Bottom
    
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

  // Get count-specific clock-style angle preset, convert to parametric degrees, then to radians
  const count = Math.min(displaySatellites.length, 5);
  const clockAnglesDeg = CLOCK_PRESETS_DEG[count] || [];
  const parametricAnglesDeg = clockAnglesDeg.map(clockDegToParametricDeg);
  const anglesRad = parametricAnglesDeg.map(degToRad);

  // Compute satellites with geometry-driven depth
  const SATELLITE_SIZE_PX = 56; // w-14 h-14 = 56px
  
  // First pass: Get base orbit points and compute depthScore
  const satellitesWithDepth = displaySatellites.map((satellite, index) => {
    const angleRad = anglesRad[index];
    const baseOrbitPoint = getOrbitPoint(angleRad); // Base point after rotation
    
    // Calculate depthScore from geometry
    const depthScore = calculateDepthScore(baseOrbitPoint.y, cyPx, ryPx);
    
    // Calculate z-index from depthScore
    const zIndex = depthScoreToZIndex(depthScore, true); // Allow above sponsor
    
    // Calculate visual properties from depthScore
    const isFront = depthScore > 0;
    const isBack = depthScore < 0;
    
    // Scale based on depth
    let scale = 1.0;
    if (isFront) {
      scale = 1.0 + (depthScore * 0.05); // 1.0 to ~1.05 for front
      scale = Math.min(1.06, Math.max(1.04, scale));
    } else if (isBack) {
      scale = 1.0 + (depthScore * 0.03); // ~0.97 to 1.0 for back
      scale = Math.min(1.0, Math.max(0.94, scale));
    }
    
    // Opacity based on depth
    let opacity = 1.0;
    if (isBack) {
      opacity = 0.70 + (Math.abs(depthScore) * 0.15); // 0.70 to 0.85
      opacity = Math.min(0.85, Math.max(0.70, opacity));
    }
    
    // Shadow strength based on depth
    let shadowStrength = 0.15;
    if (isFront) {
      shadowStrength = 0.15 + (depthScore * 0.10); // 0.15 to 0.25
      shadowStrength = Math.min(0.25, Math.max(0.15, shadowStrength));
    } else if (isBack) {
      shadowStrength = 0.15 - (Math.abs(depthScore) * 0.07); // 0.08 to 0.15
      shadowStrength = Math.min(0.15, Math.max(0.08, shadowStrength));
    }
    
    // Border opacity based on depth
    let borderOpacity = 0.40;
    if (isFront) {
      borderOpacity = 0.40 + (depthScore * 0.20); // 0.40 to 0.60
      borderOpacity = Math.min(0.60, Math.max(0.40, borderOpacity));
    } else if (isBack) {
      borderOpacity = 0.40 - (Math.abs(depthScore) * 0.15); // 0.25 to 0.40
      borderOpacity = Math.min(0.40, Math.max(0.25, borderOpacity));
    }
    
    let orbitPoint = { ...baseOrbitPoint };
    
    // Fix crowding: apply tangential nudge when satellites are too close
    if (count >= 4 && containerSize.w > 0) {
      // Check distance to previous satellites
      const nearbySatellites = displaySatellites.slice(0, index).map((other, otherIndex) => {
        const otherAngleRad = anglesRad[otherIndex];
        const otherPoint = getOrbitPoint(otherAngleRad);
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
      zIndex,
      scale,
      opacity,
      shadowStrength,
      borderOpacity,
      angleRad,
    };
  });

  return (
    <div ref={containerRef} className="w-full h-[220px] relative px-4">
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
          {satellitesWithDepth.map(({ satellite, orbitPoint, zIndex, scale, opacity, shadowStrength, borderOpacity }) => (
            <div
              key={satellite.id}
              className="absolute w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
              style={{
                left: `${orbitPoint.x}px`,
                top: `${orbitPoint.y}px`,
                transform: `translate(-50%, -50%) scale(${scale})`,
                opacity: opacity,
                zIndex: zIndex,
                border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
                boxShadow: `0 ${4 * shadowStrength}px ${12 * shadowStrength}px rgba(0, 0, 0, ${shadowStrength})`,
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
          ))}
        </>
      )}

      {/* Content layer - sponsor avatar and debug text (z-35) */}
      <div className="relative h-full flex items-center justify-center" style={{ zIndex: 35 }}>
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Center avatar (sponsor) */}
          <div 
            className="w-20 h-20 rounded-full border-2 border-white/40 bg-gray-200 overflow-hidden flex items-center justify-center relative cursor-pointer hover:scale-105 transition-transform duration-200"
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
          
          {/* Debug: satellites count (optional, for development) - moved lower */}
          {process.env.NODE_ENV === 'development' && (
            <div className="type-meta text-white/50 mt-2">
              {displaySatellites.length} satellite{displaySatellites.length !== 1 ? 's' : ''}
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
  );
}

