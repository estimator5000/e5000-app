'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import PhotoCapture from '@/components/PhotoCapture'
import ClientInfoForm from '@/components/ClientInfoForm'
import MockupGenerator from '@/components/MockupGenerator'
import EstimateBuilder from '@/components/EstimateBuilder'
import ContractGenerator from '@/components/ContractGenerator'

type Session = Database['public']['Tables']['sessions']['Row']
type Estimate = Database['public']['Tables']['estimates']['Row']

const WORKFLOW_STEPS = [
  { id: 1, name: 'Client Info', status: 'draft' },
  { id: 2, name: 'Photo Upload', status: 'photo_uploaded' },
  { id: 3, name: 'AI Mockup', status: 'mockup_created' },
  { id: 4, name: 'Estimate', status: 'estimate_generated' },
  { id: 5, name: 'Contract', status: 'contract_signed' },
  { id: 6, name: 'Complete', status: 'completed' }
]

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  
  const [session, setSession] = useState<Session | null>(null)
  const [estimate, setEstimate] = useState<Estimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    async function fetchSession() {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) {
        console.error('Error fetching session:', sessionError)
        setLoading(false)
        return
      }

      setSession(sessionData)

      // Fetch estimate if exists
      const { data: estimateData } = await supabase
        .from('estimates')
        .select('*')
        .eq('session_id', sessionId)
        .single()

      if (estimateData) {
        setEstimate(estimateData)
      }

      // Set current step based on session status
      const statusToStep: { [key: string]: number } = {
        'draft': 1,
        'photo_uploaded': 2,
        'mockup_created': 3,
        'estimate_generated': 4,
        'contract_signed': 5,
        'completed': 6
      }
      setCurrentStep(statusToStep[sessionData.status || 'draft'] || 1)
      setLoading(false)
    }

    fetchSession()
  }, [sessionId])

  const updateSession = async (updates: Partial<Session>) => {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating session:', error)
      return
    }

    setSession(data)
  }

  const handleStepClick = (stepId: number) => {
    if (stepId <= getMaxClickableStep()) {
      setCurrentStep(stepId)
    }
  }

  const getMaxClickableStep = () => {
    const statusToMaxStep: { [key: string]: number } = {
      'draft': 1,
      'photo_uploaded': 2,
      'mockup_created': 3,
      'estimate_generated': 4,
      'contract_signed': 5,
      'completed': 6
    }
    return statusToMaxStep[session?.status || 'draft'] || 1
  }

  const getStepStatus = (stepId: number) => {
    const maxCompletedStep = getMaxClickableStep() - 1
    if (stepId <= maxCompletedStep) return 'completed'
    if (stepId === currentStep) return 'current'
    return 'pending'
  }

  const renderStepContent = () => {
    if (!session) return null

    switch (currentStep) {
      case 1:
        return (
          <ClientInfoStep 
            session={session} 
            onNext={() => setCurrentStep(2)}
            onUpdateSession={updateSession}
          />
        )
      case 2:
        return (
          <PhotoUploadStep 
            session={session} 
            onNext={() => setCurrentStep(3)}
            onUpdateSession={updateSession}
          />
        )
      case 3:
        return (
          <MockupStep 
            session={session} 
            onNext={() => setCurrentStep(4)}
            onUpdateSession={updateSession}
          />
        )
      case 4:
        return (
          <EstimateStep 
            session={session} 
            estimate={estimate}
            onNext={() => setCurrentStep(5)}
            onUpdateSession={updateSession}
            onEstimateUpdate={setEstimate}
          />
        )
      case 5:
        return (
          <ContractStep 
            session={session} 
            estimate={estimate}
            onNext={() => setCurrentStep(6)}
            onUpdateSession={updateSession}
          />
        )
      case 6:
        return (
          <CompleteStep 
            session={session} 
            estimate={estimate}
          />
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="vercel-spinner mx-auto mb-4"></div>
          <p className="vercel-muted">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="vercel-card text-center max-w-md">
          <h2 className="vercel-h3 text-accent-red mb-4">Session Not Found</h2>
          <p className="vercel-muted mb-6">The session you're looking for doesn't exist.</p>
          <button 
            onClick={() => window.location.href = '/dashboard'}
            className="vercel-btn vercel-btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="vercel-btn vercel-btn-ghost"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </button>
              <div>
                <h1 className="vercel-h3 text-foreground">{session.client_name}</h1>
                <p className="vercel-muted">{session.client_address || 'Address not set'}</p>
              </div>
            </div>
            <div className="vercel-mono">
              Session #{session.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Progress */}
        <div className="mb-12">
          <h2 className="vercel-h3 text-foreground mb-8">Workflow Progress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
            {WORKFLOW_STEPS.map((step, index) => {
              const retroColors = [
                { bg: 'bg-accent-teal', text: 'text-accent-teal', bgLight: 'bg-accent-teal/8' },
                { bg: 'bg-accent-orange', text: 'text-accent-orange', bgLight: 'bg-accent-orange/8' },
                { bg: 'bg-accent-purple', text: 'text-accent-purple', bgLight: 'bg-accent-purple/8' },
                { bg: 'bg-accent-green', text: 'text-accent-green', bgLight: 'bg-accent-green/8' },
                { bg: 'bg-accent-red', text: 'text-accent-red', bgLight: 'bg-accent-red/8' },
                { bg: 'bg-accent-teal', text: 'text-accent-teal', bgLight: 'bg-accent-teal/8' }
              ]
              
              const colorScheme = retroColors[index]
              const stepStatus = getStepStatus(step.id)
              const isClickable = step.id <= getMaxClickableStep()
              
              return (
                <div 
                  key={step.id}
                  className={`p-6 rounded-2xl transition-all duration-200 cursor-pointer ${
                    stepStatus === 'completed' 
                      ? `${colorScheme.bgLight} border border-gray-200 shadow-sm hover:shadow-md transform hover:scale-[1.02]` 
                      : stepStatus === 'current' 
                        ? `${colorScheme.bgLight} border border-gray-200 shadow-md ring-1 ring-gray-200` 
                        : `bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm ${isClickable ? '' : 'opacity-50'}`
                  } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onClick={() => isClickable && handleStepClick(step.id)}
                >
                  <div className="text-center">
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center font-mono text-sm font-semibold ${
                      stepStatus === 'completed' 
                        ? `${colorScheme.bg} text-white shadow-sm` 
                        : stepStatus === 'current' 
                          ? `${colorScheme.bg} text-white shadow-sm` 
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      {stepStatus === 'completed' ? '✓' : step.id}
                    </div>
                    <h3 className={`font-medium text-sm mb-3 ${
                      stepStatus === 'completed' || stepStatus === 'current' 
                        ? colorScheme.text 
                        : 'text-gray-500'
                    }`}>
                      {step.name}
                    </h3>
                    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${
                      stepStatus === 'completed' 
                        ? `${colorScheme.bg} text-white` 
                        : stepStatus === 'current' 
                          ? `${colorScheme.bgLight} ${colorScheme.text}` 
                          : 'bg-gray-100 text-gray-500'
                    }`}>
                      {stepStatus === 'completed' ? 'Complete' :
                       stepStatus === 'current' ? 'Current' : 'Pending'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div>
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
}: { 
  session: Session
  onNext: () => void
  onUpdateSession: (updates: Partial<Session>) => void
}) {
  const [isEditing, setIsEditing] = useState(true) // Start in editing mode for new sessions
  
  const handleUpdate = (updatedSession: Session) => {
    onUpdateSession(updatedSession)
    // If this is the first time setting client info, allow proceeding
    if (updatedSession.client_name && updatedSession.client_name !== 'New Client') {
      setIsEditing(false)
    }
  }

  const canProceed = session.client_name && session.client_name !== 'New Client'

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h2 className="vercel-h3 text-foreground mb-2">Client Information</h2>
        <p className="vercel-muted">Enter your client's contact details and project location</p>
      </div>
      
      <ClientInfoForm 
        session={session}
        onUpdate={handleUpdate}
        isEditing={isEditing}
        onEditToggle={() => setIsEditing(!isEditing)}
      />
      
      {canProceed && !isEditing && (
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={onNext}
            className="vercel-btn vercel-btn-teal"
          >
            Continue to Photo Upload
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}

function PhotoUploadStep({ 
  session, 
  onNext, 
  onUpdateSession,
}: { 
  session: Session
  onNext: () => void
  onUpdateSession: (updates: Partial<Session>) => void
}) {
  const canProceed = session.original_image_url

  const handlePhotoUploaded = (url: string) => {
    onUpdateSession({ original_image_url: url })
  }

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h2 className="vercel-h3 text-foreground mb-2">Photo Upload</h2>
        <p className="vercel-muted">Capture or upload photos of the landscaping area</p>
      </div>
      
      <PhotoCapture 
        sessionId={session.id}
        onPhotoUploaded={handlePhotoUploaded}
        existingPhotoUrl={session.original_image_url}
      />
      
      {canProceed && (
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={onNext}
            className="vercel-btn vercel-btn-teal"
          >
            Continue to AI Mockup
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}

function MockupStep({ 
  session, 
  onNext, 
  onUpdateSession,
}: { 
  session: Session
  onNext: () => void
  onUpdateSession: (updates: Partial<Session>) => void
}) {
  const canProceed = session.final_mockup_url

  const handleMockupGenerated = (mockup: any) => {
    onUpdateSession({ final_mockup_url: mockup.image_url })
  }

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h2 className="vercel-h3 text-foreground mb-2">AI Mockup Generation</h2>
        <p className="vercel-muted">Generate landscape design mockups using AI</p>
      </div>
      
      <MockupGenerator 
        session={session}
        onMockupGenerated={handleMockupGenerated}
      />
      
      {canProceed && (
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={onNext}
            className="vercel-btn vercel-btn-orange"
          >
            Continue to Estimate
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}

function EstimateStep({ 
  session, 
  estimate,
  onNext, 
  onUpdateSession,
  onEstimateUpdate,
}: { 
  session: Session
  estimate: Estimate | null
  onNext: () => void
  onUpdateSession: (updates: Partial<Session>) => void
  onEstimateUpdate: (estimate: Estimate) => void
}) {
  const canProceed = estimate && estimate.final_amount

  const handleEstimateCreated = (newEstimate: any) => {
    onEstimateUpdate(newEstimate)
  }

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h2 className="vercel-h3 text-foreground mb-2">Project Estimate</h2>
        <p className="vercel-muted">Create detailed estimates for the landscaping project</p>
      </div>
      
      <EstimateBuilder 
        session={session}
        existingEstimate={estimate}
        onEstimateCreated={handleEstimateCreated}
      />
      
      {canProceed && (
        <div className="mt-8 pt-6 border-t border-border">
          <button
            onClick={onNext}
            className="vercel-btn vercel-btn-green"
          >
            Continue to Contract
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      )}
    </div>
  )
}

function ContractStep({ 
  session, 
  estimate,
  onNext, 
  onUpdateSession,
}: { 
  session: Session
  estimate: Estimate | null
  onNext: () => void
  onUpdateSession: (updates: Partial<Session>) => void
}) {
  if (!estimate) {
    return (
      <div className="vercel-card">
        <div className="text-center py-8">
          <h3 className="vercel-h4 text-accent-red mb-2">No Estimate Available</h3>
          <p className="vercel-muted">Please complete the estimate step first.</p>
        </div>
      </div>
    )
  }

  const handleContractSigned = () => {
    onUpdateSession({ status: 'contract_signed' })
  }

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h2 className="vercel-h3 text-foreground mb-2">Contract Signing</h2>
        <p className="vercel-muted">Generate and sign the project contract</p>
      </div>
      
      <ContractGenerator 
        session={session}
        estimate={estimate}
        onContractSigned={handleContractSigned}
      />
      
      <div className="mt-8 pt-6 border-t border-border">
        <button
          onClick={onNext}
          className="vercel-btn vercel-btn-purple"
        >
          Complete Session
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  )
}

function CompleteStep({ 
  session, 
  estimate,
}: { 
  session: Session
  estimate: Estimate | null
}) {
  return (
    <div className="vercel-card text-center">
      <div className="w-16 h-16 bg-accent-green rounded-full flex items-center justify-center mx-auto mb-6">
        <span className="text-white text-2xl">✓</span>
      </div>
      
      <h2 className="vercel-h2 text-foreground mb-4">Session Complete!</h2>
      <p className="vercel-lead text-muted-foreground mb-8">
        The landscaping project for {session.client_name} has been successfully completed.
      </p>
      
      {estimate && (
        <div className="vercel-card bg-secondary text-left max-w-md mx-auto mb-8">
          <h3 className="vercel-h4 text-foreground mb-4">Project Summary</h3>
                      <div className="space-y-2 vercel-muted">
              <div className="flex justify-between">
                <span>Client:</span>
                <span className="font-medium">{session.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-medium">${estimate.final_amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="vercel-badge vercel-badge-success">Completed</span>
              </div>
            </div>
        </div>
      )}
      
      <div className="flex gap-4 justify-center">
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="vercel-btn vercel-btn-primary"
        >
          Return to Dashboard
        </button>
        <button
          onClick={() => window.location.href = `/dashboard/session/${session.id}`}
          className="vercel-btn vercel-btn-secondary"
        >
          View Session Details
        </button>
      </div>
    </div>
  )
}