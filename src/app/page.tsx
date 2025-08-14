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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setMessage(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Check your email for the confirmation link!' })
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Check your email for the login link!' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-md">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-accent-teal rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Leaf className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="vercel-h1 text-foreground mb-4">
          The e5000
        </h1>
        <div className="mb-6">
          <p className="vercel-large text-foreground mb-2">Gardens of Babylon</p>
          <p className="vercel-muted">Professional Landscaping System</p>
        </div>
      </div>

      {/* Login Card */}
      <Card className="animate-in fade-in-50 duration-300">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isSignUp ? 'Join Our Team' : 'Sales Rep Access'}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? 'Become part of the Gardens of Babylon family' 
              : 'Access your landscaping tools and client sessions'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Auth Toggle */}
          <div className="flex rounded-lg border bg-muted p-1 mb-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSignUp(false)}
              className={`flex-1 ${
                !isSignUp 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsSignUp(true)}
              className={`flex-1 ${
                isSignUp 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </Button>
          </div>

          {/* Message Alert */}
          {message && (
            <Card className={`mb-6 border-l-4 ${
              message.type === 'success' 
                ? 'border-accent-green bg-accent-green/5' 
                : 'border-accent-red bg-accent-red/5'
            }`}>
              <CardContent className="p-4">
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-accent-green' : 'text-accent-red'
                }`}>
                  {message.text}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Auth Form */}
          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={authLoading}
              className="w-full"
              variant={isSignUp ? 'purple' : 'teal'}
            >
              {authLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                isSignUp ? 'Create Account' : 'Send Login Link'
              )}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {isSignUp 
                ? 'By signing up, you agree to our terms of service' 
                : 'We\'ll send you a secure login link via email'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Section */}
      <div className="mt-12 grid gap-6">
        <Card className="text-center bg-accent-teal/5 border-accent-teal/20">
          <CardContent className="p-6">
            <CardTitle className="text-lg text-accent-teal mb-2">Client Management</CardTitle>
            <CardDescription>
              Track client information and project progress
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center bg-accent-orange/5 border-accent-orange/20">
          <CardContent className="p-6">
            <CardTitle className="text-lg text-accent-orange mb-2">AI-Powered Mockups</CardTitle>
            <CardDescription>
              Generate landscape designs with artificial intelligence
            </CardDescription>
          </CardContent>
        </Card>
        
        <Card className="text-center bg-accent-green/5 border-accent-green/20">
          <CardContent className="p-6">
            <CardTitle className="text-lg text-accent-green mb-2">Instant Estimates</CardTitle>
            <CardDescription>
              Create professional estimates and contracts on-site
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}