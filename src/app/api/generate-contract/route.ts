import { NextRequest, NextResponse } from 'next/server'
import jsPDF from 'jspdf'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, estimateId, signatureData } = await request.json()

    if (!sessionId || !estimateId) {
      return NextResponse.json(
        { error: 'Session ID and Estimate ID are required' },
        { status: 400 }
      )
    }

    // Get session and estimate data
    const [sessionResponse, estimateResponse] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', sessionId).single(),
      supabase.from('estimates').select('*').eq('id', estimateId).single()
    ])

    if (sessionResponse.error || estimateResponse.error) {
      return NextResponse.json(
        { error: 'Failed to fetch session or estimate data' },
        { status: 404 }
      )
    }

    const session = sessionResponse.data
    const estimate = estimateResponse.data

    // Create PDF contract
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.width
    const margin = 20
    let yPosition = 30

    // Header
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('LANDSCAPING CONTRACT', pageWidth / 2, yPosition, { align: 'center' })
    
    yPosition += 20
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Gardens of Babylon', pageWidth / 2, yPosition, { align: 'center' })
    
    yPosition += 10
    pdf.setFontSize(12)
    pdf.text('Professional Landscaping Services', pageWidth / 2, yPosition, { align: 'center' })
    
    yPosition += 25

    // Contract Details
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('CONTRACT DETAILS', margin, yPosition)
    
    yPosition += 15
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const contractDetails = [
      `Date: ${new Date().toLocaleDateString()}`,
      `Contract #: ${session.id.slice(0, 8).toUpperCase()}`,
      `Client: ${session.client_name}`,
      `Address: ${session.client_address || 'N/A'}`,
      `Phone: ${session.client_phone || 'N/A'}`,
      `Email: ${session.client_email || 'N/A'}`
    ]

    contractDetails.forEach(detail => {
      pdf.text(detail, margin, yPosition)
      yPosition += 12
    })

    yPosition += 10

    // Project Description
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PROJECT DESCRIPTION', margin, yPosition)
    
    yPosition += 15
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    
    const description = session.notes || 'Professional landscaping services as discussed and agreed upon.'
    const splitDescription = pdf.splitTextToSize(description, pageWidth - 2 * margin)
    pdf.text(splitDescription, margin, yPosition)
    yPosition += splitDescription.length * 12 + 10

    // Estimate Items
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PROJECT ESTIMATE', margin, yPosition)
    
    yPosition += 15
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    // Table headers
    pdf.setFont('helvetica', 'bold')
    pdf.text('Description', margin, yPosition)
    pdf.text('Qty', pageWidth - 120, yPosition)
    pdf.text('Unit Price', pageWidth - 80, yPosition)
    pdf.text('Total', pageWidth - 40, yPosition)
    
    yPosition += 5
    pdf.line(margin, yPosition, pageWidth - margin, yPosition)
    yPosition += 10

    pdf.setFont('helvetica', 'normal')

    // Parse estimate items
    const items = Array.isArray(estimate.items) 
      ? estimate.items 
      : JSON.parse(estimate.items as string)

    items.forEach((item: any) => {
      if (yPosition > 250) {
        pdf.addPage()
        yPosition = 30
      }

      const itemName = pdf.splitTextToSize(item.name, 120)
      pdf.text(itemName, margin, yPosition)
      pdf.text(item.quantity.toString(), pageWidth - 120, yPosition)
      pdf.text(`$${item.selectedPrice.toFixed(2)}`, pageWidth - 80, yPosition)
      pdf.text(`$${(item.quantity * item.selectedPrice).toFixed(2)}`, pageWidth - 40, yPosition)
      
      yPosition += Math.max(itemName.length * 12, 15)
    })

    // Totals
    yPosition += 10
    pdf.line(pageWidth - 120, yPosition, pageWidth - margin, yPosition)
    yPosition += 15

    pdf.setFont('helvetica', 'bold')
    pdf.text(`Subtotal: $${estimate.subtotal?.toFixed(2) || '0.00'}`, pageWidth - 120, yPosition)
    yPosition += 12
    pdf.text(`Total: $${estimate.final_amount?.toFixed(2) || '0.00'}`, pageWidth - 120, yPosition)

    yPosition += 25

    // Terms and Conditions
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TERMS AND CONDITIONS', margin, yPosition)
    
    yPosition += 15
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    const terms = [
      '1. Payment: 50% deposit required to begin work, balance due upon completion.',
      '2. Timeline: Work will commence within 2 weeks of signed contract and deposit.',
      '3. Weather: Delays due to weather conditions are beyond our control.',
      '4. Materials: All materials are guaranteed for one growing season.',
      '5. Changes: Any changes to this contract must be in writing and signed by both parties.',
      '6. Warranty: We warranty our workmanship for one full year from completion.'
    ]

    terms.forEach(term => {
      if (yPosition > 260) {
        pdf.addPage()
        yPosition = 30
      }
      const splitTerm = pdf.splitTextToSize(term, pageWidth - 2 * margin)
      pdf.text(splitTerm, margin, yPosition)
      yPosition += splitTerm.length * 12 + 5
    })

    // Signature Section
    if (yPosition > 220) {
      pdf.addPage()
      yPosition = 30
    } else {
      yPosition += 20
    }

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('SIGNATURES', margin, yPosition)
    
    yPosition += 20
    pdf.setFont('helvetica', 'normal')
    
    // Client signature
    pdf.text('Client Signature:', margin, yPosition)
    pdf.line(margin + 80, yPosition, margin + 180, yPosition)
    
    yPosition += 15
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin + 80, yPosition)
    
    if (signatureData) {
      // Add signature image if provided
      try {
        pdf.addImage(signatureData, 'PNG', margin + 80, yPosition - 25, 100, 20)
      } catch (error) {
        console.error('Error adding signature to PDF:', error)
      }
    }

    yPosition += 30

    // Company signature
    pdf.text('Gardens of Babylon Representative:', margin, yPosition)
    pdf.line(margin + 120, yPosition, margin + 220, yPosition)
    
    yPosition += 15
    pdf.text('Date: _______________', margin + 120, yPosition)

    // Convert PDF to blob
    const pdfBlob = pdf.output('blob')
    
    // Upload PDF to Supabase Storage
    const filename = `contract-${sessionId}-${Date.now()}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(filename, pdfBlob, {
        contentType: 'application/pdf'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to save contract PDF' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('contracts')
      .getPublicUrl(uploadData.path)

    // Update estimate with contract info
    const updateData: any = {
      contract_pdf_url: publicUrl
    }

    if (signatureData) {
      updateData.signature_data = signatureData
      updateData.signed_at = new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', estimateId)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update estimate with contract info' },
        { status: 500 }
      )
    }

    // Update session status
    const newStatus = signatureData ? 'contract_signed' : 'estimate_generated'
    await supabase
      .from('sessions')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      contractUrl: publicUrl,
      signed: !!signatureData
    })

  } catch (error) {
    console.error('Error generating contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
