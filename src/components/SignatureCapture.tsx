'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Download, CheckCircle } from 'lucide-react'

interface SignatureCaptureProps {
  onSignatureCapture: (signatureData: string) => void
  disabled?: boolean
}

export default function SignatureCapture({ onSignatureCapture, disabled = false }: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [lastX, setLastX] = useState(0)
  const [lastY, setLastY] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Set up canvas
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    context.scale(2, 2)
    
    // Set drawing style
    context.strokeStyle = '#000000'
    context.lineWidth = 2
    context.lineCap = 'round'
    context.lineJoin = 'round'
    
    // Fill with white background
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    
    const rect = canvas.getBoundingClientRect()
    const touch = e.touches[0]
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }

  const startDrawing = (x: number, y: number) => {
    if (disabled) return
    
    console.log('Starting to draw at:', x, y)
    setIsDrawing(true)
    setLastX(x)
    setLastY(y)
  }

  const draw = (x: number, y: number) => {
    if (!isDrawing || disabled) return
    
    console.log('Drawing from', lastX, lastY, 'to', x, y, 'isDrawing:', isDrawing)
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.beginPath()
    context.moveTo(lastX, lastY)
    context.lineTo(x, y)
    context.stroke()

    setLastX(x)
    setLastY(y)
    setHasSignature(true)
    console.log('Signature drawing complete, hasSignature set to true')
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e)
    startDrawing(x, y)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMousePos(e)
    draw(x, y)
  }

  const handleMouseUp = () => {
    stopDrawing()
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getTouchPos(e)
    startDrawing(x, y)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const { x, y } = getTouchPos(e)
    draw(x, y)
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    stopDrawing()
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const saveSignature = () => {
    console.log('Save signature clicked, hasSignature:', hasSignature)
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) {
      console.log('Cannot save signature - missing canvas or signature')
      return
    }

    const signatureData = canvas.toDataURL('image/png')
    console.log('Signature data URL generated, length:', signatureData.length)
    console.log('Calling onSignatureCapture with signature data')
    onSignatureCapture(signatureData)
  }

  const downloadSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasSignature) return

    const link = document.createElement('a')
    link.download = 'signature.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Digital Signature
        </CardTitle>
        <CardDescription>
          Please sign below to accept the terms and conditions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <canvas
            ref={canvasRef}
            className={`w-full h-40 border border-gray-300 rounded cursor-crosshair ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <p className="text-sm text-gray-500 mt-2 text-center">
            {disabled 
              ? 'Signature capture is disabled'
              : 'Click and drag to sign with your mouse. Hold down the mouse button while drawing.'
            }
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={clearSignature}
              disabled={!hasSignature || disabled}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={downloadSignature}
              disabled={!hasSignature || disabled}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          <Button
            onClick={saveSignature}
            disabled={!hasSignature || disabled}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Accept & Sign
          </Button>
        </div>

        {hasSignature && (
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" />
            Signature captured. Click "Accept & Sign" to proceed.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
