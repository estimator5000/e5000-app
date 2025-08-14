import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { supabase } from '@/lib/supabase'

const sheets = google.sheets('v4')

// Initialize Google Sheets auth
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: 'service_account',
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    // Remove the properties causing type errors
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // First, try to get pricing items from Supabase database
    let query = supabase.from('pricing_items').select('*')
    
    if (category) {
      query = query.eq('category', category)
    }

    const { data: dbItems, error: dbError } = await query.order('name')

    if (!dbError && dbItems && dbItems.length > 0) {
      return NextResponse.json({
        success: true,
        items: dbItems,
        source: 'database'
      })
    }

    // Fallback to Google Sheets if no data in database
    if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
      try {
        const authClient = await auth.getClient()
        google.options({ auth: authClient })

        const range = 'Pricing!A:F' // Assuming columns: Name, Category, Description, Low Price, High Price, Unit
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
          range,
        })

        const rows = response.data.values
        if (!rows || rows.length === 0) {
          return NextResponse.json({
            success: true,
            items: [],
            source: 'sheets'
          })
        }

        // Skip header row and parse data
        const items = rows.slice(1).map((row, index) => ({
          id: `sheet-${index}`,
          name: row[0] || '',
          category: row[1] || 'general',
          description: row[2] || '',
          low_price: parseFloat(row[3]) || 0,
          high_price: parseFloat(row[4]) || 0,
          unit: row[5] || 'each'
        })).filter(item => {
          // Filter by category if specified
          return !category || item.category.toLowerCase() === category.toLowerCase()
        })

        return NextResponse.json({
          success: true,
          items,
          source: 'sheets'
        })

      } catch (sheetsError) {
        console.error('Google Sheets error:', sheetsError)
        // Fall through to default items
      }
    }

    // Return default pricing items if both database and sheets fail
    const defaultItems = [
      {
        id: 'default-1',
        name: 'Lawn Installation (per sq ft)',
        category: 'lawn',
        description: 'New sod or seed installation',
        low_price: 2.50,
        high_price: 4.00,
        unit: 'sq ft'
      },
      {
        id: 'default-2',
        name: 'Flower Bed Design (per sq ft)',
        category: 'planting',
        description: 'Designed flower bed with plants',
        low_price: 8.00,
        high_price: 15.00,
        unit: 'sq ft'
      },
      {
        id: 'default-3',
        name: 'Tree Planting (small)',
        category: 'trees',
        description: 'Small ornamental tree installation',
        low_price: 150.00,
        high_price: 300.00,
        unit: 'each'
      },
      {
        id: 'default-4',
        name: 'Tree Planting (large)',
        category: 'trees',
        description: 'Large shade tree installation',
        low_price: 400.00,
        high_price: 800.00,
        unit: 'each'
      },
      {
        id: 'default-5',
        name: 'Mulch Installation',
        category: 'maintenance',
        description: 'Premium mulch spread',
        low_price: 3.50,
        high_price: 5.00,
        unit: 'sq ft'
      },
      {
        id: 'default-6',
        name: 'Irrigation System (basic)',
        category: 'irrigation',
        description: 'Basic sprinkler system installation',
        low_price: 2500.00,
        high_price: 4000.00,
        unit: 'system'
      },
      {
        id: 'default-7',
        name: 'Hardscaping (walkway)',
        category: 'hardscape',
        description: 'Stone or concrete walkway',
        low_price: 12.00,
        high_price: 25.00,
        unit: 'sq ft'
      },
      {
        id: 'default-8',
        name: 'Landscape Lighting',
        category: 'lighting',
        description: 'LED landscape lighting installation',
        low_price: 200.00,
        high_price: 400.00,
        unit: 'fixture'
      }
    ].filter(item => {
      return !category || item.category.toLowerCase() === category.toLowerCase()
    })

    return NextResponse.json({
      success: true,
      items: defaultItems,
      source: 'default'
    })

  } catch (error) {
    console.error('Error fetching pricing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, items, discountPercent, taxPercent } = await request.json()

    if (!sessionId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Session ID and items array are required' },
        { status: 400 }
      )
    }

    // Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.selectedPrice)
    }, 0)

    const discountAmount = subtotal * ((discountPercent || 0) / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * ((taxPercent || 0) / 100)
    const total = afterDiscount + taxAmount

    // Calculate price ranges for estimate
    const lowEstimate = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.lowPrice)
    }, 0)

    const highEstimate = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.highPrice)
    }, 0)

    // Save estimate to database
    const { data: estimate, error } = await supabase
      .from('estimates')
      .insert([{
        session_id: sessionId,
        items: items,
        subtotal: subtotal,
        low_estimate: lowEstimate,
        high_estimate: highEstimate,
        final_amount: total
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    // Update session status
    await supabase
      .from('sessions')
      .update({ 
        status: 'estimate_generated',
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      estimate: {
        id: estimate.id,
        subtotal,
        discountAmount,
        taxAmount,
        total,
        lowEstimate,
        highEstimate,
        items
      }
    })

  } catch (error) {
    console.error('Error creating estimate:', error)
    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    )
  }
}
