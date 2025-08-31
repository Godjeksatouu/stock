"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, RotateCcw } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface Return {
  id: number
  product_name: string
  customer_name: string
  quantity: number
  reason: string
  return_date: string
  status: string
  refund_amount: number
  stock_id: number
  created_at: string
  product_id: number
  customer_id?: number
}

interface Product {
  id: number
  name: string
  price?: number
}

interface Customer {
  id: number
  name: string
}

interface ReturnsManagementProps {
  stockId: string
}

export default function ReturnsManagement({ stockId }: ReturnsManagementProps) {
  const [returns, setReturns] = useState<Return[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalReturns, setTotalReturns] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    product_id: 'none',
    customer_id: 'anonymous',
    quantity: '',
    reason: 'defective',
    refund_amount: ''
  })

  const stockNames = {
    'al-ouloum': 'Librairie Al Ouloum',
    'renaissance': 'Librairie La Renaissance',
    'gros': 'Gros (Dépôt général)'
  }

  const fetchReturns = async (page = 1, search = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        stockId,
        page: page.toString(),
        limit: '25'
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/returns?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        const returnsArray = Array.isArray(result.data.returns) ? result.data.returns : []
        setReturns(returnsArray)
        setTotalPages(result.data.pagination?.totalPages || 1)
        setTotalReturns(result.data.pagination?.total || 0)
        setCurrentPage(page)
      } else {
        setError(result.error || 'Failed to fetch returns')
        setReturns([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setReturns([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch(`/api/products?stockId=${stockId}&limit=1000`)
      const result = await response.json()
      if (result.success && result.data && Array.isArray(result.data.products)) {
        setProducts(result.data.products)
      } else {
        setProducts([])
      }
    } catch (err) {
      console.error('Error fetching products:', err)
      setProducts([])
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers-list')
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setCustomers(result.data)
      } else {
        setCustomers([])
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setCustomers([])
    }
  }

  useEffect(() => {
    if (stockId) {
      fetchReturns(1, searchTerm)
      fetchProducts()
      fetchCustomers()
    }
  }, [stockId])

  const handleSearch = () => {
    fetchReturns(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchReturns(page, searchTerm)
  }

  const resetForm = () => {
    setFormData({
      product_id: 'none',
      customer_id: 'anonymous',
      quantity: '',
      reason: 'defective',
      refund_amount: ''
    })
  }

  const handleAdd = async () => {
    try {
      setError(null)
      
      if (formData.product_id === 'none') {
        setError('Produit est requis')
        return
      }

      if (!formData.quantity || parseInt(formData.quantity) <= 0) {
        setError('Quantité doit être supérieure à 0')
        return
      }

      const requestData = {
        product_id: parseInt(formData.product_id),
        customer_id: formData.customer_id === 'anonymous' ? null : parseInt(formData.customer_id),
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        refund_amount: formData.refund_amount ? parseFloat(formData.refund_amount) : 0
      }

      const response = await fetch(`/api/returns?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setShowAddDialog(false)
        resetForm()
        fetchReturns(currentPage, searchTerm)
        setError(null)
      } else {
        setError(result.error || 'Failed to create return')
      }
    } catch (err) {
      setError('Failed to create return')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des retours...</p>
        </div>
      </div>
    )
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="product">Produit *</Label>
        <Select value={formData.product_id} onValueChange={(value) => setFormData({...formData, product_id: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un produit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sélectionner un produit</SelectItem>
            {Array.isArray(products) && products.map((product) => (
              <SelectItem key={product.id} value={product.id.toString()}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="customer">Client</Label>
        <Select value={formData.customer_id} onValueChange={(value) => setFormData({...formData, customer_id: value})}>
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
        <Label htmlFor="quantity">Quantité *</Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          value={formData.quantity}
          onChange={(e) => setFormData({...formData, quantity: e.target.value})}
          placeholder="1"
        />
      </div>
      <div>
        <Label htmlFor="reason">Raison du retour</Label>
        <Select value={formData.reason} onValueChange={(value) => setFormData({...formData, reason: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="defective">Défectueux</SelectItem>
            <SelectItem value="damaged">Endommagé</SelectItem>
            <SelectItem value="wrong_item">Mauvais article</SelectItem>
            <SelectItem value="customer_request">Demande client</SelectItem>
            <SelectItem value="expired">Expiré</SelectItem>
            <SelectItem value="other">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="refund_amount">Montant remboursé (DH)</Label>
        <Input
          id="refund_amount"
          type="number"
          step="0.01"
          min="0"
          value={formData.refund_amount}
          onChange={(e) => setFormData({...formData, refund_amount: e.target.value})}
          placeholder="0.00"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCcw className="w-5 h-5" />
              <span>Gestion des Retours</span>
              <Badge variant="outline">
                {stockNames[stockId as keyof typeof stockNames] || stockId}
              </Badge>
            </div>
            {/* Removed + Nouveau Retour button as requested */}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="flex space-x-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un retour..."
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

          {/* Returns Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réf. Facture</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit / Vente</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Quantité</TableHead>
                  <TableHead>Raison</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(returns) && returns.length > 0 ? (
                  returns.map((returnItem) => (
                    <TableRow key={returnItem.id}>
                      <TableCell className="font-mono text-xs">{returnItem.invoice_number || '-'}</TableCell>
                      <TableCell>
                        {returnItem.return_type ? (
                          <Badge variant="outline" className={returnItem.return_type === 'refund' ? 'text-red-600 border-red-600' : 'text-blue-600 border-blue-600'}>
                            {returnItem.return_type === 'refund' ? 'Remboursement' : 'Échange'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Ancien</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{returnItem.product_name}</TableCell>
                      <TableCell>{returnItem.customer_name}</TableCell>
                      <TableCell>{returnItem.quantity}</TableCell>
                      <TableCell>{returnItem.reason}</TableCell>
                      <TableCell className="font-medium">{formatPrice(returnItem.refund_amount)}</TableCell>
                      <TableCell>
                        <Badge variant={returnItem.status === 'completed' ? 'default' : 'secondary'}>
                          {returnItem.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {returnItem.created_at ? new Date(returnItem.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {loading ? 'Chargement...' : 'Aucun retour trouvé'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Affichage de {((currentPage - 1) * 25) + 1} à {Math.min(currentPage * 25, totalReturns)} sur {totalReturns} résultats
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
