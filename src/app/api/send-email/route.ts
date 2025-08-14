import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { type, sessionId, estimateId, recipientEmail, recipientName } = await request.json()

    if (!type || !sessionId) {
      return NextResponse.json(
        { error: 'Email type and session ID are required' },
        { status: 400 }
      )
    }

    // Get session data
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    let emailContent: any = {}

    switch (type) {
      case 'estimate':
        if (!estimateId) {
          return NextResponse.json(
            { error: 'Estimate ID is required for estimate emails' },
            { status: 400 }
          )
        }

        const { data: estimate } = await supabase
          .from('estimates')
          .select('*')
          .eq('id', estimateId)
          .single()

        if (!estimate) {
          return NextResponse.json(
            { error: 'Estimate not found' },
            { status: 404 }
          )
        }

        emailContent = {
          to: recipientEmail || session.client_email,
          subject: `Your Landscaping Estimate - ${session.client_name}`,
          html: generateEstimateEmailHTML(session, estimate)
        }
        break

      case 'contract_ready':
        emailContent = {
          to: recipientEmail || session.client_email,
          subject: `Your Landscaping Contract is Ready - ${session.client_name}`,
          html: generateContractReadyEmailHTML(session)
        }
        break

      case 'contract_signed':
        emailContent = {
          to: recipientEmail || session.client_email,
          subject: `Contract Signed - Thank You! - ${session.client_name}`,
          html: generateContractSignedEmailHTML(session)
        }
        break

      case 'project_complete':
        emailContent = {
          to: recipientEmail || session.client_email,
          subject: `Project Complete - Thank You! - ${session.client_name}`,
          html: generateProjectCompleteEmailHTML(session)
        }
        break

      case 'team_notification':
        emailContent = {
          to: 'team@gardensofbabylon.com', // Replace with actual team email
          subject: `New Contract Signed - ${session.client_name}`,
          html: generateTeamNotificationHTML(session)
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        )
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'The e5000 <noreply@gardensofbabylon.com>', // Replace with your verified domain
      ...emailContent
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      emailId: data?.id
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateEstimateEmailHTML(session: any, estimate: any) {
  const items = Array.isArray(estimate.items) 
    ? estimate.items 
    : JSON.parse(estimate.items as string)

  const itemsHTML = items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.selectedPrice.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(item.quantity * item.selectedPrice).toFixed(2)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Landscaping Estimate</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🌿 Gardens of Babylon</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your Landscaping Estimate</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #059669; margin-top: 0;">Hello ${session.client_name}!</h2>
        
        <p>Thank you for choosing Gardens of Babylon for your landscaping needs. We're excited to transform your outdoor space!</p>
        
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Project Details</h3>
          <p><strong>Address:</strong> ${session.client_address || 'N/A'}</p>
          <p><strong>Project Notes:</strong> ${session.notes || 'Professional landscaping services'}</p>
        </div>

        <h3 style="color: #374151;">Estimate Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db;">Service</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d1d5db;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Unit Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #f9fafb; font-weight: bold;">
              <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #d1d5db;">Total:</td>
              <td style="padding: 12px; text-align: right; border-top: 2px solid #d1d5db;">$${estimate.final_amount?.toFixed(2) || '0.00'}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #dcfce7; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #059669;">Next Steps</h4>
          <p style="margin-bottom: 0;">We'll be in touch shortly to schedule your project and finalize the contract. If you have any questions, please don't hesitate to reach out!</p>
        </div>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>The Gardens of Babylon Team</strong><br>
          📞 (555) 123-4567<br>
          📧 info@gardensofbabylon.com
        </p>
      </div>
    </body>
    </html>
  `
}

function generateContractReadyEmailHTML(session: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your Contract is Ready</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🌿 Gardens of Babylon</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your Contract is Ready for Signature</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #059669; margin-top: 0;">Hello ${session.client_name}!</h2>
        
        <p>Great news! Your landscaping contract is ready for your digital signature.</p>
        
        <div style="background: #dbeafe; border: 1px solid #93c5fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #1e40af;">Ready to Sign</h3>
          <p>Please review the contract terms and provide your digital signature to get started on your project.</p>
          <p style="margin-bottom: 0;"><strong>Contract #:</strong> ${session.id.slice(0, 8).toUpperCase()}</p>
        </div>

        <p>Once signed, we'll begin scheduling your project and ordering materials. We're excited to transform your outdoor space!</p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>The Gardens of Babylon Team</strong>
        </p>
      </div>
    </body>
    </html>
  `
}

function generateContractSignedEmailHTML(session: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contract Signed - Thank You!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🌿 Gardens of Babylon</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Contract Signed Successfully!</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #059669; margin-top: 0;">Thank you, ${session.client_name}!</h2>
        
        <p>🎉 Congratulations! Your landscaping contract has been signed and we're ready to begin your project.</p>
        
        <div style="background: #dcfce7; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #059669;">What's Next?</h3>
          <ul style="margin-bottom: 0; padding-left: 20px;">
            <li>Our team will contact you within 48 hours to schedule the work</li>
            <li>We'll order all necessary materials and plants</li>
            <li>Weather permitting, work will begin within 2 weeks</li>
            <li>You'll receive regular updates throughout the project</li>
          </ul>
        </div>

        <p>We're thrilled to be working with you and can't wait to transform your outdoor space into something beautiful!</p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>The Gardens of Babylon Team</strong><br>
          📞 (555) 123-4567<br>
          📧 info@gardensofbabylon.com
        </p>
      </div>
    </body>
    </html>
  `
}

function generateProjectCompleteEmailHTML(session: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Project Complete!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">🌿 Gardens of Babylon</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px;">Your Project is Complete!</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #059669; margin-top: 0;">Congratulations, ${session.client_name}!</h2>
        
        <p>🎊 Your landscaping project is now complete! We hope you love your beautiful new outdoor space.</p>
        
        <div style="background: #fef3c7; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Care Instructions</h3>
          <ul style="margin-bottom: 0; padding-left: 20px;">
            <li>Water new plants daily for the first 2 weeks</li>
            <li>Avoid walking on new sod for 3-4 weeks</li>
            <li>We'll check in after 30 days to ensure everything is thriving</li>
            <li>All work is guaranteed for one full year</li>
          </ul>
        </div>

        <p>Thank you for choosing Gardens of Babylon. We'd love to hear your feedback and help with any future landscaping needs!</p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>The Gardens of Babylon Team</strong><br>
          📞 (555) 123-4567<br>
          📧 info@gardensofbabylon.com
        </p>
      </div>
    </body>
    </html>
  `
}

function generateTeamNotificationHTML(session: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Contract Signed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1f2937; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">🌿 New Contract Signed!</h1>
      </div>
      
      <div style="background: white; padding: 20px; border: 1px solid #e5e7eb;">
        <h2 style="color: #059669; margin-top: 0;">Contract Details</h2>
        
        <p><strong>Client:</strong> ${session.client_name}</p>
        <p><strong>Address:</strong> ${session.client_address || 'N/A'}</p>
        <p><strong>Phone:</strong> ${session.client_phone || 'N/A'}</p>
        <p><strong>Email:</strong> ${session.client_email || 'N/A'}</p>
        <p><strong>Contract #:</strong> ${session.id.slice(0, 8).toUpperCase()}</p>
        <p><strong>Signed:</strong> ${new Date().toLocaleDateString()}</p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Project Notes:</strong></p>
          <p>${session.notes || 'No specific notes provided'}</p>
        </div>
        
        <p>Please schedule the initial site visit and material ordering.</p>
      </div>
    </body>
    </html>
  `
}
