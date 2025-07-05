import type { Metadata } from 'next'
import './globals.css'
import GlobalConfettiBlast from '../components/GlobalConfettiBlast';

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
      <body className="font-source-sans bg-background-main text-gray-800 leading-relaxed text-lg">
        <GlobalConfettiBlast>
          {children}
        </GlobalConfettiBlast>
      </body>
    </html>
  )
}