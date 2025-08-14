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
}

export default function MockupGenerator({ session, onMockupGenerated }: MockupGeneratorProps) {
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
      // Mark all mockups as not final first
      await supabase
        .from('mockups')
        .update({ is_final: false })
        .eq('session_id', session.id)

      // Mark selected mockup as final
      const { error } = await supabase
        .from('mockups')
        .update({ is_final: true })
        .eq('id', mockupId)

      if (error) {
        throw error
      }

      // Update session with final mockup URL
      const finalMockup = mockups.find(m => m.id === mockupId)
      if (finalMockup) {
        await supabase
          .from('sessions')
          .update({ 
            final_mockup_url: finalMockup.image_url,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)
      }

      await fetchMockups()
      alert('Mockup marked as final!')

    } catch (error) {
      console.error('Error marking mockup as final:', error)
      alert('Failed to mark mockup as final')
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
    <div className="space-y-6">
      {/* Original Photo Reference */}
      {session.original_image_url && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Original Property Photo</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={session.original_image_url} 
              alt="Original property" 
              className="w-full max-w-md rounded-lg border"
            />
          </CardContent>
        </Card>
      )}

      {/* Mockup Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Palette className="w-5 h-5 mr-2" />
            AI Mockup Generation
          </CardTitle>
          <CardDescription>
            Generate beautiful landscaping designs using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="prompt">Custom Design Instructions (optional)</Label>
            <Input
              id="prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., Add colorful flowers, modern hardscaping, drought-resistant plants..."
              disabled={isGenerating}
            />
          </div>

          <Button
            onClick={generateMockup}
            disabled={isGenerating || !session.original_image_url}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating Mockup... (30-60 seconds)
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                Generate AI Mockup
              </>
            )}
          </Button>

          {!session.original_image_url && (
            <p className="text-sm text-red-500 text-center">
              Please upload a property photo in the previous step first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Generated Mockups */}
      {mockups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Mockups</CardTitle>
            <CardDescription>
              Select your preferred design and mark it as final
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {mockups.map((mockup, index) => (
                <div 
                  key={mockup.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedMockup?.id === mockup.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedMockup(mockup)}
                >
                  <div className="flex items-start space-x-4">
                    <img 
                      src={mockup.image_url} 
                      alt={`Mockup ${index + 1}`}
                      className="w-32 h-32 object-cover rounded"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">
                            Mockup {index + 1}
                            {mockup.is_final && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Final
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Generated {new Date(mockup.created_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {!mockup.is_final && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsFinal(mockup.id)
                              }}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Mark as Final
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(mockup.image_url, '_blank')
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Mockup Preview */}
      {selectedMockup && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <img 
              src={selectedMockup.image_url} 
              alt="Selected mockup" 
              className="w-full rounded-lg border"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

