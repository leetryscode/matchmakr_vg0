# PWA Validation Checklist for Orbit

This document outlines validation steps to ensure Orbit's PWA installability and behavior remain correct during development.

## Installation Behavior

### Android (Chrome)

1. **Lighthouse Audit**
   - Run Lighthouse in Chrome DevTools
   - Verify "Installable" check passes
   - Confirm manifest is valid and icons are found

2. **Browser Menu**
   - Visit Orbit in Chrome on Android
   - Open browser menu (⋮)
   - "Install app" or "Add to Home Screen" should be visible
   - Tap to install

3. **Post-Install**
   - App opens without browser address bar
   - Standalone display mode is active
   - Icons display correctly

### iOS (Safari)

1. **Share Menu**
   - Visit Orbit in Safari on iOS
   - Tap Share button (square with arrow)
   - "Add to Home Screen" option should appear

2. **Home Screen Icon**
   - After adding, icon appears on home screen
   - Icon uses `/apple-touch-icon.png` (180x180)
   - Status bar style is black-translucent (overlays content)

3. **App Launch**
   - Tap home screen icon
   - App opens without Safari browser chrome (standalone mode)
   - No address bar visible
   - Status bar overlays correctly

## App Launch Behavior

### Home Screen Launch

1. **Initial Route**
   - Tapping home screen icon should open `/dashboard`
   - Middleware redirects to role-specific dashboard (`/dashboard/matchmakr`, `/dashboard/single`, etc.)
   - No browser UI visible

2. **Standalone Mode**
   - Verify `display-mode: standalone` is active
   - No browser navigation controls
   - Status bar overlays content (iOS)

### Browser Navigation

1. **Normal Browser Access**
   - Opening Orbit in Safari/Chrome normally should work as before
   - All routes accessible
   - Install nudge appears only in browser mode (not standalone)

## Regression Checks

### Install Nudge Behavior

1. **Visibility Rules**
   - Shows: Authenticated users in browser mode on `/dashboard` routes
   - Hides: Standalone mode, chat routes, when chat modal open, after dismissal (14-day cooldown)
   - Mobile only: Does not show on desktop

2. **Standalone Detection**
   - Nudge should NOT appear when app is launched from home screen
   - Verify `window.matchMedia('(display-mode: standalone)')` detection works

### PWA Configuration

1. **Manifest**
   - Path: `/manifest.webmanifest`
   - `start_url`: `/dashboard` (not `/`)
   - `scope`: `/dashboard`
   - `display`: `standalone`

2. **Icons**
   - Manifest icons: `/icons/icon-192.png`, `/icons/icon-512.png`, `/icons/maskable-512.png`
   - Apple Touch Icon: `/apple-touch-icon.png` (180x180)
   - All files should exist in `public/` directory

3. **iOS Meta Tags**
   - `apple-mobile-web-app-capable`: "yes" (via `appleWebApp.capable: true`)
   - `apple-mobile-web-app-status-bar-style`: "black-translucent" (via `statusBarStyle`)
   - Apple Touch Icon referenced in metadata

## Common Issues

### Install Prompt Not Appearing

- **Check**: Manifest is accessible at `/manifest.webmanifest`
- **Check**: All required icons exist and are valid PNGs
- **Check**: App is served over HTTPS (or localhost for development)
- **Check**: No service worker conflicts (Orbit intentionally has no SW)

### iOS Icon Not Showing

- **Check**: `/apple-touch-icon.png` exists at public root (not in `/icons/`)
- **Check**: File is exactly 180x180 pixels
- **Check**: Icon is referenced in `layout.tsx` metadata under `icons.apple`

### App Opens in Browser Instead of Standalone

- **Check**: Manifest `display` is set to `"standalone"` (not `"browser"`)
- **Check**: iOS: Verify `apple-mobile-web-app-capable` meta tag exists
- **Check**: User actually installed via home screen (not bookmark)

## Development Notes

- **No Service Worker**: Orbit intentionally omits a service worker for MVP
  - Installability works via manifest alone
  - Avoids stale cache issues during rapid iteration
  - See `manifest.ts` comments for rationale

- **Icon Placeholders**: Current icons are simple placeholders (#4A5D7C background)
  - Replace with brand assets before production
  - See `manifest.ts` for icon paths and sizes

## Quick Validation Commands

```bash
# Check manifest is accessible
curl http://localhost:3000/manifest.webmanifest

# Verify icons exist
ls -la public/icons/
ls -la public/apple-touch-icon.png

# Check for accidental service worker registration (should find none)
grep -r "serviceWorker" src/ --exclude-dir=node_modules || echo "No SW found ✓"
```

