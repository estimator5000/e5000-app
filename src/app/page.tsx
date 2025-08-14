'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Home() {
  const [email, setEmail] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [password, setPassword] = useState('devpass123!')

  const doAuth = async (signUp: boolean) => {
    setIsSignUp(signUp)
    setAuthLoading(true)
    setMessage(null)

    try {
      // Dev password flow: create-or-update user via server, then client sign-in
      const res = await fetch('/api/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Dev login failed')

      // Client sign-in with password (no email link)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      window.location.href = '/dashboard'
    } catch (error: any) {
      if (error.message?.includes('31 seconds') || error.message?.includes('rate limit')) {
        setMessage({ type: 'error', text: 'Please wait a moment before trying again. This helps keep your account secure.' })
      } else {
        setMessage({ type: 'error', text: error.message })
      }
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="space-y-12">
      {/* Auth Card in retro style */}
      <div className="max-w-md mx-auto w-full card-stack">
        <div className="retro-card-tile">
          <div className="flex flex-col items-center text-center mb-4">
            <h2 className="retro-card-title text-base">{isSignUp ? 'Create Account' : 'Sign In'}</h2>
            <p className="retro-card-meta">Access your tools and client sessions</p>
          </div>

          

          {message && (
            <div className={`mb-6 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={(e)=>e.preventDefault()} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="retro-card-meta text-center block">Email Address</label>
              <div className="flex justify-center">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="vercel-input text-center w-[420px] max-w-full"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="retro-card-meta text-center block">Password</label>
              <div className="flex justify-center">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="vercel-input text-center w-[420px] max-w-full"
                  placeholder="Choose a password"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-4 pt-6">
              <button type="button" disabled={authLoading} onClick={() => doAuth(false)} className="retro-cta px-8">
                Sign In
              </button>
              <button type="button" disabled={authLoading} onClick={() => doAuth(true)} className="retro-cta px-8">
                Sign Up
              </button>
            </div>
          </form>
          <div className="text-center mt-6">
            <p className="retro-card-meta">
              {isSignUp ? 'By creating an account, you agree to our terms of service' : 'We\'ll send you a secure email link to sign in'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="max-w-5xl mx-auto card-grid">
        {[{t:'Client Management',d:'Track client information and project progress'},{t:'AI-Powered Mockups',d:'Generate landscape designs with AI'},{t:'Instant Estimates',d:'Create professional estimates on-site'}].map((f) => (
          <div key={f.t} className="retro-card-tile">
            <div className="retro-card-image mb-3"><div className="w-10 h-10 bg-white rounded-lg" /></div>
            <h3 className="retro-card-title mb-1">{f.t}</h3>
            <p className="retro-card-meta">{f.d}</p>
          </div>
        ))}
      </div>
    </div>
  )
}