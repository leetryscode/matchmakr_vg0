'use client';

import React from 'react';
import BrandMark from '@/components/branding/BrandMark';

/**
 * Footer spacer component that provides breathing room above the floating bottom nav
 * and displays a subtle brand mark, following WHOOP's design pattern.
 * 
 * This component is part of the scroll content and creates a clean "end" to the page.
 */
export default function DashboardFooterSpacer() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <BrandMark />
    </div>
  );
}

