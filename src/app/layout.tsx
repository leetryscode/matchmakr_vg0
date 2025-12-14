import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '../contexts/AuthContext';
import GlobalLayout from '../components/dashboard/GlobalLayout';

export const metadata: Metadata = {
  title: 'Orbit',
  description: 'A matchmaking platform that connects singles through Sponsors',
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