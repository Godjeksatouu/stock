'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, ShoppingCart, User, Scan, Search, Package, X, Minus, Percent } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/currency'

interface SimplePurchaseFormProps {
  stockId: string
}

interface Client {
  id: number
  name: string
  email?: string
  phone?: string
}

interface Product {
  id: number
  name: string
  price: number
  barcodes?: string[]
}

interface CartItem {
  product: Product
  quantity: number
  unit_price: number
  total_price: number
  discount_type?: 'percentage' | 'amount'
  discount_value?: number
  discount_amount?: number
}

export default function SimplePurchaseForm({ stockId }: SimplePurchaseFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [formData, setFormData] = useState({
    client_id: '',
    payment_status: 'paid',
    payment_method: 'cash',
    amount_paid: '',
    notes: ''
  })
  const [globalDiscount, setGlobalDiscount] = useState({
    type: 'percentage' as 'percentage' | 'amount',
    value: 0
  })
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    price: '',
    barcode: ''
  })
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch clients and products when form opens
  useEffect(() => {
    if (showForm) {
      fetchClients()
      fetchProducts()
    }
  }, [showForm])

  const fetchClients = async () => {
    try {
      const response = await fetch(`/api/clients?stockId=${stockId}`)
      const result = await response.json()
      if (result.success && result.data) {
        setClients(result.data)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?stockId=${stockId}`)
      const result = await response.json()
      const list = result?.data?.products || result?.data || []
      if (Array.isArray(list)) setProducts(list)
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const cleanBarcode = (input: string): string => {
    if (!input) return ''
    let cleaned = input.replace(/[^0-9]/g, '')
    if (cleaned.length >= 8) return cleaned

    const frenchToNumeric: { [key: string]: string } = {
      'à': '0', '&': '1', 'é': '2', '"': '3', "'": '4',
      '(': '5', '-': '6', 'è': '7', '_': '8', 'ç': '9'
    }
    const frenchMapped = input.split('').map(char => frenchToNumeric[char] || '').join('')
    if (frenchMapped.length > cleaned.length) cleaned = frenchMapped
    return cleaned.replace(/[^0-9]/g, '')
  }

  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0)
    let total = subtotal

    // Apply global discount
    if (globalDiscount.value > 0) {
      if (globalDiscount.type === 'percentage') {
        total = subtotal - (subtotal * globalDiscount.value) / 100
      } else {
        total = Math.max(0, subtotal - globalDiscount.value)
      }
    }

    const amountPaid = parseFloat(formData.amount_paid) || 0
    const remaining = total - amountPaid
    const globalDiscountAmount = subtotal - total

    return { subtotal, total, amountPaid, remaining, globalDiscountAmount }
  }

  const calculateItemTotal = (item: CartItem) => {
    const baseTotal = item.quantity * item.unit_price
    if (item.discount_type && item.discount_value && item.discount_value > 0) {
      if (item.discount_type === 'percentage') {
        const discountAmount = (baseTotal * item.discount_value) / 100
        return baseTotal - discountAmount
      } else {
        return Math.max(0, baseTotal - item.discount_value)
      }
    }
    return baseTotal
  }

  const addToCart = (product: Product, quantity: number = 1) => {
    const existingItemIndex = cart.findIndex(item => item.product.id === product.id)

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart]
      updatedCart[existingItemIndex].quantity += quantity
      updatedCart[existingItemIndex].total_price = calculateItemTotal(updatedCart[existingItemIndex])
      setCart(updatedCart)
    } else {
      const newItem: CartItem = {
        product,
        quantity,
        unit_price: product.price,
        total_price: product.price * quantity,
        discount_type: undefined,
        discount_value: 0,
        discount_amount: 0
      }
      setCart([...cart, newItem])
    }

    toast({
      title: "Produit ajouté",
      description: `${product.name} ajouté au panier`,
      duration: 2000
    })
  }

  const updateCartItemQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId))
      return
    }

    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        const updatedItem = {
          ...item,
          quantity: newQuantity
        }
        updatedItem.total_price = calculateItemTotal(updatedItem)
        return updatedItem
      }
      return item
    })
    setCart(updatedCart)
  }

  const updateItemDiscount = (productId: number, discountType: 'percentage' | 'amount', discountValue: number) => {
    const updatedCart = cart.map(item => {
      if (item.product.id === productId) {
        const baseTotal = item.quantity * item.unit_price
        let discountAmount = 0

        if (discountValue > 0) {
          if (discountType === 'percentage') {
            discountAmount = (baseTotal * discountValue) / 100
          } else {
            discountAmount = discountValue
          }
        }

        const updatedItem = {
          ...item,
          discount_type: discountType,
          discount_value: discountValue,
          discount_amount: discountAmount
        }
        updatedItem.total_price = calculateItemTotal(updatedItem)
        return updatedItem
      }
      return item
    })
    setCart(updatedCart)
  }

  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return

    try {
      const { cleanBarcode } = await import('@/lib/barcode')
      const cleanedBarcode = cleanBarcode(barcodeInput.trim())
      console.log('🔍 Searching for product with barcode:', cleanedBarcode)

      const response = await fetch(`/api/products/search?barcode=${cleanedBarcode}`)
      const result = await response.json()

      if (result.success && result.data) {
        addToCart(result.data)
        setBarcodeInput('')
      } else {
        toast({
          title: "Produit non trouvé",
          description: `Code: ${cleanedBarcode} - Voulez-vous l'ajouter ?`,
          duration: 4000
        })
        setNewProductForm({
          ...newProductForm,
          barcode: cleanedBarcode
        })
        setShowNewProductForm(true)
        setBarcodeInput('')
      }
    } catch (error) {
      console.error('Error searching product:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors de la recherche du produit"
      })
    }
  }

  const handleAddNewProduct = async () => {
    if (!newProductForm.name || !newProductForm.price) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Nom et prix sont requis"
      })
      return
    }

    try {
      const stockMapping = { 'al-ouloum': 1, 'renaissance': 2, 'gros': 3 }
      const dbStockId = stockMapping[stockId as keyof typeof stockMapping] || 2

      const productData = {
        name: newProductForm.name,
        price: parseFloat(newProductForm.price),
        quantity: 1,
        stock_id: dbStockId,
        barcodes: newProductForm.barcode ? [newProductForm.barcode] : []
      }

      const response = await fetch(`/api/products?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData)
      })

      const result = await response.json()

      if (result.success) {
        const newProduct: Product = {
          id: result.data.id,
          name: newProductForm.name,
          price: parseFloat(newProductForm.price),
          barcodes: newProductForm.barcode ? [newProductForm.barcode] : []
        }

        addToCart(newProduct, 1)
        setShowNewProductForm(false)
        setNewProductForm({ name: '', price: '', barcode: '' })

        toast({
          title: "Produit créé",
          description: `${newProductForm.name} a été créé et ajouté au panier`,
          duration: 3000
        })
      } else {
        throw new Error(result.error || 'Erreur lors de la création du produit')
      }
    } catch (error) {
      console.error('Error creating product:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de créer le produit"
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (cart.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le panier est vide"
      })
      return
    }

    const { total, amountPaid } = calculateTotals()

    if (formData.payment_status === 'partial' && amountPaid <= 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Montant payé requis pour un paiement partiel"
      })
      return
    }

    setSubmitting(true)

    try {
      const stockMapping = { 'al-ouloum': 1, 'renaissance': 2, 'gros': 3 }
      const dbStockId = stockMapping[stockId as keyof typeof stockMapping] || 2

      // Get user data from localStorage
      const userData = localStorage.getItem("user")
      let userId = 1 // Default user ID

      if (userData) {
        try {
          const user = JSON.parse(userData)
          userId = user.id || 1
        } catch (error) {
          console.warn('Error parsing user data:', error)
        }
      }

      const { globalDiscountAmount } = calculateTotals()

      const saleData = {
        user_id: userId,
        client_id: formData.client_id === 'divers' ? null : (formData.client_id ? parseInt(formData.client_id) : null),
        stock_id: dbStockId,
        total: total,
        amount_paid: formData.payment_status === 'paid' ? total : (formData.payment_status === 'partial' ? amountPaid : 0),
        change_amount: formData.payment_status === 'paid' ? 0 : null,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status === 'unpaid' ? 'pending' : (formData.payment_status === 'paid' ? 'paid' : 'partial'),
        notes: formData.notes,
        source: 'manual',
        global_discount_type: globalDiscount.type,
        global_discount_value: globalDiscount.value,
        global_discount_amount: globalDiscountAmount,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          discount_type: item.discount_type || 'percentage',
          discount_value: item.discount_value || 0,
          discount_amount: item.discount_amount || 0
        }))
      }

      console.log('🛒 Submitting sale data:', saleData)

      const response = await fetch(`/api/sales?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      console.log('📥 Response status:', response.status)

      const result = await response.json()
      console.log('📥 Response data:', result)

      if (result.success) {
        try { window.dispatchEvent(new CustomEvent('sales-updated', { detail: { stockId } })); } catch {}
        toast({
          title: "Achat enregistré",
          description: `Vente #${result.data.id} créée avec succès`,
          duration: 3000
        })

        // Générer et stocker automatiquement la facture A4, puis télécharger
        try {
          const { generateImprovedA4InvoicePDF } = await import('@/lib/a4-invoice-generator-improved')
          const detailsRes = await fetch(`/api/sales/${result.data.id}?stockId=${stockId}`)
          const detailsJson = await detailsRes.json()
          if (detailsJson.success) {
            const s = detailsJson.data
            const stockName = (detailsJson.data?.stock_name) || (stockId === 'renaissance' ? 'Librairie La Renaissance' : stockId === 'al-ouloum' ? 'Librairie Al Ouloum' : 'Gros (Dépôt)')
            const invoiceData = {
              invoiceNumber: s.invoice_number || s.sale_number,
              date: new Date(s.created_at).toLocaleDateString('fr-FR'),
              customerName: s.customer_name || 'Client anonyme',
              items: (s.items || []).map((it: any) => ({
                product_name: it.product_name,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
                total_price: Number(it.total_price)
              })),
              subtotal: Number(s.subtotal || s.total_amount),
              discount: Number(s.global_discount_amount || 0),
              tax: Number(s.tax_amount || 0),
              total: Number(s.total_amount),
              amountPaid: Number(s.amount_paid || 0),
              change: Number(s.change_amount || 0),
              paymentMethod: s.payment_method || 'cash',
              notes: s.notes || undefined,
              stockId: stockId,
              stockName,
              factureBarcode: s.sale_barcode || s.barcode || s.barcodes || '',
              barcodes: s.barcodes
            }
            const pdf = generateImprovedA4InvoicePDF(invoiceData)
            const blob = pdf.output('blob')
            const filename = `facture_A4_${invoiceData.invoiceNumber}.pdf`
            pdf.save(filename)
            const arrayBuffer = await blob.arrayBuffer()
            const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
            await fetch('/api/invoices/store', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sale_id: result.data.id, filename, pdf_base64: base64Data })
            })
          }
        } catch (e) {
          console.warn('A4 auto-generation/storage failed:', e)
        }

        // Réinitialiser le formulaire
        setCart([])
        setBarcodeInput('')
        setFormData({
          client_id: '',
          payment_status: 'paid',
          payment_method: 'cash',
          amount_paid: '',
          notes: ''
        })
        setGlobalDiscount({ type: 'percentage', value: 0 })
        setShowForm(false)
      } else {
        console.error('❌ Sale creation failed:', result.error)
        throw new Error(result.error || 'Erreur lors de la création de la vente')
      }
    } catch (error) {
      console.error('Error creating sale:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'enregistrer l'achat"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Ajouter une nouvelle vente
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Ajouter une nouvelle vente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Client
            </Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({...formData, client_id: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="divers">Client Divers</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barcode Scanner */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Scanner un produit
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Scanner ou saisir le code-barres du produit..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleBarcodeSearch()
                  }
                }}
                className="flex-1"
              />
              <Button
                onClick={handleBarcodeSearch}
                disabled={!barcodeInput.trim()}
                variant="outline"
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Manual product add */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                <div>
                  <Label>Ajouter un produit</Label>
                  <Select
                    value={selectedProductId}
                    onValueChange={(val) => setSelectedProductId(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un produit" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.name} — {formatPrice(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min={1}
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
                <div>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={!selectedProductId}
                    onClick={() => {
                      const prod = products.find(p => p.id.toString() === selectedProductId)
                      if (prod) {
                        addToCart(prod, selectedQuantity)
                        setSelectedProductId('')
                        setSelectedQuantity(1)
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Ajouter au panier
                  </Button>
                </div>
              </div>

            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Produits dans le panier ({cart.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCart([])}
                >
                  Vider le panier
                </Button>
              </div>

              <div className="border rounded-lg p-4 space-y-3 max-h-80 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{item.product.name}</div>
                        <div className="text-sm text-gray-600">
                          {formatPrice(item.unit_price)} × {item.quantity} = {formatPrice(item.total_price)}
                          {item.discount_value && item.discount_value > 0 && (
                            <span className="text-green-600 ml-2">
                              (Remise: {item.discount_type === 'percentage' ? `${item.discount_value}%` : formatPrice(item.discount_value)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Individual Item Discount */}
                    <div className="flex items-center gap-2 text-sm">
                      <Label className="text-xs">Remise:</Label>
                      <Select
                        value={item.discount_type || 'percentage'}
                        onValueChange={(value: 'percentage' | 'amount') => {
                          updateItemDiscount(item.product.id, value, item.discount_value || 0)
                        }}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="amount">DH</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min="0"
                        max={item.discount_type === 'percentage' ? '100' : undefined}
                        step={item.discount_type === 'percentage' ? '1' : '0.01'}
                        value={item.discount_value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0
                          updateItemDiscount(item.product.id, item.discount_type || 'percentage', value)
                        }}
                        className="w-20 h-8"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Discount */}
          {cart.length > 0 && (
            <div className="space-y-4 border rounded-lg p-4 bg-blue-50">
              <Label className="flex items-center gap-2 font-medium">
                <Percent className="w-4 h-4" />
                Remise Globale
              </Label>
              <div className="flex items-center gap-2">
                <Select
                  value={globalDiscount.type}
                  onValueChange={(value: 'percentage' | 'amount') =>
                    setGlobalDiscount({ ...globalDiscount, type: value })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="amount">DH</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max={globalDiscount.type === 'percentage' ? '100' : undefined}
                  step={globalDiscount.type === 'percentage' ? '1' : '0.01'}
                  value={globalDiscount.value}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    setGlobalDiscount({ ...globalDiscount, value })
                  }}
                  className="w-20"
                  placeholder="0"
                />
                {globalDiscount.value > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    -{formatPrice(calculateTotals().globalDiscountAmount)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Payment Status */}
          <div className="space-y-4">
            <Label>Statut du paiement</Label>
            <Select
              value={formData.payment_status}
              onValueChange={(value) => setFormData({...formData, payment_status: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="partial">Paiement Partiel</SelectItem>
                <SelectItem value="unpaid">En attente</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Méthode de paiement</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Espèce</SelectItem>
                  <SelectItem value="bank">Virement bancaire</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Partial Payment Details */}
            {formData.payment_status === 'partial' && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-blue-800">Montant Total</Label>
                    <div className="text-lg font-bold text-blue-900">
                      {formatPrice(calculateTotals().total)}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="amount_paid" className="text-sm font-medium text-blue-800">
                      Montant Payé
                    </Label>
                    <Input
                      id="amount_paid"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount_paid}
                      onChange={(e) => setFormData({...formData, amount_paid: e.target.value})}
                      className="border-blue-300 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-blue-800">Montant Restant</Label>
                    <div className="text-lg font-bold text-red-600">
                      {formatPrice(Math.max(0, calculateTotals().remaining))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <textarea
              id="notes"
              placeholder="Ajouter des notes sur cet achat..."
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Total Summary */}
          {cart.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">Sous-total:</span>
                <span className="font-medium">{formatPrice(calculateTotals().subtotal)}</span>
              </div>
              {calculateTotals().globalDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-green-700">Remise globale:</span>
                  <span className="font-medium text-red-600">-{formatPrice(calculateTotals().globalDiscountAmount)}</span>
                </div>
              )}
              <div className="border-t border-green-200 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-green-800">Total de la vente:</span>
                  <span className="text-2xl font-bold text-green-900">
                    {formatPrice(calculateTotals().total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setCart([])
                setBarcodeInput('')
                setFormData({
                  client_id: '',
                  payment_status: 'paid',
                  payment_method: 'cash',
                  amount_paid: '',
                  notes: ''
                })
                setGlobalDiscount({ type: 'percentage', value: 0 })
                setShowForm(false)
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={cart.length === 0 || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enregistrement...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Enregistrer la Vente
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add New Product Form */}
      {showNewProductForm && (
        <Card className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white shadow-lg">
          <CardHeader>
            <CardTitle>Ajouter un Nouveau Produit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product_name">Nom du produit *</Label>
              <Input
                id="product_name"
                placeholder="Nom du produit"
                value={newProductForm.name}
                onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="product_price">Prix *</Label>
              <Input
                id="product_price"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newProductForm.price}
                onChange={(e) => setNewProductForm({...newProductForm, price: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="product_barcode">Code-barres</Label>
              <Input
                id="product_barcode"
                placeholder="Code-barres"
                value={newProductForm.barcode}
                onChange={(e) => setNewProductForm({...newProductForm, barcode: e.target.value})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowNewProductForm(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleAddNewProduct}
                disabled={!newProductForm.name || !newProductForm.price}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer et Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
