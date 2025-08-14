import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The e5000 - Gardens of Babylon',
  description: 'Professional landscaping estimates and mockups on the go',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'The e5000'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <div className="min-h-screen flex flex-col">
          {/* Vercel-style Header */}
          <header className="border-b border-border bg-white">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Logo */}
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-accent-teal rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">e5</span>
                    </div>
                    <div>
                      <h1 className="vercel-h4 text-foreground">The e5000</h1>
                      <p className="vercel-small text-muted-foreground">Gardens of Babylon</p>
                    </div>
                  </div>
                </div>
                
                {/* Header Badge */}
                <div className="hidden md:block">
                  <div className="vercel-mono border border-border bg-secondary">
                    Professional Landscaping
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Vercel-style Footer */}
          <footer className="border-t border-border bg-white mt-auto">
            <div className="container mx-auto px-6 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-accent-teal rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">e5</span>
                  </div>
                  <span className="vercel-small text-muted-foreground">
                    Powered by The e5000 System
                  </span>
                </div>
                <div className="vercel-small text-muted-foreground">
                  © 2025 Gardens of Babylon • Professional Landscaping Solutions
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}