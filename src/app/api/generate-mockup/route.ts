import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { sessionId, imageUrl, prompt, customInstructions } = await request.json()

    if (!sessionId || !imageUrl) {
      return NextResponse.json(
        { error: 'Session ID and image URL are required' },
        { status: 400 }
      )
    }

    // Get session details for context
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

    // Create detailed prompt for landscaping mockup
    const landscapingPrompt = `
You are a professional landscape designer. Create a beautiful, realistic landscaping design mockup based on the provided property photo.

Property Details:
- Client: ${session.client_name}
- Address: ${session.client_address || 'Property location not specified'}
- Project Notes: ${session.notes || 'No specific requirements mentioned'}

Design Instructions:
- Transform this property into a professionally landscaped space
- Focus on enhancing curb appeal and creating an inviting outdoor environment
- Include appropriate plants, flowers, trees, and hardscaping elements
- Consider the existing architecture and surroundings
- Make it look realistic and achievable
- Use plants suitable for the apparent climate and setting

${customInstructions ? `Additional Requirements: ${customInstructions}` : ''}

${prompt ? `Specific Request: ${prompt}` : 'Create a comprehensive landscape design that maximizes the property\'s potential.'}

Style: Photorealistic, professional landscape architecture, high quality, natural lighting
`

    // Generate image using OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: landscapingPrompt,
      size: "1024x1024",
      quality: "hd",
      n: 1,
    })

    // Fix the TypeScript error by adding proper type checking
    const generatedImageUrl = response.data?.[0]?.url
    
    if (!generatedImageUrl) {
      return NextResponse.json(
        { error: 'Failed to generate mockup image' },
        { status: 500 }
      )
    }

    // Download the image and upload to Supabase Storage
    const imageResponse = await fetch(generatedImageUrl)
    const imageBlob = await imageResponse.blob()
    
    const filename = `mockup-${sessionId}-${Date.now()}.jpg`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('session-photos')
      .upload(filename, imageBlob, {
        contentType: 'image/jpeg'
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to save mockup image' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('session-photos')
      .getPublicUrl(uploadData.path)

    // Save mockup to database
    const { data: mockup, error: mockupError } = await supabase
      .from('mockups')
      .insert([{
        session_id: sessionId,
        image_url: publicUrl,
        prompt: landscapingPrompt,
        ai_provider: 'openai-dalle3',
        is_final: false
      }])
      .select()
      .single()

    if (mockupError) {
      console.error('Mockup save error:', mockupError)
      return NextResponse.json(
        { error: 'Failed to save mockup data' },
        { status: 500 }
      )
    }

    // Update session status and final mockup URL
    await supabase
      .from('sessions')
      .update({ 
        status: 'mockup_created',
        final_mockup_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      mockup: {
        id: mockup.id,
        imageUrl: publicUrl,
        prompt: landscapingPrompt
      }
    })

  } catch (error) {
    console.error('Error generating mockup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
