'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ============================================================================
// TRUST LOCKUP CONFIGURATION
// ============================================================================
// Adjust these values to tune the visual relationship between Single and Sponsor
// ============================================================================

const TRUST_LOCKUP_CONFIG = {
  // Circle sizes
  primarySizePx: 112,      // Single (larger, dominant)
  secondarySizePx: 64,     // Sponsor (smaller, supportive)
  
  // Positioning direction (relative to primary center)
  // These define the direction vector; actual distance is computed from gap/overlap
  offsetX: 80,             // Horizontal direction (positive = right)
  offsetY: -24,            // Vertical direction (negative = up)
  
  // Layout mode
  overlapMode: 'overlap' as 'overlap' | 'gap',  // 'overlap' = sponsor tucks behind, 'gap' = small space between
  gapPx: 12,               // Gap size between circle edges (only used if overlapMode === 'gap')
  overlapPx: 12,           // Overlap depth (only used if overlapMode === 'overlap') - shallow tuck
  
  // Z-index / layering
  tuckDepth: 'behind' as 'behind' | 'front',  // 'behind' = sponsor behind primary (default), 'front' = sponsor in front
  
  // Glow / connector
  glowEnabled: false,      // Bridge disabled - cleaner "trusted relationship" feel
  glowOpacity: 0.20,       // Bridge opacity (0-1, keep subtle)
  bridgeWidth: 8,         // Bridge width (px) - subtle connector between circles
  
  // Styling
  borderWidth: '1px',
  borderColor: 'rgba(255, 255, 255, 0.15)',
  primaryShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
  secondaryShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
} as const;

// ============================================================================

interface TrustLockupProps {
  primaryAvatarUrl: string | null;
  primaryName: string;
  primaryId: string;
  secondaryAvatarUrl?: string | null;
  secondaryName?: string | null;
  secondaryId?: string | null;
}

export default function TrustLockup({
  primaryAvatarUrl,
  primaryName,
  primaryId,
  secondaryAvatarUrl,
  secondaryName,
  secondaryId,
}: TrustLockupProps) {
  const router = useRouter();
  const config = TRUST_LOCKUP_CONFIG;
  
  const hasSponsor = !!secondaryAvatarUrl && !!secondaryName && !!secondaryId;
  
  // Circle radii (half of size)
  const r1 = config.primarySizePx / 2;
  const r2 = config.secondarySizePx / 2;
  
  // Primary circle center (we'll position relative to this, then translate)
  const primaryCenterX = r1;
  const primaryCenterY = r1;
  
  // Calculate direction vector from offsetX/offsetY
  const directionLength = Math.sqrt(config.offsetX * config.offsetX + config.offsetY * config.offsetY);
  
  // Calculate desired center-to-center distance based on mode
  let desiredDistance: number;
  if (hasSponsor) {
    if (config.overlapMode === 'gap') {
      desiredDistance = r1 + r2 + config.gapPx;
    } else {
      desiredDistance = r1 + r2 - config.overlapPx;
    }
  } else {
    desiredDistance = 0; // No sponsor, no need to calculate
  }
  
  // Normalize direction vector and scale to desired distance
  let secondaryCenterX = primaryCenterX;
  let secondaryCenterY = primaryCenterY;
  
  if (hasSponsor && directionLength > 0) {
    const normalizedX = config.offsetX / directionLength;
    const normalizedY = config.offsetY / directionLength;
    
    secondaryCenterX = primaryCenterX + normalizedX * desiredDistance;
    secondaryCenterY = primaryCenterY + normalizedY * desiredDistance;
  }
  
  // Calculate circle positions (top-left corners)
  const primaryLeft = 0;
  const primaryTop = 0;
  const secondaryLeft = secondaryCenterX - r2;
  const secondaryTop = secondaryCenterY - r2;
  
  // Calculate bounding box of both circles
  const bboxLeft = Math.min(primaryLeft, secondaryLeft);
  const bboxTop = Math.min(primaryTop, secondaryTop);
  const bboxRight = Math.max(primaryLeft + config.primarySizePx, secondaryLeft + config.secondarySizePx);
  const bboxBottom = Math.max(primaryTop + config.primarySizePx, secondaryTop + config.secondarySizePx);
  
  // Container size (with padding to avoid clipping shadows)
  const padding = 8;
  const containerWidth = bboxRight - bboxLeft + padding * 2;
  const containerHeight = bboxBottom - bboxTop + padding * 2;
  
  // Translate circles so bbox top-left maps to (padding, padding)
  const primaryLeftFinal = primaryLeft - bboxLeft + padding;
  const primaryTopFinal = primaryTop - bboxTop + padding;
  const secondaryLeftFinal = secondaryLeft - bboxLeft + padding;
  const secondaryTopFinal = secondaryTop - bboxTop + padding;
  
  // Calculate connector bridge position (midpoint between circle centers)
  const bridgeCenterX = (primaryCenterX - bboxLeft + padding + secondaryCenterX - bboxLeft + padding) / 2;
  const bridgeCenterY = (primaryCenterY - bboxTop + padding + secondaryCenterY - bboxTop + padding) / 2;
  
  // Bridge angle (for rotation)
  const bridgeAngle = hasSponsor && directionLength > 0
    ? Math.atan2(config.offsetY, config.offsetX) * (180 / Math.PI)
    : 0;
  
  // Bridge length (distance between circle edges)
  const bridgeLength = hasSponsor
    ? (config.overlapMode === 'gap' ? config.gapPx : Math.max(0, desiredDistance - r1 - r2))
    : 0;
  
  // Z-index values
  const primaryZIndex = config.tuckDepth === 'behind' ? 2 : 1;
  const secondaryZIndex = config.tuckDepth === 'behind' ? 1 : 2;
  
  return (
    <div className="flex flex-col items-center">
      {/* Lockup container */}
      <div 
        className="relative flex-shrink-0"
        style={{
          width: `${containerWidth}px`,
          height: `${containerHeight}px`,
        }}
      >
        {/* Connector bridge (behind both circles) - subtle gradient, no blur */}
        {config.glowEnabled && hasSponsor && config.overlapMode === 'gap' && bridgeLength > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${bridgeCenterX - bridgeLength / 2}px`,
              top: `${bridgeCenterY - config.bridgeWidth / 2}px`,
              width: `${bridgeLength}px`,
              height: `${config.bridgeWidth}px`,
              transform: `rotate(${bridgeAngle}deg)`,
              transformOrigin: 'center center',
              borderRadius: `${config.bridgeWidth / 2}px`,
              background: `linear-gradient(to right, 
                rgba(255, 255, 255, ${config.glowOpacity * 0.6}) 0%,
                rgba(255, 255, 255, ${config.glowOpacity}) 50%,
                rgba(255, 255, 255, ${config.glowOpacity * 0.6}) 100%
              )`,
              zIndex: 0,
            }}
          />
        )}
        
        {/* Primary circle (Single) */}
        <button
          onClick={() => router.push(`/profile/${primaryId}`)}
          className="absolute rounded-full overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent-teal-light transition-transform hover:scale-105"
          style={{
            left: `${primaryLeftFinal}px`,
            top: `${primaryTopFinal}px`,
            width: `${config.primarySizePx}px`,
            height: `${config.primarySizePx}px`,
            border: `${config.borderWidth} solid ${config.borderColor}`,
            boxShadow: config.primaryShadow,
            backgroundColor: '#e5e7eb', // bg-gray-200
            zIndex: primaryZIndex,
          }}
          aria-label="Go to My Profile"
        >
          {primaryAvatarUrl ? (
            <>
              <Image 
                src={primaryAvatarUrl} 
                alt={primaryName} 
                width={config.primarySizePx} 
                height={config.primarySizePx} 
                className="object-cover w-full h-full"
              />
              {/* Lens highlight overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04) 30%, rgba(255, 255, 255, 0.0) 60%)',
                }}
              />
            </>
          ) : (
            <span className="text-primary-blue font-bold" style={{ fontSize: `${config.primarySizePx * 0.4}px` }}>
              {primaryName?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </button>
        
        {/* Secondary circle (Sponsor) - only render if sponsor exists */}
        {hasSponsor && (
          <button
            onClick={() => router.push(`/profile/${secondaryId}`)}
            className="absolute rounded-full overflow-hidden flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent-teal-light transition-transform hover:scale-105"
            style={{
              left: `${secondaryLeftFinal}px`,
              top: `${secondaryTopFinal}px`,
              width: `${config.secondarySizePx}px`,
              height: `${config.secondarySizePx}px`,
              border: `${config.borderWidth} solid ${config.borderColor}`,
              boxShadow: config.secondaryShadow,
              backgroundColor: '#e5e7eb', // bg-gray-200
              zIndex: secondaryZIndex,
            }}
            aria-label={`View ${secondaryName}'s profile`}
          >
            {secondaryAvatarUrl ? (
              <>
                <Image 
                  src={secondaryAvatarUrl} 
                  alt={secondaryName || 'Sponsor'} 
                  width={config.secondarySizePx} 
                  height={config.secondarySizePx} 
                  className="object-cover w-full h-full"
                />
                {/* Lens highlight overlay */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    borderRadius: '50%',
                    background: 'radial-gradient(circle at top left, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04) 30%, rgba(255, 255, 255, 0.0) 60%)',
                  }}
                />
              </>
            ) : (
              <span className="text-primary-blue font-bold" style={{ fontSize: `${config.secondarySizePx * 0.4}px` }}>
                {secondaryName?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </button>
        )}
      </div>
      
      {/* Single contextual label - only show if sponsor exists */}
      {hasSponsor && secondaryName && (
        <button
          onClick={() => router.push(`/profile/${secondaryId}`)}
          className="type-body text-white/70 hover:text-white/90 hover:underline focus:outline-none focus:underline transition-colors mt-4"
          aria-label={`View ${secondaryName}'s profile`}
        >
          Introduced by {secondaryName}
        </button>
      )}
    </div>
  );
}
