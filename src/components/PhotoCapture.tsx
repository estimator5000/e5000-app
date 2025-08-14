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

  return (
    <div className="space-y-4">
      {/* Camera View */}
      {showCamera && (
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
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
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <img 
                src={capturedImage} 
                alt="Captured property" 
                className="w-full rounded-lg"
              />
              <div className="absolute top-2 right-2 flex space-x-2">
                <Button
                  onClick={clearImage}
                  variant="outline"
                  size="sm"
                  className="bg-white text-black hover:bg-gray-100"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!capturedImage && !showCamera && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={startCamera}
            className="bg-blue-600 hover:bg-blue-700 h-20 text-lg"
          >
            <Camera className="w-6 h-6 mr-3" />
            Take Photo
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="h-20 text-lg"
          >
            <Upload className="w-6 h-6 mr-3" />
            Upload Photo
          </Button>
        </div>
      )}

      {/* Upload Button */}
      {capturedImage && !showCamera && (
        <Button
          onClick={uploadImage}
          disabled={isUploading}
          className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Uploading...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-3" />
              Save Photo
            </>
          )}
        </Button>
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

