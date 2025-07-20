import type { Metadata } from 'next'
import './globals.css'
import GlobalConfettiBlast from '../components/GlobalConfettiBlast';
import { AuthProvider } from '../contexts/AuthContext';
import GlobalLayout from '../components/dashboard/GlobalLayout';

export const metadata: Metadata = {
  title: 'GreenLight',
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
          <GlobalConfettiBlast>
            <GlobalLayout>
              {children}
            </GlobalLayout>
          </GlobalConfettiBlast>
        </AuthProvider>
      </body>
    </html>
  )
}