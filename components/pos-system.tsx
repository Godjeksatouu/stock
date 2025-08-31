"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Minus, ShoppingCart, Trash2, CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface Product {
  id: number
  name: string
  price: number
  quantity: number
  barcode?: string
  reference?: string
}

interface CartItem {
  id: number
  product_id: number
  name: string
  price: number
  quantity: number
  total: number
  barcode?: string
}

interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
}

interface POSSystemProps {
  stockId: string
}

export default function POSSystem({ stockId }: POSSystemProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('anonymous')
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [showCheckout, setShowCheckout] = useState(false)

  const stockNames = {
    'al-ouloum': 'Librairie Al Ouloum',
    'renaissance': 'Librairie La Renaissance',
    'gros': 'Gros (Dépôt général)'
  }

  const fetchProducts = useCallback(async (search = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        stockId: stockId || '',
        limit: '100'
      })
      
      if (search && search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/products?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        const productsArray = Array.isArray(result.data.products) ? result.data.products : []
        setProducts(productsArray)
      } else {
        throw new Error(result.error || 'Failed to fetch products')
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [stockId])

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await fetch('/api/customers-list')
      const result = await response.json()
      if (result.success && result.data) {
        const customersArray = Array.isArray(result.data) ? result.data : []
        setCustomers(customersArray)
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setCustomers([])
    }
  }, [])

  useEffect(() => {
    if (stockId) {
      fetchProducts()
      fetchCustomers()
    }
  }, [stockId, fetchProducts, fetchCustomers])

  const handleSearch = useCallback(() => {
    fetchProducts(searchTerm)
  }, [fetchProducts, searchTerm])

  const handleBarcodeSearch = useCallback(async () => {
    if (!barcodeInput.trim()) return

    try {
      setError(null)
      
      // Search for product by barcode
      const response = await fetch(`/api/products?stockId=${stockId}&barcode=${encodeURIComponent(barcodeInput.trim())}`)
      const result = await response.json()

      if (result.success && result.data && result.data.products && result.data.products.length > 0) {
        const product = result.data.products[0]
        addToCart(product)
        setBarcodeInput('')
        setSuccess(`Produit "${product.name}" ajouté au panier`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError(`Aucun produit trouvé avec le code-barres: ${barcodeInput}`)
        setTimeout(() => setError(null), 3000)
      }
    } catch (err) {
      console.error('Error searching by barcode:', err)
      setError('Erreur lors de la recherche par code-barres')
      setTimeout(() => setError(null), 3000)
    }
  }, [barcodeInput, stockId])

  const addToCart = useCallback((product: Product) => {
    try {
      setError(null)
      
      if (!product || !product.id) {
        setError('Produit invalide')
        return
      }

      if (product.quantity <= 0) {
        setError(`Stock insuffisant pour "${product.name}"`)
        return
      }

      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.product_id === product.id)
        
        if (existingItem) {
          // Check if we can add more
          if (existingItem.quantity >= product.quantity) {
            setError(`Stock maximum atteint pour "${product.name}" (${product.quantity} disponible)`)
            return prevCart
          }
          
          // Update existing item
          return prevCart.map(item =>
            item.product_id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total: (item.quantity + 1) * item.price
                }
              : item
          )
        } else {
          // Add new item
          const newItem: CartItem = {
            id: Date.now(), // Temporary ID for cart
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            total: product.price,
            barcode: product.barcode
          }
          return [...prevCart, newItem]
        }
      })

      setSuccess(`"${product.name}" ajouté au panier`)
      setTimeout(() => setSuccess(null), 2000)
    } catch (err) {
      console.error('Error adding to cart:', err)
      setError('Erreur lors de l\'ajout au panier')
    }
  }, [])

  const updateCartItemQuantity = useCallback((cartItemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId)
      return
    }

    setCart(prevCart =>
      prevCart.map(item =>
        item.id === cartItemId
          ? {
              ...item,
              quantity: newQuantity,
              total: newQuantity * item.price
            }
          : item
      )
    )
  }, [])

  const removeFromCart = useCallback((cartItemId: number) => {
    setCart(prevCart => prevCart.filter(item => item.id !== cartItemId))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setSelectedCustomer('anonymous')
    setPaymentMethod('cash')
  }, [])

  const calculateTotal = useCallback(() => {
    return cart.reduce((total, item) => total + item.total, 0)
  }, [cart])

  const handleCheckout = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)

      if (cart.length === 0) {
        setError('Le panier est vide')
        return
      }

      const total = calculateTotal()
      
      const saleData = {
        customer_id: selectedCustomer === 'anonymous' ? null : parseInt(selectedCustomer),
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: 'paid',
        subtotal: total,
        tax_amount: 0,
        discount_amount: 0,
        notes: `Vente POS - ${cart.length} article(s)`,
        source: 'pos',
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }))
      }

      const response = await fetch(`/api/sales?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      })

      const result = await response.json()

      if (result.success) {
        // Notifier le dashboard/statistiques pour mise à jour immédiate
        try { window.dispatchEvent(new CustomEvent('sales-updated', { detail: { stockId } })); } catch {}
        // Générer automatiquement la facture A4
        try {
          console.log('🧾 Génération de la facture A4 pour la vente POS:', result.data.id)

          const a4Response = await fetch('/api/invoices/generate-a4', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sale_id: result.data.id,
              stockId: stockId
            })
          })

          if (a4Response.ok) {
            const blob = await a4Response.blob()
            const url = URL.createObjectURL(blob)
            const filename = `facture_A4_${result.data.invoice_number || result.data.id}.pdf`

            // Méthode principale de téléchargement
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.style.display = 'none'
            document.body.appendChild(a)

            // Forcer le téléchargement
            try {
              a.click()
              console.log('✅ Facture A4 téléchargée automatiquement:', filename)
              setSuccess(`Vente enregistrée avec succès! Total: ${formatPrice(total)} - Facture A4 téléchargée automatiquement`)
            } catch (clickError) {
              console.warn('⚠️ Téléchargement automatique échoué, ouverture dans un nouvel onglet')

              // Fallback: ouvrir dans un nouvel onglet
              const newWindow = window.open(url, '_blank')
              if (newWindow) {
                newWindow.focus()
                setSuccess(`Vente enregistrée avec succès! Total: ${formatPrice(total)} - Facture A4 ouverte dans un nouvel onglet`)
              }
            }

            // Nettoyage
            document.body.removeChild(a)
            setTimeout(() => URL.revokeObjectURL(url), 1000)

            console.log('✅ Facture A4 générée et téléchargée avec succès')
          } else {
            console.error('❌ Erreur lors de la génération de la facture A4:', await a4Response.text())
            setSuccess(`Vente enregistrée avec succès! Total: ${formatPrice(total)} - Erreur génération facture`)
          }
        } catch (error) {
          console.error('❌ Erreur lors de la génération de la facture A4:', error)
          setSuccess(`Vente enregistrée avec succès! Total: ${formatPrice(total)} - Erreur génération facture`)
        }

        clearCart()
        setShowCheckout(false)
        setTimeout(() => setSuccess(null), 5000)
      } else {
        throw new Error(result.error || 'Failed to process sale')
      }
    } catch (err) {
      console.error('Error processing checkout:', err)
      setError(err instanceof Error ? err.message : 'Erreur lors de la finalisation')
    } finally {
      setLoading(false)
    }
  }, [cart, selectedCustomer, paymentMethod, stockId, calculateTotal, clearCart])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Caisse POS</h1>
                <p className="text-sm text-gray-600">
                  {stockNames[stockId as keyof typeof stockNames] || stockId}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-lg px-3 py-1">
                Panier: {cart.length} article(s)
              </Badge>
              <Badge variant="default" className="text-lg px-3 py-1">
                Total: {formatPrice(calculateTotal())}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Produits Disponibles</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search Controls */}
                <div className="space-y-4 mb-6">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Rechercher un produit..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </div>
                    <Button onClick={handleSearch}>
                      <Search className="w-4 h-4 mr-2" />
                      Rechercher
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Scanner ou saisir code-barres..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSearch()}
                      />
                    </div>
                    <Button onClick={handleBarcodeSearch} variant="outline">
                      Scanner
                    </Button>
                  </div>
                </div>

                {/* Products Grid */}
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des produits...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.isArray(products) && products.length > 0 ? (
                      products.map((product) => (
                        <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900 flex-1">{product.name}</h3>
                            <span className="text-lg font-bold text-blue-600 ml-2">
                              {formatPrice(product.price)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              <p>Stock: {product.quantity}</p>
                              {product.barcode && <p>Code: {product.barcode}</p>}
                            </div>
                            <Button
                              onClick={() => addToCart(product)}
                              disabled={product.quantity <= 0}
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Ajouter
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        Aucun produit trouvé
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart Section */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Panier</span>
                  {cart.length > 0 && (
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Vider
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Panier vide</p>
                    <p className="text-sm">Ajoutez des produits pour commencer</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart Items */}
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-600">{formatPrice(item.price)} × {item.quantity}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span>Total:</span>
                        <span>{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
                      <DialogTrigger asChild>
                        <Button className="w-full" size="lg">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Finaliser la Vente
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Finaliser la Vente</DialogTitle>
                          <DialogDescription>
                            Confirmez les détails de la vente
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="customer">Client</Label>
                            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner un client" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="anonymous">Client anonyme</SelectItem>
                                {Array.isArray(customers) && customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id.toString()}>
                                    {customer.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="payment">Méthode de paiement</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Espèces</SelectItem>
                                <SelectItem value="card">Carte</SelectItem>
                                <SelectItem value="check">Chèque</SelectItem>
                                <SelectItem value="transfer">Virement</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                              <span>Total à payer:</span>
                              <span>{formatPrice(calculateTotal())}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowCheckout(false)}>
                            Annuler
                          </Button>
                          <Button onClick={handleCheckout} disabled={loading}>
                            <DollarSign className="w-4 h-4 mr-2" />
                            {loading ? 'Traitement...' : 'Confirmer la Vente'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
