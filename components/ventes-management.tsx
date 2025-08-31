"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, Receipt, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface Sale {
  id: number
  sale_number: string
  customer_name: string
  total_amount: number
  payment_method: string
  payment_status: string
  subtotal?: number
  tax_amount?: number
  discount_amount?: number
  notes?: string
  stock_id: number
  created_at: string
  customer_id?: number
}

interface Customer {
  id: number
  name: string
  email?: string
  phone?: string
}

interface VentesManagementProps {
  stockId: string
}

export default function VentesManagement({ stockId }: VentesManagementProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSales, setTotalSales] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    customer_id: 'anonymous',
    total_amount: '',
    payment_method: 'cash',
    payment_status: 'paid',
    subtotal: '',
    tax_amount: '',
    discount_amount: '',
    notes: ''
  })

  const stockNames = {
    'al-ouloum': 'Librairie Al Ouloum',
    'renaissance': 'Librairie La Renaissance',
    'gros': 'Gros (Dépôt général)'
  }

  const fetchSales = async (page = 1, search = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        stockId: stockId || '',
        page: page.toString(),
        limit: '25'
      })
      
      if (search && search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/sales?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        // Safe array handling
        const salesArray = Array.isArray(result.data.sales) ? result.data.sales : []
        setSales(salesArray)
        setTotalPages(result.data.pagination?.totalPages || 1)
        setTotalSales(result.data.pagination?.total || 0)
        setCurrentPage(page)
      } else {
        throw new Error(result.error || 'Failed to fetch sales')
      }
    } catch (err) {
      console.error('Error fetching sales:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers-list')
      const result = await response.json()
      if (result.success && result.data) {
        // Safe array handling
        const customersArray = Array.isArray(result.data) ? result.data : []
        setCustomers(customersArray)
      }
    } catch (err) {
      console.error('Error fetching customers:', err)
      setCustomers([])
    }
  }

  useEffect(() => {
    if (stockId) {
      fetchSales(1, searchTerm)
      fetchCustomers()
    }
  }, [stockId])

  const handleSearch = () => {
    fetchSales(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchSales(page, searchTerm)
  }

  const resetForm = () => {
    setFormData({
      customer_id: 'anonymous',
      total_amount: '',
      payment_method: 'cash',
      payment_status: 'paid',
      subtotal: '',
      tax_amount: '',
      discount_amount: '',
      notes: ''
    })
  }

  const handleAdd = async () => {
    try {
      setError(null)
      
      if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
        setError('Montant total doit être supérieur à 0')
        return
      }

      const requestData = {
        customer_id: formData.customer_id === 'anonymous' ? null : parseInt(formData.customer_id),
        total_amount: parseFloat(formData.total_amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : parseFloat(formData.total_amount),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : 0,
        notes: formData.notes
      }

      const response = await fetch(`/api/sales?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        try { window.dispatchEvent(new CustomEvent('sales-updated', { detail: { stockId } })); } catch {}
        // Générer et stocker automatiquement la facture A4
        try {
          const a4Mod = await import('@/lib/a4-invoice-generator-improved')
          const saleDetailRes = await fetch(`/api/sales/${result.data.id}?stockId=${stockId}`)
          const saleDetailJson = await saleDetailRes.json()
          if (saleDetailJson.success) {
            const saleData = saleDetailJson.data
            const stockName = (saleDetailJson.data?.stock_name) || (stockId === 'renaissance' ? 'Librairie La Renaissance' : stockId === 'al-ouloum' ? 'Librairie Al Ouloum' : 'Gros (Dépôt)')
            const invoiceData = {
              invoiceNumber: saleData.invoice_number || saleData.sale_number,
              date: new Date(saleData.created_at).toLocaleDateString('fr-FR'),
              customerName: saleData.customer_name || 'Client anonyme',
              items: (saleData.items || []).map((it: any) => ({
                product_name: it.product_name,
                quantity: Number(it.quantity),
                unit_price: Number(it.unit_price),
                total_price: Number(it.total_price)
              })),
              subtotal: Number(saleData.subtotal || saleData.total_amount),
              discount: Number(saleData.global_discount_amount || 0),
              tax: Number(saleData.tax_amount || 0),
              total: Number(saleData.total_amount),
              amountPaid: Number(saleData.amount_paid || 0),
              change: Number(saleData.change_amount || 0),
              paymentMethod: saleData.payment_method || 'cash',
              notes: saleData.notes || undefined,
              stockId: stockId,
              stockName,
              factureBarcode: saleData.sale_barcode || saleData.barcode || saleData.barcodes || '',
              barcodes: saleData.barcodes
            }
            const pdf = a4Mod.generateImprovedA4InvoicePDF(invoiceData)
            const blob = pdf.output('blob')
            // Download immediately
            const filename = `facture_A4_${invoiceData.invoiceNumber}.pdf`
            pdf.save(filename)
            // Store on server for later downloads
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
        setShowAddDialog(false)
        resetForm()
        fetchSales(currentPage, searchTerm)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to create sale')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale')
    }
  }

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale)
    setFormData({
      customer_id: sale.customer_id?.toString() || 'anonymous',
      total_amount: sale.total_amount.toString(),
      payment_method: sale.payment_method || 'cash',
      payment_status: sale.payment_status || 'paid',
      subtotal: sale.subtotal?.toString() || sale.total_amount.toString(),
      tax_amount: sale.tax_amount?.toString() || '0',
      discount_amount: sale.discount_amount?.toString() || '0',
      notes: sale.notes || ''
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    try {
      setError(null)
      
      if (!editingSale || !formData.total_amount || parseFloat(formData.total_amount) <= 0) {
        setError('Montant total doit être supérieur à 0')
        return
      }

      const requestData = {
        customer_id: formData.customer_id === 'anonymous' ? null : parseInt(formData.customer_id),
        total_amount: parseFloat(formData.total_amount),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        subtotal: formData.subtotal ? parseFloat(formData.subtotal) : parseFloat(formData.total_amount),
        tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : 0,
        notes: formData.notes
      }

      const response = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setShowEditDialog(false)
        setEditingSale(null)
        resetForm()
        fetchSales(currentPage, searchTerm)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to update sale')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sale')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ?')) {
      return
    }

    try {
      const response = await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        fetchSales(currentPage, searchTerm)
        setError(null)
      } else {
        throw new Error(result.error || 'Failed to delete sale')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete sale')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des ventes...</p>
        </div>
      </div>
    )
  }

  const FormFields = () => (
    <div className="space-y-4">
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
        <Label htmlFor="total_amount">Montant total (DH) *</Label>
        <Input
          id="total_amount"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.total_amount}
          onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label htmlFor="payment_method">Méthode de paiement</Label>
        <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Espèces</SelectItem>
            <SelectItem value="card">Carte</SelectItem>
            <SelectItem value="check">Chèque</SelectItem>
            <SelectItem value="transfer">Virement</SelectItem>
            <SelectItem value="credit">Crédit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="payment_status">Statut de paiement</Label>
        <Select value={formData.payment_status} onValueChange={(value) => setFormData({...formData, payment_status: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="paid">Payé</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="partial">Partiel</SelectItem>
            <SelectItem value="cancelled">Annulé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Notes sur la vente"
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
              <Receipt className="w-5 h-5" />
              <span>Gestion des Ventes</span>
              <Badge variant="outline">
                {stockNames[stockId as keyof typeof stockNames] || stockId}
              </Badge>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setShowAddDialog(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle vente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter une nouvelle vente</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations de la vente. Le montant total est obligatoire.
                  </DialogDescription>
                </DialogHeader>
                <FormFields />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAdd}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {error}
            </div>
          )}

          {/* Search */}
          <div className="flex space-x-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher une vente..."
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

          {/* Sales Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Vente</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(sales) && sales.length > 0 ? (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.sale_number || `SALE-${sale.id}`}</TableCell>
                      <TableCell>{sale.customer_name}</TableCell>
                      <TableCell className="font-medium">{formatPrice(sale.total_amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {sale.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.created_at ? new Date(sale.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(sale)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(sale.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {loading ? 'Chargement...' : 'Aucune vente trouvée'}
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
                Affichage de {((currentPage - 1) * 25) + 1} à {Math.min(currentPage * 25, totalSales)} sur {totalSales} résultats
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la vente</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la vente. Le montant total est obligatoire.
            </DialogDescription>
          </DialogHeader>
          <FormFields />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>
              Mettre à jour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
