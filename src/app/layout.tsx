import type { Metadata } from 'next'
import './globals.css'
import GlobalConfettiBlast from '../components/GlobalConfettiBlast';
import { AuthProvider } from '../contexts/AuthContext';

export const metadata: Metadata = {
  title: 'MatchMakr',
  description: 'Find your perfect match',
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
          <GlobalConfettiBlast>
            {children}
          </GlobalConfettiBlast>
        </AuthProvider>
      </body>
    </html>
  )
}