'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign,
  Search,
  Package,
  Loader2
} from 'lucide-react'
import { Database } from '@/types/database'

type Session = Database['public']['Tables']['sessions']['Row']
type Estimate = Database['public']['Tables']['estimates']['Row']

interface PricingItem {
  id: string
  name: string
  category: string
  description: string
  low_price: number
  high_price: number
  unit: string
}

interface EstimateItem extends PricingItem {
  quantity: number
  selectedPrice: number
}

interface EstimateBuilderProps {
  session: Session
  existingEstimate?: Estimate | null
  onEstimateCreated: (estimate: any) => void
}

const CATEGORIES = [
  { id: 'all', name: 'All Items', icon: Package },
  { id: 'lawn', name: 'Lawn & Turf', icon: Package },
  { id: 'planting', name: 'Plants & Flowers', icon: Package },
  { id: 'trees', name: 'Trees & Shrubs', icon: Package },
  { id: 'hardscape', name: 'Hardscaping', icon: Package },
  { id: 'irrigation', name: 'Irrigation', icon: Package },
  { id: 'lighting', name: 'Lighting', icon: Package },
  { id: 'maintenance', name: 'Maintenance', icon: Package }
]

export default function EstimateBuilder({ session, existingEstimate, onEstimateCreated }: EstimateBuilderProps) {
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([])
  const [estimateItems, setEstimateItems] = useState<EstimateItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [discountPercent, setDiscountPercent] = useState(0)
  const [taxPercent, setTaxPercent] = useState(8.25) // Default sales tax

  useEffect(() => {
    fetchPricingItems()
    if (existingEstimate) {
      loadExistingEstimate()
    }
  }, [existingEstimate])

  useEffect(() => {
    fetchPricingItems()
  }, [selectedCategory])

  const fetchPricingItems = async () => {
    try {
      const category = selectedCategory === 'all' ? '' : selectedCategory
      const response = await fetch(`/api/pricing?category=${category}`)
      const data = await response.json()
      
      if (data.success) {
        setPricingItems(data.items)
      }
    } catch (error) {
      console.error('Error fetching pricing items:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExistingEstimate = () => {
    if (existingEstimate?.items) {
      const items = Array.isArray(existingEstimate.items) 
        ? existingEstimate.items 
        : JSON.parse(existingEstimate.items as string)
      setEstimateItems(items)
    }
  }

  const filteredItems = pricingItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const addItemToEstimate = (item: PricingItem) => {
    const existingItem = estimateItems.find(ei => ei.id === item.id)
    
    if (existingItem) {
      setEstimateItems(prev =>
        prev.map(ei =>
          ei.id === item.id
            ? { ...ei, quantity: ei.quantity + 1 }
            : ei
        )
      )
    } else {
      const estimateItem: EstimateItem = {
        ...item,
        quantity: 1,
        selectedPrice: (item.low_price + item.high_price) / 2 // Default to middle price
      }
      setEstimateItems(prev => [...prev, estimateItem])
    }
  }

  const removeItemFromEstimate = (itemId: string) => {
    setEstimateItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromEstimate(itemId)
      return
    }
    
    setEstimateItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const updateItemPrice = (itemId: string, price: number) => {
    setEstimateItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, selectedPrice: price }
          : item
      )
    )
  }

  const calculateTotals = () => {
    const subtotal = estimateItems.reduce((sum, item) => {
      return sum + (item.quantity * item.selectedPrice)
    }, 0)

    const discountAmount = subtotal * (discountPercent / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (taxPercent / 100)
    const total = afterDiscount + taxAmount

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total
    }
  }

  const saveEstimate = async () => {
    if (estimateItems.length === 0) {
      alert('Please add at least one item to the estimate.')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: session.id,
          items: estimateItems,
          discountPercent,
          taxPercent
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save estimate')
      }

      onEstimateCreated(result.estimate)

    } catch (error) {
      console.error('Error saving estimate:', error)
      alert(error instanceof Error ? error.message : 'Failed to save estimate')
    } finally {
      setSaving(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      {/* Category Filter (Styled like other retro cards) */}
      <div className="retro-card-tile">
        <div className="mb-4">
          <h3 className="retro-card-title text-base flex items-center">
            <Calculator className="w-5 h-5 mr-2" /> Build Estimate
          </h3>
          <p className="retro-card-meta">Select landscaping items and quantities to build your estimate</p>
        </div>
        <div className="chip-group mb-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`retro-chip ${selectedCategory === category.id ? 'active' : ''}`}
            >
              {category.name}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            className="vercel-input pl-10"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Available Items */}
      <Card>
        <CardHeader>
          <CardTitle>Available Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p>Loading pricing items...</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="retro-card-tile">
                  <div className="tile-row">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="retro-card-title">{item.name}</h4>
                        <span className="chip-sm">{item.category}</span>
                      </div>
                      <p className="retro-card-meta mt-1">{item.description}</p>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        ${item.low_price.toFixed(2)} - ${item.high_price.toFixed(2)} per {item.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => addItemToEstimate(item)}
                      className="retro-cta"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredItems.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500">
                  No items found. Try adjusting your search or category filter.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Estimate */}
      {estimateItems.length > 0 && (
        <div className="retro-card-tile">
          <h3 className="retro-card-title text-base mb-2">Current Estimate</h3>
          <div className="space-y-3">
            {estimateItems.map((item) => (
              <div key={item.id} className="retro-card-tile">
                <div className="tile-row items-center">
                  <div className="flex-1">
                    <h4 className="retro-card-title">{item.name}</h4>
                    <p className="retro-card-meta">{item.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="retro-chip" onClick={() => updateItemQuantity(item.id, item.quantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button className="retro-chip" onClick={() => updateItemQuantity(item.id, item.quantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={item.selectedPrice}
                      onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                      className="vercel-input w-24 text-center"
                      step="0.01"
                      min={item.low_price}
                      max={item.high_price}
                    />
                    <span className="retro-card-meta">per {item.unit}</span>
                  </div>
                  <div className="font-medium min-w-[80px] text-right">
                    ${(item.quantity * item.selectedPrice).toFixed(2)}
                  </div>
                  <button className="retro-chip" onClick={() => removeItemFromEstimate(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Adjustments */}
          <div className="retro-card-tile retro-card-gray">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="discount" className="retro-card-meta">Discount (%)</label>
                <input
                  id="discount"
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={100}
                  step={0.1}
                  className="vercel-input"
                />
              </div>
              <div>
                <label htmlFor="tax" className="retro-card-meta">Tax Rate (%)</label>
                <input
                  id="tax"
                  type="number"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                  min={0}
                  max={50}
                  step={0.01}
                  className="vercel-input"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-4">
              <div className="tile-row">
                <span className="retro-card-meta">Subtotal</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              {discountPercent > 0 && (
                <div className="tile-row text-red-600">
                  <span>Discount ({discountPercent}%)</span>
                  <span>-${totals.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="tile-row">
                <span className="retro-card-meta">Tax ({taxPercent}%)</span>
                <span>${totals.taxAmount.toFixed(2)}</span>
              </div>
              <div className="tile-row text-lg font-bold pt-2">
                <span>Total</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={saveEstimate}
              disabled={saving}
              className="retro-cta w-full mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving Estimate...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4 mr-2" />
                  Save Estimate
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
