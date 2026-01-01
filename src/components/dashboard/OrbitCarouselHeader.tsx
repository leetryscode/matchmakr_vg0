'use client';

import React, { useRef, useEffect, useState } from 'react';

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

  // Arc angle ranges (in radians)
  // Back arc: ~210° → ~330° (behind avatar)
  const backArcStart = (210 * Math.PI) / 180;
  const backArcEnd = (330 * Math.PI) / 180;
  
  // Front arc: ~30° → ~150° (in front of avatar, optional)
  const frontArcStart = (30 * Math.PI) / 180;
  const frontArcEnd = (150 * Math.PI) / 180;

  // Calculate arc endpoints on the rotated ellipse (only if container is measured)
  const backStart = containerSize.w > 0 ? getEllipsePoint(backArcStart) : { x: 0, y: 0 };
  const backEnd = containerSize.w > 0 ? getEllipsePoint(backArcEnd) : { x: 0, y: 0 };
  const frontStart = containerSize.w > 0 ? getEllipsePoint(frontArcStart) : { x: 0, y: 0 };
  const frontEnd = containerSize.w > 0 ? getEllipsePoint(frontArcEnd) : { x: 0, y: 0 };

  // Build SVG path for back arc (behind avatar)
  // A rx ry x-axis-rotation large-arc-flag sweep-flag x y
  // large-arc-flag: 0 for smaller arc (120° is < 180°)
  // sweep-flag: 1 for clockwise
  const backArcPath = containerSize.w > 0
    ? `M ${backStart.x} ${backStart.y} A ${rxPx} ${ryPx} ${ROT_DEG} 0 1 ${backEnd.x} ${backEnd.y}`
    : '';

  // Build SVG path for front arc (in front of avatar, optional)
  const frontArcPath = containerSize.w > 0
    ? `M ${frontStart.x} ${frontStart.y} A ${rxPx} ${ryPx} ${ROT_DEG} 0 1 ${frontEnd.x} ${frontEnd.y}`
    : '';

  // Get count-specific clock-style angle preset, convert to parametric degrees, then to radians
  const count = Math.min(displaySatellites.length, 5);
  const clockAnglesDeg = CLOCK_PRESETS_DEG[count] || [];
  const parametricAnglesDeg = clockAnglesDeg.map(clockDegToParametricDeg);
  const anglesRad = parametricAnglesDeg.map(degToRad);

  return (
    <div ref={containerRef} className="w-full h-[220px] relative px-4">
      {/* Back arc SVG layer - behind avatar (z-10) */}
      {containerSize.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none z-10"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
          preserveAspectRatio="none"
        >
          <path
            d={backArcPath}
            stroke="rgba(255, 255, 255, 0.13)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 10"
          />
        </svg>
      )}

      {/* Satellites layer - above back arc, below center avatar (z-15) */}
      {containerSize.w > 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
          {displaySatellites.map((satellite, index) => {
            const angleRad = anglesRad[index];
            const orbitPoint = getOrbitPoint(angleRad);
            
            return (
              <div
                key={satellite.id}
                className="absolute w-14 h-14 rounded-full border border-white/40 bg-gray-200 overflow-hidden flex items-center justify-center"
                style={{
                  left: `${orbitPoint.x}px`,
                  top: `${orbitPoint.y}px`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                }}
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
        </div>
      )}

      {/* Content layer - avatar and debug text (z-20) */}
      <div className="relative z-20 h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Center avatar (sponsor) */}
          <div className="w-20 h-20 rounded-full border-2 border-white/40 bg-gray-200 overflow-hidden flex items-center justify-center relative">
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

      {/* Front arc SVG layer - in front of avatar (z-30, optional, very subtle) */}
      {containerSize.w > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none z-30"
          width="100%"
          height="100%"
          viewBox={`0 0 ${containerSize.w} ${containerSize.h}`}
          preserveAspectRatio="none"
        >
          <path
            d={frontArcPath}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="3 12"
          />
        </svg>
      )}
    </div>
  );
}

