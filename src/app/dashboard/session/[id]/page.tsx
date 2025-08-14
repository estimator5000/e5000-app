'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  User,
  Camera, 
  Palette, 
  Calculator,
  FileText,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Edit3,
  Loader2
} from 'lucide-react'
import PhotoCapture from '@/components/PhotoCapture'
import ClientInfoForm from '@/components/ClientInfoForm'
import MockupGenerator from '@/components/MockupGenerator'
import EstimateBuilder from '@/components/EstimateBuilder'
import ContractGenerator from '@/components/ContractGenerator'

type Session = Database['public']['Tables']['sessions']['Row']
type Estimate = Database['public']['Tables']['estimates']['Row']

const WORKFLOW_STEPS = [
  { id: 1, name: 'Client Info', icon: User, status: 'draft' },
  { id: 2, name: 'Photo Upload', icon: Camera, status: 'photo_uploaded' },
  { id: 3, name: 'AI Mockup', icon: Palette, status: 'mockup_created' },
  { id: 4, name: 'Estimate', icon: Calculator, status: 'estimate_generated' },
  { id: 5, name: 'Contract', icon: FileText, status: 'contract_signed' },
  { id: 6, name: 'Complete', icon: CheckCircle, status: 'completed' }
]

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [isEditingClient, setIsEditingClient] = useState(false)

  const getSession = async () => {
    const { data: sessionData, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (error) {
      console.error('Error fetching session:', error)
      return
    }
    
    setSession(sessionData)
    
    // Get estimate if exists
    const { data: estimateData } = await supabase
      .from('estimates')
      .select('*')
      .eq('session_id', sessionId)
      .single()
    
    if (estimateData) {
      setEstimate(estimateData)
    }
    
    // Set current step based on session status
    const stepIndex = WORKFLOW_STEPS.findIndex(step => step.status === sessionData.status)
    setCurrentStep(stepIndex >= 0 ? stepIndex + 1 : 1)
    
    setLoading(false)
  }

  useEffect(() => {
    if (sessionId) {
      getSession()
    }
  }, [sessionId])

  const getStepStatus = (stepNumber: number) => {
    if (!session) return 'upcoming'
    
    // Determine completion based on session data
    const completedSteps = new Set()
    
    // Step 1: Client Info - always completed if session exists
    if (session.client_name && session.client_email) {
      completedSteps.add(1)
    }
    
    // Step 2: Photo Upload - completed if original_image_url exists
    if (session.original_image_url) {
      completedSteps.add(2)
    }
    
    // Step 3: Mockup - completed if final_mockup_url exists
    if (session.final_mockup_url) {
      completedSteps.add(3)
    }
    
    // Step 4: Estimate - completed if estimate exists
    if (estimate) {
      completedSteps.add(4)
    }
    
    // Step 5: Contract - completed if contract is signed
    if (estimate?.signed_at) {
      completedSteps.add(5)
    }
    
    // Step 6: Complete - completed if contract is signed
    if (estimate?.signed_at) {
      completedSteps.add(6)
    }
    
    if (completedSteps.has(stepNumber)) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'upcoming'
  }

  const handleStepClick = (stepNumber: number) => {
    const stepStatus = getStepStatus(stepNumber)
    // Allow navigation to completed steps, current step, and the next available step
    if (stepStatus === 'completed' || stepStatus === 'current' || stepNumber <= currentStep + 1) {
      setCurrentStep(stepNumber)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ClientInfoStep 
            session={session} 
            onNext={() => setCurrentStep(2)}
            onUpdateSession={setSession}
            isEditing={isEditingClient}
            onEditToggle={() => setIsEditingClient(!isEditingClient)}
          />
        )
      case 2:
        return (
          <PhotoUploadStep 
            session={session} 
            onNext={() => setCurrentStep(3)} 
            onBack={() => setCurrentStep(1)}
            onUpdateSession={setSession}
          />
        )
      case 3:
        return <MockupStep session={session} onNext={() => setCurrentStep(4)} onBack={() => setCurrentStep(2)} />
      case 4:
        return (
          <EstimateStep 
            session={session} 
            estimate={estimate} 
            onNext={() => setCurrentStep(5)} 
            onBack={() => setCurrentStep(3)}
            onEstimateCreated={setEstimate}
          />
        )
      case 5:
        return (
          <ContractStep 
            session={session} 
            estimate={estimate} 
            onNext={() => setCurrentStep(6)} 
            onBack={() => setCurrentStep(4)}
            onContractSigned={() => {
              // Refresh session data to reflect signed status
              getSession()
            }}
          />
        )
      case 6:
        return <CompleteStep session={session} onBack={() => setCurrentStep(5)} />
      default:
        return (
          <ClientInfoStep 
            session={session} 
            onNext={() => setCurrentStep(2)}
            onUpdateSession={setSession}
            isEditing={isEditingClient}
            onEditToggle={() => setIsEditingClient(!isEditingClient)}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-700">Loading Session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Session Not Found</h1>
          <Button onClick={() => window.location.href = '/dashboard'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-0">
      <div className="space-y-8 card-stack page-gap">
        {/* Page header styled */}
        <div className="retro-card-tile section-gap-bottom">
          <div className="grid grid-cols-3 items-center">
            <div className="flex">
              <button onClick={() => (window.location.href = '/dashboard')} className="retro-chip active">
                <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
              </button>
            </div>
            <div className="text-center">
              <h1 className="retro-card-title text-base">{session.client_name || 'New Client'}</h1>
              <p className="retro-card-meta">{session.client_address || 'Address not set'}</p>
            </div>
            <div className="flex justify-end"><span className="chip-sm" aria-hidden="true" /></div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="retro-card-tile section-gap-bottom">
          <div className="mb-3">
            <h2 className="retro-card-title">Workflow Progress</h2>
            <p className="retro-card-meta">Follow the steps to complete the session</p>
          </div>
            <div className="flex items-center justify-between overflow-x-auto">
              {WORKFLOW_STEPS.map((step, index) => {
                const stepStatus = getStepStatus(step.id)
                const isClickable = stepStatus === 'completed' || stepStatus === 'current' || step.id <= currentStep + 1
                
                return (
                  <div key={step.id} className="flex items-center min-w-0">
                    <div className="flex flex-col items-center min-w-max">
                      {/* Icon - not clickable, just visual indicator */}
                      <div 
                        className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 ${
                          stepStatus === 'completed' 
                            ? 'bg-green-600 text-white shadow-lg' 
                            : stepStatus === 'current'
                            ? 'bg-blue-600 text-white shadow-lg'
                            : isClickable
                            ? 'bg-gray-300 text-gray-600'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {stepStatus === 'completed' ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <step.icon className="w-5 h-5" />
                        )}
                      </div>
                      
                      {/* Clickable step name */}
                      <div className="mt-2 text-center">
                        <button
                          onClick={() => isClickable && handleStepClick(step.id)}
                          disabled={!isClickable}
                          className={`text-xs font-medium transition-all duration-200 ${
                            isClickable 
                              ? stepStatus === 'completed'
                                ? 'text-green-600 hover:text-green-800 cursor-pointer hover:underline'
                                : stepStatus === 'current'
                                ? 'text-blue-600 hover:text-blue-800 cursor-pointer hover:underline'
                                : 'text-gray-600 hover:text-gray-800 cursor-pointer hover:underline'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={isClickable ? `Go to ${step.name}` : `${step.name} - Not yet available`}
                        >
                          {step.name}
                        </button>
                        {stepStatus === 'completed' && (
                          <p className="text-xs text-green-500 font-medium mt-1">✓ Complete</p>
                        )}
                        {/* Remove explicit current bullet label for cleaner UI */}
                      </div>
                    </div>
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className="flex items-center mx-4">
                        <ArrowRight className={`w-4 h-4 ${
                          stepStatus === 'completed' ? 'text-green-400' : 'text-gray-300'
                        }`} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        </div>

        {/* Step Content */}
        <div className="mb-6 card-stack section-gap-bottom">
          {renderStepContent()}
        </div>
      </div>
    </div>
  )
}

// Step Components
function ClientInfoStep({ 
  session, 
  onNext, 
  onUpdateSession, 
  isEditing, 
  onEditToggle 
}: { 
  session: Session | null
  onNext: () => void
  onUpdateSession: (session: Session) => void
  isEditing: boolean
  onEditToggle: () => void
}) {
  if (!session) return null

  return (
    <div className="space-y-4">
      <ClientInfoForm
        session={session}
        onUpdate={onUpdateSession}
        isEditing={isEditing}
        onEditToggle={onEditToggle}
      />
      {!isEditing && (
        <div className="flex justify-end">
          <button onClick={onNext} className="retro-cta">
            Next: Upload Photo <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}

function PhotoUploadStep({ 
  session, 
  onNext, 
  onBack, 
  onUpdateSession 
}: { 
  session: Session | null
  onNext: () => void
  onBack: () => void
  onUpdateSession: (session: Session) => void
}) {
  if (!session) return null

  const handlePhotoUploaded = (url: string) => {
    // Update the session with the new photo URL
    onUpdateSession({
      ...session,
      original_image_url: url
    })
  }

  return (
    <div className="retro-card-tile">
      <div className="mb-3">
        <h3 className="retro-card-title text-base flex items-center">
          <Camera className="w-5 h-5 mr-2" />
          Property Photo
        </h3>
        <p className="retro-card-meta">Capture or upload photos of the client's property</p>
      </div>
      <div className="space-y-6">
        <PhotoCapture
          sessionId={session.id}
          onPhotoUploaded={handlePhotoUploaded}
          existingPhotoUrl={session.original_image_url}
        />
        <div className="tile-row mt-6">
          <button className="retro-chip active mr-2" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <button
            onClick={onNext}
            className="retro-cta ml-2"
            disabled={!session.original_image_url}
            style={{ opacity: session.original_image_url ? 1 : 0.5, cursor: session.original_image_url ? 'pointer' : 'not-allowed' }}
          >
            Next: Create Mockup <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MockupStep({ session, onNext, onBack }: { session: Session | null, onNext: () => void, onBack: () => void }) {
  if (!session) return null

  const handleMockupGenerated = (mockup: any) => {
    // Mockup generated successfully, could show a success message
    console.log('Mockup generated:', mockup)
  }

  return (
    <div className="space-y-6">
      <MockupGenerator
        session={session}
        onMockupGenerated={handleMockupGenerated}
      />
      
      <div className="flex justify-between mt-24">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="bg-green-600 hover:bg-green-700"
          disabled={!session.final_mockup_url}
        >
          Next: Generate Estimate
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function EstimateStep({ 
  session, 
  estimate, 
  onNext, 
  onBack,
  onEstimateCreated 
}: { 
  session: Session | null
  estimate: Estimate | null
  onNext: () => void
  onBack: () => void
  onEstimateCreated: (estimate: Estimate) => void
}) {
  if (!session) return null

  const handleEstimateCreated = (newEstimate: any) => {
    onEstimateCreated(newEstimate)
  }

  return (
    <div className="space-y-6">
      <EstimateBuilder
        session={session}
        existingEstimate={estimate}
        onEstimateCreated={handleEstimateCreated}
      />
      
      <div className="flex justify-between mt-12">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="bg-green-600 hover:bg-green-700"
          disabled={!estimate}
        >
          Next: Generate Contract
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function ContractStep({ 
  session, 
  estimate, 
  onNext, 
  onBack,
  onContractSigned 
}: { 
  session: Session | null
  estimate: Estimate | null
  onNext: () => void
  onBack: () => void
  onContractSigned: () => void
}) {
  if (!session || !estimate) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-500">Session or estimate data is missing.</p>
          <Button variant="outline" onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ContractGenerator
        session={session}
        estimate={estimate}
        onContractSigned={onContractSigned}
      />
      
      <div className="flex justify-between mt-12">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button 
          onClick={onNext} 
          className="bg-green-600 hover:bg-green-700"
        >
          Complete Session
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

function CompleteStep({ session, onBack }: { session: Session | null, onBack: () => void }) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(session?.status === 'completed')

  const completeSession = async () => {
    if (!session) return

    setIsCompleting(true)

    try {
      // Update session status to completed
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)

      if (error) {
        throw error
      }

      // Send completion email to client
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'project_complete',
            sessionId: session.id
          })
        })
      } catch (emailError) {
        console.error('Error sending completion email:', emailError)
      }

      setIsCompleted(true)

    } catch (error) {
      console.error('Error completing session:', error)
      alert('Failed to complete session')
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Session Complete
        </CardTitle>
        <CardDescription>
          {isCompleted ? 'Session has been completed!' : 'Mark this session as completed'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isCompleted ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">🎉 Session Completed!</h3>
            <p className="text-gray-500 mb-6">All tasks completed and client notified</p>
            <div className="space-y-2">
              <p className="text-sm text-green-600">✓ Contract signed and saved</p>
              <p className="text-sm text-green-600">✓ Client completion email sent</p>
              <p className="text-sm text-green-600">✓ Session marked as completed</p>
              <p className="text-sm text-green-600">✓ Ready for project scheduling</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Complete</h3>
            <p className="text-gray-500 mb-6">
              Mark this session as completed to send final notifications and wrap up the process
            </p>
            <Button
              onClick={completeSession}
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Completing Session...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Session
                </>
              )}
            </Button>
          </div>
        )}
        
      <div className="flex justify-between mt-12">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Return to Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
