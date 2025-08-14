import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sessionId = formData.get('sessionId') as string
    const estimateId = formData.get('estimateId') as string

    if (!file || !sessionId || !estimateId) {
      return NextResponse.json(
        { error: 'File, session ID, and estimate ID are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Get session and estimate data to validate they exist
    const [sessionResponse, estimateResponse] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('estimates').select('*').eq('id', estimateId).single()
    ])

    if (sessionResponse.error || estimateResponse.error) {
      return NextResponse.json(
        { error: 'Invalid session or estimate ID' },
        { status: 404 }
      )
    }

    // Convert File to ArrayBuffer, then to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload signed contract to Supabase Storage
    const filename = `signed-contract-${sessionId}-${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filename, buffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload signed contract' },
        { status: 500 }
      )
    }

    // Get public URL for the uploaded contract
    const { data: { publicUrl } } = supabase.storage
      .from('contracts')
      .getPublicUrl(uploadData.path)

    // Update estimate with signed contract info
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        contract_pdf_url: publicUrl,
        signed_at: new Date().toISOString(),
        signature_method: 'adobe_acrobat'
      })
      .eq('id', estimateId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update estimate with signed contract' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      contractUrl: publicUrl,
      message: 'Signed contract uploaded successfully'
    })

  } catch (error) {
    console.error('Error processing signed contract upload:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
