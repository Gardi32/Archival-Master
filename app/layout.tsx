import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'ArchivalMaster',
  description: 'Gestión profesional de producción de archivo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full bg-[#0f0f0f] text-[#ededed] antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  )
}
