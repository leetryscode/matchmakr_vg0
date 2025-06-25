import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MatchMakr',
  description: 'A new way to find a match.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-source-sans bg-background-main text-gray-800 leading-relaxed text-lg">
        {children}
      </body>
    </html>
  )
}