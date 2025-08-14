'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/database'

type Session = Database['public']['Tables']['sessions']['Row']

interface ClientInfoFormProps {
  session: Session
  onUpdate: (updatedSession: Session) => void
  isEditing: boolean
  onEditToggle: () => void
}

export default function ClientInfoForm({ session, onUpdate, isEditing, onEditToggle }: ClientInfoFormProps) {
  const [formData, setFormData] = useState({
    client_name: session.client_name || '',
    client_email: session.client_email || '',
    client_phone: session.client_phone || '',
    client_address: session.client_address || '',
    notes: session.notes || ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setFormData({
      client_name: session.client_name || '',
      client_email: session.client_email || '',
      client_phone: session.client_phone || '',
      client_address: session.client_address || '',
      notes: session.notes || ''
    })
  }, [session])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.client_name.trim()) {
      newErrors.client_name = 'Client name is required'
    }

    if (formData.client_email && !isValidEmail(formData.client_email)) {
      newErrors.client_email = 'Please enter a valid email address'
    }

    if (formData.client_phone && !isValidPhone(formData.client_phone)) {
      newErrors.client_phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isValidPhone = (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '')
    return phoneRegex.test(cleanPhone)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleSave = async () => {
    if (!validateForm()) {
      return
    }

    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('sessions')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      onUpdate(data)
      onEditToggle()
      
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Failed to save client information. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original session data
    setFormData({
      client_name: session.client_name || '',
      client_email: session.client_email || '',
      client_phone: session.client_phone || '',
      client_address: session.client_address || '',
      notes: session.notes || ''
    })
    setErrors({})
    onEditToggle()
  }

  if (isEditing) {
    return (
      <div className="vercel-card">
        <div className="mb-6">
          <h3 className="vercel-h4 text-foreground mb-2">Edit Client Information</h3>
          <p className="vercel-muted">Update client details and project requirements</p>
        </div>
        
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label htmlFor="client_name" className="vercel-label">
                  Client Name *
                </label>
                <input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => handleInputChange('client_name', e.target.value)}
                  placeholder="Enter client name"
                  className={`vercel-input ${errors.client_name ? 'border-accent-red' : ''}`}
                />
                {errors.client_name && (
                  <p className="text-accent-red vercel-small mt-2">{errors.client_name}</p>
                )}
              </div>

              <div>
                <label htmlFor="client_email" className="vercel-label">
                  Email Address
                </label>
                <input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => handleInputChange('client_email', e.target.value)}
                  placeholder="client@example.com"
                  className={`vercel-input ${errors.client_email ? 'border-accent-red' : ''}`}
                />
                {errors.client_email && (
                  <p className="text-accent-red vercel-small mt-2">{errors.client_email}</p>
                )}
              </div>

              <div>
                <label htmlFor="client_phone" className="vercel-label">
                  Phone Number
                </label>
                <input
                  id="client_phone"
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => handleInputChange('client_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={`vercel-input ${errors.client_phone ? 'border-accent-red' : ''}`}
                />
                {errors.client_phone && (
                  <p className="text-accent-red vercel-small mt-2">{errors.client_phone}</p>
                )}
              </div>

              <div>
                <label htmlFor="client_address" className="vercel-label">
                  Property Address
                </label>
                <input
                  id="client_address"
                  value={formData.client_address}
                  onChange={(e) => handleInputChange('client_address', e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="vercel-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="vercel-label">
                Project Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Project requirements, special requests, etc."
                className="vercel-input textarea"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <button 
              onClick={handleCancel}
              disabled={isSaving}
              className="vercel-btn vercel-btn-secondary"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="vercel-btn vercel-btn-teal"
            >
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="vercel-spinner"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vercel-card">
      <div className="mb-6">
        <h3 className="vercel-h4 text-foreground mb-2">Client Information</h3>
        <p className="vercel-muted">Client details and project requirements</p>
      </div>
      
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="vercel-h4 text-foreground mb-4">Contact Information</h4>
            <div className="space-y-3">
              <div>
                <span className="vercel-small text-muted-foreground block">Name</span>
                <span className="vercel-muted font-medium">{session.client_name || 'Not set'}</span>
              </div>
              <div>
                <span className="vercel-small text-muted-foreground block">Email</span>
                <span className="vercel-muted">{session.client_email || 'Not set'}</span>
              </div>
              <div>
                <span className="vercel-small text-muted-foreground block">Phone</span>
                <span className="vercel-muted">{session.client_phone || 'Not set'}</span>
              </div>
              <div>
                <span className="vercel-small text-muted-foreground block">Address</span>
                <span className="vercel-muted">{session.client_address || 'Not set'}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="vercel-h4 text-foreground mb-4">Project Notes</h4>
            <p className="vercel-muted whitespace-pre-wrap">
              {session.notes || 'No notes added yet'}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-border">
          <button 
            onClick={onEditToggle}
            className="vercel-btn vercel-btn-secondary"
          >
            Edit Client Info
          </button>
        </div>
      </div>
    </div>
  )
}