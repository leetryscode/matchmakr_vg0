import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orbit',
    short_name: 'Orbit',
    description: 'A matchmaking platform that connects singles through Sponsors',
    start_url: '/dashboard',
    scope: '/dashboard',
    display: 'standalone',
    background_color: '#4A5D7C',
    theme_color: '#4A5D7C',
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

