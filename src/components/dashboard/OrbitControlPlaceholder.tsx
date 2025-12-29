'use client';

import React from 'react';
import Link from 'next/link';

interface SponsoredSingle {
  id: string;
  name: string | null;
  profile_pic_url: string | null;
}

interface OrbitControlPlaceholderProps {
  userId: string;
  userName: string;
  userProfilePic: string | null;
  sponsoredSingles: SponsoredSingle[];
}

export default function OrbitControlPlaceholder({
  userId,
  userName,
  userProfilePic,
  sponsoredSingles,
}: OrbitControlPlaceholderProps) {
  // Simple hash function for deterministic "random" variation
  const hash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };

  // Calculate positions for orbiting circles
  const calculateOrbitPositions = (singles: SponsoredSingle[], ringIndex: number = 0) => {
    const positions: Array<{ angle: number; radius: number }> = [];
    
    // Define orbital radii for different rings
    const radii = [120, 180]; // Inner and outer ring radii
    const radius = radii[ringIndex] || radii[radii.length - 1];
    
    // Organic spacing: add slight variation to angles based on single ID
    const baseAngle = (2 * Math.PI) / singles.length;
    const variation = 0.15; // 15% variation for organic feel
    
    singles.forEach((single, i) => {
      // Use single ID to create deterministic variation
      const hashValue = hash(single.id);
      const normalizedHash = (hashValue % 100) / 100; // 0 to 1
      const angle = baseAngle * i + (normalizedHash - 0.5) * variation;
      positions.push({ angle, radius });
    });
    
    return positions;
  };

  // Distribute singles across rings
  const distributeSingles = () => {
    if (sponsoredSingles.length === 0) return { inner: [], outer: [] };
    
    if (sponsoredSingles.length <= 6) {
      // Single ring
      return {
        inner: sponsoredSingles,
        outer: [],
      };
    } else {
      // Multiple rings: split roughly in half
      const midPoint = Math.ceil(sponsoredSingles.length / 2);
      return {
        inner: sponsoredSingles.slice(0, midPoint),
        outer: sponsoredSingles.slice(midPoint),
      };
    }
  };

  const { inner, outer } = distributeSingles();
  
  // Use viewport-based sizing for mobile (25vh = 1/4 of screen)
  // Scale everything proportionally
  const baseSize = 200; // Base size for calculations
  const scale = 1; // Will be handled via CSS
  
  // Calculate positions with scaled radii
  const calculateOrbitPositionsScaled = (singles: SponsoredSingle[], ringIndex: number = 0) => {
    const positions: Array<{ angle: number; radius: number }> = [];
    
    // Scaled orbital radii (proportional to 25vh container)
    const radii = [baseSize * 0.4, baseSize * 0.6]; // Inner and outer ring radii
    const radius = radii[ringIndex] || radii[radii.length - 1];
    
    // Organic spacing: add slight variation to angles based on single ID
    const baseAngle = (2 * Math.PI) / singles.length;
    const variation = 0.15; // 15% variation for organic feel
    
    singles.forEach((single, i) => {
      // Use single ID to create deterministic variation
      const hashValue = hash(single.id);
      const normalizedHash = (hashValue % 100) / 100; // 0 to 1
      const angle = baseAngle * i + (normalizedHash - 0.5) * variation;
      positions.push({ angle, radius });
    });
    
    return positions;
  };

  const innerPositions = calculateOrbitPositionsScaled(inner, 0);
  const outerPositions = calculateOrbitPositionsScaled(outer, 1);

  // Container dimensions - responsive to viewport
  const containerSize = baseSize;
  const centerX = containerSize / 2;
  const centerY = containerSize / 2;
  
  // Scaled circle sizes (as percentages for responsive scaling)
  const centralSizePercent = 30; // 30% of container
  const innerOrbitSizePercent = 15; // 15% of container
  const outerOrbitSizePercent = 12; // 12% of container

  // Render orbiting circle
  const renderOrbitingCircle = (
    single: SponsoredSingle,
    position: { angle: number; radius: number },
    sizePercent: number
  ) => {
    // Calculate position as percentage for responsive scaling
    const xPercent = 50 + (Math.cos(position.angle) * position.radius / containerSize) * 100;
    const yPercent = 50 + (Math.sin(position.angle) * position.radius / containerSize) * 100;

    return (
      <Link
        key={single.id}
        href={`/profile/${single.id}`}
        className="absolute group"
        style={{
          left: `${xPercent}%`,
          top: `${yPercent}%`,
          transform: 'translate(-50%, -50%)',
          width: `${sizePercent}%`,
          height: `${sizePercent}%`,
        }}
      >
        <div
          className="rounded-full border border-white/30 bg-gray-200 overflow-hidden flex items-center justify-center group-hover:scale-110 transition w-full h-full"
        >
          {single.profile_pic_url ? (
            <img
              src={single.profile_pic_url}
              alt={single.name || 'Single'}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-white font-bold text-xs sm:text-sm">
              {single.name?.charAt(0).toUpperCase() || '?'}
            </span>
          )}
        </div>
      </Link>
    );
  };

  // Generate orbital path SVG
  const renderOrbitalPath = (radius: number, index: number) => {
    // Create ellipse path
    const rx = radius * 0.9; // Slightly compressed for organic feel
    const ry = radius * 0.7;
    
    return (
      <ellipse
        key={`orbit-${index}`}
        cx={centerX}
        cy={centerY}
        rx={rx}
        ry={ry}
        fill="none"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="0.5"
        strokeDasharray="2,2"
        transform={`rotate(${index * 15} ${centerX} ${centerY})`}
      />
    );
  };

  return (
    <div className="py-4 px-4 flex justify-center overflow-hidden">
      <div 
        className="relative mx-auto"
        style={{ 
          width: '25vh',
          height: '25vh',
          minWidth: '200px',
          minHeight: '200px',
          maxWidth: '250px',
          maxHeight: '250px',
        }}
      >
        {/* SVG for orbital paths */}
        <svg
          className="absolute inset-0"
          viewBox={`0 0 ${containerSize} ${containerSize}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ overflow: 'visible' }}
        >
          {inner.length > 0 && renderOrbitalPath(innerPositions[0]?.radius || 80, 0)}
          {outer.length > 0 && renderOrbitalPath(outerPositions[0]?.radius || 120, 1)}
        </svg>

        {/* Central circle (sponsor) */}
        <Link
          href={`/profile/${userId}`}
          className="absolute group"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            width: `${centralSizePercent}%`,
            height: `${centralSizePercent}%`,
          }}
        >
          <div 
            className="rounded-full border-2 border-white/40 bg-gray-200 overflow-hidden flex items-center justify-center group-hover:scale-110 transition w-full h-full"
          >
            {userProfilePic ? (
              <img
                src={userProfilePic}
                alt={userName}
                className="object-cover w-full h-full"
              />
            ) : (
              <span className="text-white font-bold text-2xl sm:text-3xl">
                {userName?.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
        </Link>

        {/* Orbiting circles - inner ring */}
        {inner.map((single, index) =>
          renderOrbitingCircle(single, innerPositions[index], innerOrbitSizePercent)
        )}

        {/* Orbiting circles - outer ring */}
        {outer.map((single, index) =>
          renderOrbitingCircle(single, outerPositions[index], outerOrbitSizePercent)
        )}

        {/* Empty state - show AddSingleButton if no singles */}
        {sponsoredSingles.length === 0 && (
          <div 
            className="absolute" 
            style={{ 
              left: '50%', 
              top: '75%', 
              transform: 'translate(-50%, -50%)' 
            }}
          >
            <button
              onClick={() => document.getElementById('invite-single-modal')?.click()}
              className="flex flex-col items-center group focus:outline-none"
              style={{ width: `${innerOrbitSizePercent}%`, height: `${innerOrbitSizePercent}%` }}
            >
              <div 
                className="rounded-full border border-white/30 bg-white/5 hover:bg-white/10 flex items-center justify-center group-hover:scale-110 transition w-full h-full"
              >
                <svg 
                  className="text-white/60 w-1/2 h-1/2" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

