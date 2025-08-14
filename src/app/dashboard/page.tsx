'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { Plus, Leaf } from 'lucide-react'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/'
        return
      }
      
      setUser(user)
      
      // Get or create profile
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (!existingProfile) {
        const { data: newProfile, error } = await supabase
          .from('profiles')
          .insert([{ 
            user_id: user.id, 
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Sales Rep',
            created_at: new Date().toISOString()
          }])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating profile:', error)
          return
        }
        existingProfile = newProfile
      }
      
      setProfile(existingProfile)
      setLoading(false)
    }

    getProfile()
  }, [])

  const createNewSession = async () => {
    if (!profile) return
    
    setCreating(true)
    
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        sales_rep_id: profile.id,
        client_name: 'New Client',
        status: 'draft',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating session:', error)
      setCreating(false)
      return
    }
    
    // Redirect to the new session
    window.location.href = `/dashboard/session/${data.id}`
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="vercel-spinner mx-auto mb-4"></div>
          <p className="vercel-muted">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-md">
      {/* Header Section */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-accent-teal rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Leaf className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="vercel-h1 text-foreground mb-4">
          Welcome Back
        </h1>
        <div className="mb-6">
          <p className="vercel-large text-foreground mb-2">
            {profile?.full_name || 'Sales Rep'}
          </p>
          <p className="vercel-muted">Ready to start a new landscaping project?</p>
        </div>
      </div>

      {/* Action Card */}
      <div className="p-6 rounded-2xl bg-accent-teal/8 border border-gray-200 text-center mb-8">
        <div className="w-16 h-16 bg-accent-teal rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Plus className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="vercel-h3 text-foreground mb-4">
          Start New Client Session
        </h2>
        <p className="vercel-muted mb-8">
          Create a new landscaping project session with client information, photos, AI mockups, estimates, and contracts.
        </p>
        
        <button
          onClick={createNewSession}
          disabled={creating}
          className="w-full vercel-btn vercel-btn-teal mb-4"
        >
          {creating ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="vercel-spinner"></div>
              <span>Creating Session...</span>
            </div>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              New Client Session
            </>
          )}
        </button>
        
        <p className="vercel-small text-muted-foreground">
          This will create a new workflow session for your client
        </p>
      </div>

      {/* Workflow Steps Info */}
      <div className="p-6 rounded-2xl bg-gray-50 border border-gray-200 mb-8">
        <h3 className="vercel-h4 text-foreground mb-4">Session Workflow</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-teal rounded-full flex items-center justify-center text-white text-xs font-mono">1</div>
            <span className="vercel-muted">Client Information</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-orange rounded-full flex items-center justify-center text-white text-xs font-mono">2</div>
            <span className="vercel-muted">Photo Upload</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-purple rounded-full flex items-center justify-center text-white text-xs font-mono">3</div>
            <span className="vercel-muted">AI Mockup Generation</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-green rounded-full flex items-center justify-center text-white text-xs font-mono">4</div>
            <span className="vercel-muted">Project Estimate</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-red rounded-full flex items-center justify-center text-white text-xs font-mono">5</div>
            <span className="vercel-muted">Contract Signing</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 bg-accent-teal rounded-full flex items-center justify-center text-white text-xs font-mono">6</div>
            <span className="vercel-muted">Project Complete</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <div className="text-center">
        <button
          onClick={handleSignOut}
          className="vercel-btn vercel-btn-ghost"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}