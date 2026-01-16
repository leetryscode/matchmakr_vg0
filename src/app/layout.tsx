import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext';
import GlobalLayout from '../components/dashboard/GlobalLayout';

/**
 * PWA Metadata Configuration
 * 
 * iOS PWA Support:
 * - appleWebApp.capable: Enables standalone mode on iOS
 * - appleWebApp.statusBarStyle: Black-translucent for immersive overlay
 * - apple icons: Required for home screen icon (180x180)
 * 
 * Validation: See PWA_VALIDATION.md or comments in manifest.ts for testing checklist
 */
export const metadata: Metadata = {
  title: 'Orbit',
  description: 'A matchmaking platform that connects singles through Sponsors',
  manifest: '/manifest.webmanifest',
  themeColor: '#4A5D7C',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true, // Enables standalone mode: apple-mobile-web-app-capable="yes"
    statusBarStyle: 'black-translucent', // Immersive status bar overlay
    title: 'Orbit',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-source-sans text-gray-800 leading-relaxed text-lg">
        <AuthProvider>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </AuthProvider>
      </body>
    </html>
  )
}