import type { Metadata, Viewport } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'DatoqDato — Agenda de Oficios',
  description: 'Encontrá profesionales verificados cerca tuyo. Plomeros, electricistas, gasistas y más con reseñas reales.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DatoqDato',
  },
  openGraph: {
    title: 'DatoqDato — Agenda de Oficios',
    description: 'Encontrá profesionales verificados cerca tuyo con reseñas reales.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${dmSans.variable} font-sans bg-slate-50 text-slate-800 antialiased`}>
        {children}
      </body>
    </html>
  )
}
