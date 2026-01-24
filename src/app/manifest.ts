import { MetadataRoute } from 'next'
import { themeColor, backgroundColor } from '../config/theme'

/**
 * Web App Manifest for Orbit PWA
 * 
 * PWA DESIGN DECISION: Orbit intentionally does NOT use a service worker.
 * 
 * Installability is achieved through:
 * - Web App Manifest (this file)
 * - display: "standalone" mode
 * - start_url + scope configuration
 * 
 * Why no service worker?
 * - Faster iteration during MVP (avoids stale cache issues)
 * - Simpler debugging and deployment
 * - Installability works without SW for basic PWA features
 * 
 * NOTE: Do not add next-pwa or service worker without understanding this trade-off.
 * If offline functionality is needed later, consider a minimal SW with careful cache strategy.
 */

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orbit',
    short_name: 'Orbit',
    description: 'A matchmaking platform that connects singles through Sponsors',
    start_url: '/dashboard',
    // Broad scope allows all routes to render within PWA container (MVP choice)
    // This ensures app-native experience across all pages (Pond, profile, etc.)
    // and avoids premature route refactors. Can be tightened later if needed.
    scope: '/',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    // NOTE: Icons are currently placeholders (solid color #4A5D7C with "O").
    // Replace with proper brand assets before production launch.
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icons/maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

