'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Upload, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PhotoCaptureProps {
  sessionId: string
  onPhotoUploaded: (url: string) => void
  existingPhotoUrl?: string | null
}

export default function PhotoCapture({ sessionId, onPhotoUploaded, existingPhotoUrl }: PhotoCaptureProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(existingPhotoUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('Camera access is required to take photos. Please allow camera permissions and try again.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        setCapturedImage(url)
        stopCamera()
      }
    }, 'image/jpeg', 0.8)
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.')
        return
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Image must be less than 10MB.')
        return
      }

      const url = URL.createObjectURL(file)
      setCapturedImage(url)
    }
  }

  const uploadImage = async () => {
    if (!capturedImage) {
      console.error('No captured image to upload')
      return
    }

    console.log('Starting image upload for session:', sessionId)
    setIsUploading(true)
    
    try {
      // Convert image to blob
      let blob: Blob
      
      if (capturedImage.startsWith('blob:')) {
        console.log('Converting blob URL to blob')
        // If it's a blob URL from camera or file input
        const response = await fetch(capturedImage)
        blob = await response.blob()
        console.log('Blob created from URL, size:', blob.size, 'type:', blob.type)
      } else if (canvasRef.current) {
        console.log('Converting canvas to blob')
        // If it's from canvas capture
        const canvas = canvasRef.current
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create blob'))
          }, 'image/jpeg', 0.8)
        })
        console.log('Blob created from canvas, size:', blob.size, 'type:', blob.type)
      } else {
        throw new Error('No image to upload')
      }

      // Generate unique filename
      const filename = `session-${sessionId}-${Date.now()}.jpg`
      console.log('Uploading with filename:', filename)
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('session-photos')
        .upload(filename, blob, {
          contentType: 'image/jpeg'
        })

      if (error) {
        console.error('Supabase storage upload error:', error)
        throw error
      }

      console.log('Upload successful, data:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('session-photos')
        .getPublicUrl(data.path)

      console.log('Public URL generated:', publicUrl)

      // Update session with photo URL
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ 
          original_image_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (updateError) {
        console.error('Session update error:', updateError)
        throw updateError
      }

      console.log('Session updated successfully with photo URL')
      onPhotoUploaded(publicUrl)
      alert('Photo uploaded successfully!')
      
    } catch (error: any) {
      console.error('Error uploading image:', error)
      console.error('Error details:', error.message, error.details, error.hint)
      alert(`Failed to upload image: ${error.message}. Please check the console for more details.`)
    } finally {
      setIsUploading(false)
    }
  }

  const clearImage = () => {
    setCapturedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeExistingPhoto = async () => {
    if (!existingPhotoUrl) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/delete-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, imageUrl: existingPhotoUrl })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to delete photo')
      onPhotoUploaded('')
      setCapturedImage(null)
    } catch (e: any) {
      console.error('Failed to delete existing photo', e)
      alert(e?.message || 'Failed to delete photo')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Camera View */}
      {showCamera && (
        <Card>
          <CardContent className="p-4">
            <div className="relative rounded-xl overflow-hidden border">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  onClick={capturePhoto}
                  className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16"
                >
                  <Camera className="w-8 h-8" />
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="bg-white text-black hover:bg-gray-100 rounded-full w-16 h-16"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Image Preview */}
      {capturedImage && !showCamera && (
        <div className="space-y-3">
          <div className="relative rounded-xl overflow-hidden border shadow-sm">
            <img 
              src={capturedImage} 
              alt="Captured property" 
              className="w-full block"
            />
            <button
              onClick={clearImage}
              className="retro-chip absolute top-2 right-2"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!capturedImage && !showCamera && (
        <div className="flex flex-col md:flex-row items-start gap-3 md:gap-4">
          <button
            onClick={startCamera}
            className="retro-cta text-base px-6"
          >
            <Camera className="w-5 h-5 mr-2" /> Take Photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="retro-cta text-base px-6"
          >
            <Upload className="w-5 h-5 mr-2" /> Upload Photo
          </button>
          {existingPhotoUrl && (
            <div className="flex items-center gap-3 mt-2">
              <button
                className="retro-chip"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = existingPhotoUrl
                  a.target = '_blank'
                  a.click()
                }}
              >
                Open Current Photo
              </button>
              <button className="retro-cta" onClick={removeExistingPhoto} disabled={isDeleting}>
                {isDeleting ? 'Removing…' : 'Remove Photo'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      {capturedImage && !showCamera && (
        <div className="flex justify-end mt-4 mb-8">
          <button onClick={uploadImage} disabled={isUploading} className="retro-cta text-base px-6">
            {isUploading ? 'Uploading…' : 'Save Photo'}
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

