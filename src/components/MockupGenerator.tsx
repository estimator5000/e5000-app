'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Wand2, Loader2, Download, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Session = Database['public']['Tables']['sessions']['Row']
type Mockup = Database['public']['Tables']['mockups']['Row']

interface MockupGeneratorProps {
  session: Session
  onMockupGenerated: (mockup: Mockup) => void
  onFinalized?: (imageUrl: string) => void
}

export default function MockupGenerator({ session, onMockupGenerated, onFinalized }: MockupGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')
  const [mockups, setMockups] = useState<Mockup[]>([])
  const [selectedMockup, setSelectedMockup] = useState<Mockup | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMockups()
  }, [session.id])

  const fetchMockups = async () => {
    const { data, error } = await supabase
      .from('mockups')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching mockups:', error)
    } else {
      setMockups(data || [])
      if (data && data.length > 0) {
        setSelectedMockup(data[0])
      }
    }
    setLoading(false)
  }

  const generateMockup = async () => {
    if (!session.original_image_url) {
      alert('Please upload a property photo first.')
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate-mockup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          imageUrl: session.original_image_url,
          prompt: customPrompt,
          customInstructions: `Property type: Residential landscaping for ${session.client_name}. ${session.notes || ''}`
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate mockup')
      }

      // Refresh mockups
      await fetchMockups()

      // Trigger callback
      const newMockup = {
        id: result.mockup.id,
        session_id: session.id,
        image_url: result.mockup.imageUrl,
        prompt: result.mockup.prompt,
        ai_provider: 'openai-dalle3',
        is_final: false,
        created_at: new Date().toISOString()
      } as Mockup

      onMockupGenerated(newMockup)

    } catch (error) {
      console.error('Error generating mockup:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate mockup. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const markAsFinal = async (mockupId: string) => {
    try {
      console.log('Marking as final', { mockupId, sessionId: session.id })
      const res = await fetch('/api/mark-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, mockupId })
      })
      const text = await res.text()
      let json: any
      try { json = JSON.parse(text) } catch { json = { raw: text } }
      if (!res.ok) throw new Error(json?.error || 'Failed to mark final')

      if (json.final_mockup_url && onFinalized) onFinalized(json.final_mockup_url)
      await fetchMockups()
      alert('Mockup marked as final!')
    } catch (error: any) {
      console.error('Error marking mockup as final:', error?.message || error)
      alert(`Failed to mark mockup as final: ${error?.message || 'Unknown error'}`)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p>Loading mockups...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="card-stack">
      {/* Original Photo Reference */}
      {session.original_image_url && (
        <div className="retro-card-tile">
          <div className="mb-2">
            <h3 className="retro-card-title">Original Property Photo</h3>
          </div>
          <div className="flex justify-center">
            <img
              src={session.original_image_url}
              alt="Original property"
              className="max-w-3xl w-full rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Mockup Generation */}
      <div className="retro-card-tile">
        <div className="mb-3">
          <h3 className="retro-card-title text-base flex items-center">
            <Palette className="w-5 h-5 mr-2" /> AI Mockup Generation
          </h3>
          <p className="retro-card-meta">Generate beautiful landscaping designs using AI</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="prompt" className="retro-card-meta">Custom Design Instructions (optional)</Label>
            <Input
              id="prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Add colorful flowers, modern hardscaping, drought-resistant plants..."
              disabled={isGenerating}
              className="vercel-input"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={generateMockup}
              disabled={isGenerating || !session.original_image_url}
              className="retro-cta"
            >
              {isGenerating ? 'Generating Mockup… (30-60s)' : 'Generate AI Mockup'}
            </button>
          </div>
          {!session.original_image_url && (
            <p className="text-sm text-red-500 text-center">Please upload a property photo in the previous step first.</p>
          )}
        </div>
      </div>

      {/* Generated Mockups */}
      {mockups.length > 0 && (
        <div className="retro-card-tile">
          <div className="mb-3">
            <h3 className="retro-card-title">Generated Mockups</h3>
            <p className="retro-card-meta">Select your preferred design and mark it as final</p>
          </div>
          <div>
            <div className="grid gap-4">
              {mockups.map((mockup, index) => (
                <div 
                  key={mockup.id} 
                  className={`rounded-lg p-4 cursor-pointer transition-shadow ${
                    selectedMockup?.id === mockup.id 
                      ? 'shadow-md bg-orange-50' 
                      : 'shadow-sm hover:shadow-md'
                  }`}
                  onClick={() => setSelectedMockup(mockup)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">Mockup {index + 1} {mockup.is_final && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Final</span>
                        )}</h4>
                        <p className="text-sm text-gray-500">Generated {new Date(mockup.created_at!).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); window.open(mockup.image_url, '_blank') }}
                        className="retro-chip"
                        title="Open full image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <img src={mockup.image_url} alt={`Mockup ${index + 1}`} className="w-full max-w-3xl mx-auto rounded-lg object-cover" />
                    {!mockup.is_final && (
                      <div className="flex justify-end mt-8">
                        <button className="retro-cta" onClick={(e) => { e.stopPropagation(); markAsFinal(mockup.id) }}>
                          Mark as Final
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selected Mockup Preview */}
      {selectedMockup && (
        <div className="retro-card-tile">
          <div className="mb-2">
            <h3 className="retro-card-title">Preview</h3>
          </div>
          <div className="flex justify-center">
            <img src={selectedMockup.image_url} alt="Selected mockup" className="max-w-3xl w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}

