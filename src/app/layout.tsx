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
          {/* Global Header with retro styling */}
          <div className="px-4 pt-4 mb-2 md:mb-3">
            <header className="vintage-header max-w-5xl mx-auto">
              <div>
                <h1 className="vh-title">e5000</h1>
                <p className="vh-subtitle">Gardens of Babylon</p>
              </div>
            </header>
          </div>

          {/* Main Content */}
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 pt-2 pb-12">
              {children}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border bg-white mt-auto">
            <div className="max-w-5xl mx-auto px-4 py-6">
              <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-3">
                  <span className="vercel-small text-muted-foreground">Powered by The e5000 System</span>
                </div>
                <div className="vercel-small text-muted-foreground">© 2025 Gardens of Babylon • Professional Landscaping Solutions</div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}