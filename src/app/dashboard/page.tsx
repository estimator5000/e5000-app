'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Calendar, 
  User as UserIcon, 
  MapPin, 
  Camera, 
  Palette, 
  Calculator,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Session = Database['public']['Tables']['sessions']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'signed' | 'completed' | 'draft'>('all')

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
      
      // Get sessions
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('*')
        .eq('sales_rep_id', existingProfile.id)
        .order('created_at', { ascending: false })
      
      setSessions(sessionsData || [])
      setLoading(false)
    }

    getProfile()
  }, [])

  const createNewSession = async () => {
    if (!profile) return
    
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
      return
    }
    
    window.location.href = `/dashboard/session/${data.id}`
  }

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Delete this session? This action cannot be undone.')) return
    setDeletingId(sessionId)
    try {
      // Remove dependent estimate rows first to satisfy FK
      await supabase.from('estimates').delete().eq('session_id', sessionId)
      // Remove mockups
      await supabase.from('mockups').delete().eq('session_id', sessionId)
      // Remove the session
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId)
      if (error) throw error
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch (e) {
      console.error('Delete session failed', e)
      alert('Failed to delete session')
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4" />
      case 'mockup_created': return <Palette className="w-4 h-4" />
      case 'estimate_generated': return <Calculator className="w-4 h-4" />
      case 'contract_signed': return <FileText className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'mockup_created': return 'bg-blue-100 text-blue-800'
      case 'estimate_generated': return 'bg-yellow-100 text-yellow-800'
      case 'contract_signed': return 'bg-purple-100 text-purple-800'
      case 'completed': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">Loading Dashboard...</p>
        </div>
      </div>
    )
  }

  const sessionsToShow = sessions.filter(s => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'draft') return (s.status || 'draft') === 'draft'
    if (statusFilter === 'in_progress') return ['draft','mockup_created','estimate_generated'].includes(s.status || '')
    if (statusFilter === 'signed') return (s.status || '') === 'contract_signed'
    if (statusFilter === 'completed') return (s.status || '') === 'completed'
    return true
  })
  // Limit to the 8 most recent (others considered archived)
  const limitedSessions = sessionsToShow.slice(0, 8)

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-5xl mx-auto space-y-8 page-gap">
        {/* Retro teal header with chips */}
        <div className="retro-screen section-gap-bottom">
          <div className="grid grid-cols-3 items-center gap-4">
            <div />
            <div className="text-center">
              <h1 className="retro-heading">Explore Client Sessions</h1>
              <p className="retro-subheading">Find and manage your latest landscaping projects</p>
            </div>
            <div className="flex justify-end">
              <button onClick={createNewSession} className="retro-cta" style={{border:'none'}}>
                <Plus className="w-5 h-5 mr-2" /> New Session
              </button>
            </div>
          </div>

          <div className="mt-6 chip-group justify-center">
            {[
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'in_progress', label: 'In progress' },
              { id: 'signed', label: 'Signed' },
              { id: 'completed', label: 'Completed' },
            ].map(chip => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`retro-chip ${statusFilter === chip.id ? 'active' : ''}`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid of session tiles */}
        {limitedSessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 mb-4">No sessions match this filter.</p>
            <button onClick={() => setStatusFilter('all')} className="retro-cta">Clear filter</button>
          </div>
        ) : (
          <div className="card-grid section-gap-top section-gap-bottom">
            {limitedSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => (window.location.href = `/dashboard/session/${session.id}`)}
                className="text-left retro-card-tile"
              >
                <div className="retro-card-image mb-3" />
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="retro-card-title truncate">{session.client_name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status || 'draft')}`}>{formatStatus(session.status || 'draft')}</span>
                  </div>
                  <p className="retro-card-meta flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(session.created_at!), { addSuffix: true })}
                  </p>
                  {session.client_address && (
                    <p className="retro-card-meta flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {session.client_address}
                    </p>
                  )}
                </div>
                <div className="tile-row mt-2">
                  <div />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id) }}
                    className="retro-chip"
                    disabled={deletingId === session.id}
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {deletingId === session.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
