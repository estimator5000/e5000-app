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
      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Build Estimate
          </CardTitle>
          <CardDescription>
            Select landscaping items and quantities to build your estimate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <p className="text-sm font-medium text-green-600 mt-1">
                      ${item.low_price.toFixed(2)} - ${item.high_price.toFixed(2)} per {item.unit}
                    </p>
                  </div>
                  <Button
                    onClick={() => addItemToEstimate(item)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
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
        <Card>
          <CardHeader>
            <CardTitle>Current Estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {estimateItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={item.selectedPrice}
                    onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                    className="w-20 text-center"
                    step="0.01"
                    min={item.low_price}
                    max={item.high_price}
                  />
                  <span className="text-sm text-gray-500">per {item.unit}</span>
                </div>

                <div className="font-medium min-w-[80px] text-right">
                  ${(item.quantity * item.selectedPrice).toFixed(2)}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItemFromEstimate(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            {/* Pricing Adjustments */}
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount">Discount (%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="tax">Tax Rate (%)</Label>
                  <Input
                    id="tax"
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="50"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount ({discountPercent}%):</span>
                    <span>-${totals.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({taxPercent}%):</span>
                  <span>${totals.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span>${totals.total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={saveEstimate}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
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
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
