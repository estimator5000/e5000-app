'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  CheckCircle, 
  Loader2,
  Eye,
  Signature,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { Database } from '@/types/database'
import SignatureCapture from './SignatureCapture'
import { isDesktop, getDeviceType } from '@/lib/device-detection'

type Session = Database['public']['Tables']['sessions']['Row']
type Estimate = Database['public']['Tables']['estimates']['Row']

interface ContractGeneratorProps {
  session: Session
  estimate: Estimate
  onContractSigned: () => void
}

export default function ContractGenerator({ session, estimate, onContractSigned }: ContractGeneratorProps) {
  const [contractUrl, setContractUrl] = useState<string | null>(estimate.contract_pdf_url || null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [isContractSigned, setIsContractSigned] = useState(!!estimate.signed_at)
  const [isDesktopDevice, setIsDesktopDevice] = useState(false)
  const [showSigningOptions, setShowSigningOptions] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadOption, setShowUploadOption] = useState(false)

  useEffect(() => {
    setContractUrl(estimate.contract_pdf_url || null)
    setIsContractSigned(!!estimate.signed_at)
  }, [estimate])

  useEffect(() => {
    // Detect device type on component mount
    setIsDesktopDevice(isDesktop())
  }, [])

  useEffect(() => {
    console.log('ContractGenerator state - showSignature:', showSignature, 'isContractSigned:', isContractSigned)
  }, [showSignature, isContractSigned])

  const generateContract = async () => {
    setIsGenerating(true)
    
    try {
      const response = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          estimateId: estimate.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate contract')
      }

      setContractUrl(result.contractUrl)

    } catch (error) {
      console.error('Error generating contract:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate contract')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSignatureCapture = (signature: string) => {
    console.log('Signature captured in ContractGenerator, length:', signature.length)
    setSignatureData(signature)
    setShowSignature(false)
    signContract(signature)
  }

  const signContract = async (signature: string) => {
    setIsSigning(true)
    
    try {
      const response = await fetch('/api/generate-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          estimateId: estimate.id,
          signatureData: signature
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to sign contract')
      }

      setContractUrl(result.contractUrl)
      setIsContractSigned(true)
      
      // Send email notifications
      try {
        // Send confirmation email to client
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contract_signed',
            sessionId: session.id,
            estimateId: estimate.id
          })
        })

        // Send notification to team
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'team_notification',
            sessionId: session.id,
            estimateId: estimate.id
          })
        })
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError)
        // Don't fail the signing process if emails fail
      }

      onContractSigned()

    } catch (error) {
      console.error('Error signing contract:', error)
      alert(error instanceof Error ? error.message : 'Failed to sign contract')
    } finally {
      setIsSigning(false)
    }
  }

  const downloadContract = () => {
    if (contractUrl) {
      window.open(contractUrl, '_blank')
    }
  }

  const downloadForAdobeSigning = () => {
    if (contractUrl) {
      // Create a temporary link to download the PDF
      const link = document.createElement('a')
      link.href = contractUrl
      link.download = `contract-${session.client_name?.replace(/\s+/g, '-') || 'client'}-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Show instructions for Adobe signing and enable upload option
      setShowUploadOption(true)
      alert('Download started! Please:\n\n1. Open the downloaded PDF in Adobe Acrobat\n2. Use Adobe\'s signature tools to sign the document\n3. Save the signed PDF\n4. Use the "Upload Signed Contract" button below to complete the process')
    }
  }

  const handleSignedContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    setIsUploading(true)

    try {
      // Create FormData to upload the file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', session.id)
      formData.append('estimateId', estimate.id)

      const response = await fetch('/api/upload-signed-contract', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to upload signed contract')
      }

      // Update the contract URL and mark as signed
      setContractUrl(result.contractUrl)
      setIsContractSigned(true)
      setShowUploadOption(false)

      // Send email notifications
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'contract_signed',
            sessionId: session.id,
            estimateId: estimate.id
          })
        })

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'team_notification',
            sessionId: session.id,
            estimateId: estimate.id
          })
        })
      } catch (emailError) {
        console.error('Error sending notification emails:', emailError)
      }

      onContractSigned()
      alert('Contract successfully uploaded and marked as signed!')

    } catch (error) {
      console.error('Error uploading signed contract:', error)
      alert(error instanceof Error ? error.message : 'Failed to upload signed contract')
    } finally {
      setIsUploading(false)
      // Reset the file input
      event.target.value = ''
    }
  }

  const calculateEstimateTotal = () => {
    return estimate.final_amount || 0
  }

  const getEstimateItems = () => {
    if (!estimate.items) return []
    return Array.isArray(estimate.items) 
      ? estimate.items 
      : JSON.parse(estimate.items as string)
  }

  return (
    <div className="space-y-6">
      {/* Contract Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Contract Status
            </div>
            {isContractSigned ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Signed
              </Badge>
            ) : contractUrl ? (
              <Badge className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="w-3 h-3 mr-1" />
                Awaiting Signature
              </Badge>
            ) : (
              <Badge variant="outline">
                Not Generated
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and sign the landscaping contract
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!contractUrl ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Contract</h3>
              <p className="text-gray-500 mb-4">
                Create a professional contract based on your estimate
              </p>
              <Button
                onClick={generateContract}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating Contract...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generate Contract PDF
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div>
                    <h4 className="font-medium">Landscaping Contract</h4>
                    <p className="text-sm text-gray-500">
                      Contract #{session.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={downloadContract}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadContract}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {!isContractSigned && (
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <Signature className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Sign</h3>
                  <p className="text-gray-600 mb-4">
                    Please review the contract and choose your preferred signing method
                  </p>
                  
                  {isDesktopDevice ? (
                    // Desktop signing options
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          onClick={downloadForAdobeSigning}
                          disabled={isSigning}
                          className="bg-red-600 hover:bg-red-700 flex-1"
                          size="lg"
                        >
                          <ExternalLink className="w-5 h-5 mr-2" />
                          Sign with Adobe Acrobat
                        </Button>
                        <Button
                          onClick={() => {
                            console.log('Web signature button clicked')
                            setShowSignature(true)
                          }}
                          disabled={isSigning}
                          variant="outline"
                          size="lg"
                        >
                          <Signature className="w-5 h-5 mr-2" />
                          Sign Online
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Recommended: Use Adobe Acrobat for a professional signature experience
                      </p>
                      
                      {showUploadOption && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <h4 className="font-medium text-orange-800 mb-2">Upload Signed Contract</h4>
                          <p className="text-sm text-orange-700 mb-3">
                            Once you've signed the contract in Adobe Acrobat, upload it here to complete the process.
                          </p>
                          <div className="flex items-center gap-3">
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleSignedContractUpload}
                              disabled={isUploading}
                              className="hidden"
                              id="signed-contract-upload"
                            />
                            <label htmlFor="signed-contract-upload">
                              <Button
                                asChild
                                disabled={isUploading}
                                className="bg-orange-600 hover:bg-orange-700 cursor-pointer"
                              >
                                <span>
                                  {isUploading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Uploading...
                                    </>
                                  ) : (
                                    <>
                                      <Download className="w-4 h-4 mr-2" />
                                      Upload Signed Contract
                                    </>
                                  )}
                                </span>
                              </Button>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Mobile/tablet signing - web only
                    <Button
                      onClick={() => {
                        console.log('Sign Contract button clicked')
                        setShowSignature(true)
                      }}
                      disabled={isSigning}
                      className="bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {isSigning ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing Signature...
                        </>
                      ) : (
                        <>
                          <Signature className="w-5 h-5 mr-2" />
                          Sign Contract
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}

              {isContractSigned && (
                <div className="text-center p-6 bg-green-50 rounded-lg">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Contract Signed!</h3>
                  <p className="text-gray-600 mb-4">
                    Thank you! The contract has been signed and saved.
                  </p>
                  <div className="text-sm text-green-600">
                    Signed on {estimate.signed_at ? new Date(estimate.signed_at).toLocaleDateString() : 'Unknown date'}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Client Information</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {session.client_name}</p>
                <p><strong>Address:</strong> {session.client_address || 'N/A'}</p>
                <p><strong>Phone:</strong> {session.client_phone || 'N/A'}</p>
                <p><strong>Email:</strong> {session.client_email || 'N/A'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Project Details</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Total Amount:</strong> ${calculateEstimateTotal().toFixed(2)}</p>
                <p><strong>Items:</strong> {getEstimateItems().length} services</p>
                <p><strong>Contract Date:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Services Included</h4>
            <div className="space-y-2">
              {getEstimateItems().map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    <span className="text-gray-500 ml-2">({item.quantity} {item.unit})</span>
                  </div>
                  <span className="font-medium">
                    ${(item.quantity * item.selectedPrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Capture Modal */}
      {showSignature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Digital Signature</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowSignature(false)}
                  disabled={isSigning}
                >
                  Cancel
                </Button>
              </div>
              <SignatureCapture
                onSignatureCapture={handleSignatureCapture}
                disabled={isSigning}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
