'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SimplePurchaseForm from './simple-purchase-form'
import { toast } from '@/hooks/use-toast'
import { clientsApi, productsApi, salesApi } from '@/lib/api'
import { formatPrice } from '@/lib/currency'

import { Search, Receipt, Calendar, DollarSign, Package, Barcode, Filter, X, ScanLine, ChevronDown, ChevronUp, ShoppingCart, Hash, Plus, User, Scan, FileText, Download, RotateCcw, Pencil, Trash } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { ReturnFileManager } from '@/lib/return-file-manager'
import { ReturnInvoiceData } from '@/lib/return-invoice-generator'

interface Sale {
  id: number
  sale_number: string
  invoice_number?: string
  customer_id?: number
  customer_name: string
  total_amount: number | string
  amount_paid?: number | string
  change_amount?: number | string
  payment_method: string
  payment_status: string
  notes?: string
  created_at: string
  barcodes?: string
  sale_barcode?: string
  has_return?: boolean
  return_status?: 'partial' | 'complete'
  source?: 'pos' | 'manual'
}

interface SalesManagementProps {
  stockId: string
}

// Fonction utilitaire pour formater les dates en français
const formatDateFrench = (dateString: string) => {
  const date = new Date(dateString)
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ]

  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day} ${month} ${year} à ${hours}:${minutes}`
}

export default function SalesManagement({ stockId }: SalesManagementProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeSearch, setBarcodeSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSales, setTotalSales] = useState(0)

  // Return modal states
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null)
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund')
  const [returnAmount, setReturnAmount] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)

  // Edit & Delete state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null)

  // Statistiques calculées
  const totalRevenue = sales.reduce((sum, sale) => {
    const amount = typeof sale.total_amount === 'string'
      ? parseFloat(sale.total_amount) || 0
      : sale.total_amount || 0
    return sum + amount
  }, 0)

  const todayRevenue = sales
    .filter(sale => {
      const saleDate = new Date(sale.created_at).toDateString()
      const today = new Date().toDateString()
      return saleDate === today
    })
    .reduce((sum, sale) => {
      const amount = typeof sale.total_amount === 'string'
        ? parseFloat(sale.total_amount) || 0
        : sale.total_amount || 0
      return sum + amount
    }, 0)

  const totalItemsSold = sales.length * 2 // Estimation simple

  const downloadInvoice = async (sale: Sale) => {
    try {
      const isFromCaisse = sale.source === 'pos'
      console.log(`🧾 Téléchargement de la facture ${isFromCaisse ? 'Caisse (ticket)' : 'Vente'} pour la vente:`, sale.id)

      // Use the unified API endpoint for both POS and manual sales
      const response = await fetch(`/api/invoices/download?sale_id=${sale.id}`)

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url

        // Determine file extension based on content type
        const fileExtension = contentType?.includes('pdf') ? 'pdf' : 'html'
        a.download = `${isFromCaisse ? 'ticket' : 'facture'}_${sale.invoice_number || sale.sale_number}.${fileExtension}`

        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 1000)

        toast({
          title: isFromCaisse ? 'Ticket téléchargé' : 'Facture téléchargée',
          description: `Le ${isFromCaisse ? 'ticket' : 'facture'} a été téléchargé avec succès`,
          duration: 3000
        })
      } else {
        // Get more detailed error information
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        const errorMessage = errorData.error || 'Document non trouvé'

        console.warn('❌ Erreur téléchargement:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          saleId: sale.id,
          saleSource: sale.source
        })

        throw new Error(errorMessage)
      }

    } catch (error) {
      console.error('❌ Erreur téléchargement:', error)

      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      const isFromCaisse = sale.source === 'pos'
      let description = `Impossible de télécharger ${isFromCaisse ? 'le ticket' : 'la facture'}`

      // Provide more specific error messages
      if (errorMessage.includes('not found') || errorMessage.includes('non trouvé')) {
        description = isFromCaisse
          ? "Erreur lors de la génération du ticket de caisse"
          : "Aucune facture PDF stockée n'a été trouvée pour cette vente manuelle"
      } else if (errorMessage.includes('Failed to generate') || errorMessage.includes('Failed to fetch')) {
        description = "Erreur lors de la récupération des données de vente"
      } else if (errorMessage.includes('Original invoice not found')) {
        description = "Cette vente n'a pas de facture PDF stockée. Elle peut avoir été créée avant l'implémentation du système de stockage des factures."
      }

      toast({
        title: "Erreur de téléchargement",
        description,
        variant: "destructive",
        duration: 5000
      })
    }
  }



  const openEditSaleModal = (sale: Sale) => {
    setEditingSale(sale)
    setShowEditModal(true)
  }

  const confirmDeleteSale = (sale: Sale) => {
    setDeletingSale(sale)
    setShowDeleteConfirm(true)
  }

  const handleDeleteSale = async () => {
    if (!deletingSale) return
    try {
      const res = await fetch(`/api/sales/${deletingSale.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Vente supprimée', description: `Vente #${deletingSale.id} supprimée` })
        setShowDeleteConfirm(false)
        setDeletingSale(null)
        fetchSales()
      } else {
        toast({ title: 'Erreur', description: json.error || 'Suppression échouée', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Erreur', description: 'Suppression échouée', variant: 'destructive' })
    }
  }

  const handleSaveEdit = async () => {
    if (!editingSale) return
    try {
      const res = await fetch(`/api/sales/${editingSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: editingSale.customer_id || null,
          total_amount: parseFloat(editingSale.total_amount?.toString() || '0'),
          payment_method: editingSale.payment_method,
          payment_status: editingSale.payment_status,
          subtotal: parseFloat(editingSale.total_amount?.toString() || '0'),
          tax_amount: 0,
          discount_amount: 0,
          notes: editingSale.notes || ''
        })
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: 'Vente mise à jour', description: `Vente #${editingSale.id} modifiée` })
        setShowEditModal(false)
        setEditingSale(null)
        fetchSales()
      } else {
        toast({ title: 'Erreur', description: json.error || 'Mise à jour échouée', variant: 'destructive' })
      }
    } catch (e) {
      toast({ title: 'Erreur', description: 'Mise à jour échouée', variant: 'destructive' })
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)

      // Build query parameters
      const params = new URLSearchParams({
        stockId: stockId,
        page: currentPage.toString(),
        limit: '10'
      })
      // Hide POS (caisse) sales from this page: only show manual entries
      params.append('source', 'manual')

      if (searchTerm) params.append('search', searchTerm)
      if (barcodeSearch) params.append('barcode', barcodeSearch)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const response = await fetch(`/api/sales?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setSales(result.data.sales || [])
        setTotalSales(result.data.total || 0)
        setTotalPages(Math.ceil((result.data.total || 0) / 10))
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Erreur lors du chargement des ventes"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [stockId, currentPage, searchTerm, barcodeSearch, dateFrom, dateTo])

  const [returnSaleDetails, setReturnSaleDetails] = useState<any | null>(null)
  const [returnItems, setReturnItems] = useState<Array<{ product_id: number; product_name: string; product_reference?: string; unit_price: number; purchased_qty: number; quantity: number; reason?: string }>>([])
  const [exchangeItems, setExchangeItems] = useState<Array<{ product_id: number; product_name: string; unit_price: number; quantity: number }>>([])

  const openReturnModal = async (sale: Sale) => {
    setSelectedSaleForReturn(sale)
    setReturnType('refund')
    setReturnReason('')
    setReturnItems([])
    setExchangeItems([])
    setShowReturnModal(true)
    try {
      const res = await fetch(`/api/sales/${sale.id}`)
      const json = await res.json()
      if (json.success && json.data) {
        setReturnSaleDetails(json.data)
        const items = (json.data.items || []).map((it: any) => ({
          product_id: it.product_id,
          product_name: it.product_name,
          product_reference: it.product_reference,
          unit_price: Number(it.unit_price || 0),
          purchased_qty: Number(it.quantity || 0),
          quantity: 0,
          reason: ''
        }))
        setReturnItems(items)
      }
    } catch (e) {
      console.error('Failed to load sale details', e)
    }
  }

  const calcRefundTotal = () => returnItems.reduce((sum, it) => sum + (it.unit_price * (it.quantity || 0)), 0)
  const calcExchangeTotal = () => exchangeItems.reduce((sum, it) => sum + (it.unit_price * (it.quantity || 0)), 0)

  const handleReturnSubmit = async () => {
    if (!selectedSaleForReturn) return

    try {
      setReturnLoading(true)

      const payload: any = {
        original_sale_id: selectedSaleForReturn.id,
        stock_id: stockId,
        return_type: returnType,
        total_refund_amount: calcRefundTotal(),
        total_exchange_amount: returnType === 'exchange' ? calcExchangeTotal() : 0,
        notes: returnReason,
        payment_method: selectedSaleForReturn.payment_method || 'cash',
        return_items: returnItems.filter(it => it.quantity > 0).map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price, reason: it.reason })),
        exchange_items: returnType === 'exchange' ? exchangeItems.filter(it => it.quantity > 0).map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })) : undefined,
        user_id: null,
        client_id: selectedSaleForReturn.customer_id || null
      }

      const response = await fetch('/api/returns/create-from-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        // Generate and download return invoice
        try {
          await generateAndDownloadReturnInvoice(result.data, selectedSaleForReturn, returnSaleDetails)
        } catch (invoiceError) {
          console.error('Error generating return invoice:', invoiceError)
          toast({
            title: "Retour créé mais erreur de facture",
            description: "Le retour a été enregistré mais la facture n'a pas pu être générée",
            variant: "destructive"
          })
        }

        toast({
          title: "Retour créé avec succès",
          description: `${returnType === 'refund' ? 'Remboursement' : 'Échange'} enregistré. ${calcRefundTotal() ? `Remboursement: ${formatPrice(calcRefundTotal())} DH. ` : ''}${returnType==='exchange' ? `Échange: ${formatPrice(calcExchangeTotal())} DH.` : ''}`
        })
        setShowReturnModal(false)
        fetchSales()
      } else {
        toast({ title: "Erreur", description: result.error || "Erreur lors de la création du retour", variant: "destructive" })
      }
    } catch (error) {
      console.error('Error creating return:', error)
      toast({ title: "Erreur", description: "Erreur lors de la création du retour", variant: "destructive" })
    } finally {
      setReturnLoading(false)
    }
  }

  const generateAndDownloadReturnInvoice = async (returnData: any, sale: Sale, saleDetails: any) => {
    try {
      // Generate unique return invoice number
      const returnInvoiceNumber = `RET-${returnData.id}-${Date.now()}`

      // Prepare return invoice data
      const invoiceData: ReturnInvoiceData = {
        id: returnData.id,
        invoiceNumber: returnInvoiceNumber,
        date: new Date().toISOString(),
        returnType: returnData.return_type as 'refund' | 'exchange',
        originalSaleId: returnData.original_sale_id,
        stockId: stockId, // Ajout du stockId pour les informations dynamiques
        client: {
          name: sale.customer_name || 'Client anonyme',
          phone: sale.customer_phone || undefined,
          address: sale.customer_address || undefined
        },
        seller: {
          name: 'Vendeur' // You can get this from user context if available
        },
        returnedItems: returnItems.filter(item => item.quantity > 0).map(item => ({
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity,
          reason: item.reason
        })),
        exchangeItems: returnType === 'exchange' ? exchangeItems.filter(item => item.quantity > 0).map(item => ({
          product_name: item.product_name,
          product_reference: item.product_reference || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity
        })) : undefined,
        totalRefundAmount: returnData.total_refund_amount || 0,
        totalExchangeAmount: returnData.total_exchange_amount || 0,
        balanceAdjustment: returnData.balance_adjustment || 0,
        payment_method: returnData.payment_method || 'cash',
        payment_status: 'paid', // Les retours sont généralement traités comme payés
        amount_paid: sale.total_amount || 0, // Montant original de la vente
        amount_refunded: returnData.total_refund_amount || 0,
        notes: returnData.notes
      }

      // Generate and download the invoice
      await ReturnFileManager.saveReturnInvoice(invoiceData)

      console.log('✅ Return invoice generated and downloaded successfully')
    } catch (error) {
      console.error('❌ Error generating return invoice:', error)
      throw error
    }
  }

  // Inline component to pick exchange products (defined outside JSX return)
  function ExchangeProductPicker({ stockId, items, setItems }: { stockId: string, items: Array<{ product_id: number; product_name: string; unit_price: number; quantity: number }>, setItems: (v: any) => void }) {
    const [products, setProducts] = useState<any[]>([])
    const [selected, setSelected] = useState<string>('')
    const [qty, setQty] = useState<number>(1)

    useEffect(() => {
      (async () => {
        try {
          const res = await fetch(`/api/products?stockId=${stockId}`)
          const json = await res.json()
          const list = json?.data?.products || json?.data || []
          setProducts(Array.isArray(list) ? list : [])
        } catch (e) { console.error(e) }
      })()
    }, [stockId])

    const add = () => {
      const p = products.find((pr: any) => pr.id.toString() === selected)
      if (!p) return
      const exists = items.findIndex((it: any) => it.product_id === p.id)
      const next = [...items]
      if (exists >= 0) {
        next[exists] = { ...next[exists], quantity: next[exists].quantity + qty }
      } else {
        next.push({ product_id: p.id, product_name: p.name, unit_price: Number(p.price||0), quantity: qty })
      }
      setItems(next)
      setSelected('')
      setQty(1)
    }

    const updateQty = (index: number, newQty: number) => {
      const next = [...items]
      next[index] = { ...next[index], quantity: Math.max(1, newQty) }
      setItems(next)
    }

    const remove = (index: number) => {
      const next = items.slice()
      next.splice(index, 1)
      setItems(next)
    }

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div>
            <Label>Produit</Label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un produit" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantité</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value)||1))} />
          </div>
          <div>
            <Button type="button" className="w-full" disabled={!selected} onClick={add}>Ajouter</Button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2">Produit</th>
                  <th className="text-right p-2">PU</th>
                  <th className="text-right p-2">Quantité</th>
                  <th className="text-right p-2">Total</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, idx: number) => (
                  <tr key={it.product_id} className="border-t">
                    <td className="p-2">{it.product_name}</td>
                    <td className="p-2 text-right">{formatPrice(it.unit_price)}</td>
                    <td className="p-2 text-right">
                      <Input className="w-24 ml-auto" type="number" min={1} value={it.quantity} onChange={(e) => updateQty(idx, parseInt(e.target.value)||1)} />
                    </td>
                    <td className="p-2 text-right">{formatPrice(it.unit_price * it.quantity)}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => remove(idx)}>Supprimer</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }


  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* En-tête moderne avec statistiques */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gestion des Ventes
            </h1>
            <p className="text-gray-600 text-lg">
              Suivez et gérez toutes vos transactions commerciales en temps réel
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-4 py-2 bg-white shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date().toLocaleDateString('fr-FR')}
            </Badge>
            <SimplePurchaseForm stockId={stockId} />
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                Recherche générale
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Nom client, numéro facture..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="barcode-search" className="text-sm font-medium text-gray-700">
                Code-barres facture
              </Label>
              <div className="relative mt-1">
                <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="barcode-search"
                  placeholder="Code-barres..."
                  value={barcodeSearch}
                  onChange={async (e) => {
                    const { cleanBarcode } = await import('@/lib/barcode')
                    const v = e.target.value
                    const cleaned = cleanBarcode(v)
                    setBarcodeSearch(cleaned || v)
                  }}
                  onKeyDown={async (e) => {
                    const { isScanTerminator } = await import('@/lib/barcode')
                    if (isScanTerminator(e.key)) {
                      setCurrentPage(1)
                      fetchSales()
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="date-from" className="text-sm font-medium text-gray-700">
                Date de début
              </Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="date-to" className="text-sm font-medium text-gray-700">
                Date de fin
              </Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {(searchTerm || barcodeSearch || dateFrom || dateTo) && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Filter className="h-4 w-4" />
                <span>Filtres actifs</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setBarcodeSearch('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Effacer les filtres
              </Button>
            </div>
          )}
        </div>

        {/* Cartes de statistiques modernes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Ventes</p>
                  <p className="text-3xl font-bold mt-1">{totalSales}</p>
                  <p className="text-blue-100 text-xs mt-1">transactions</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Receipt className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">CA Total</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatPrice(totalRevenue)}
                  </p>
                  <p className="text-green-100 text-xs mt-1">DH</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Aujourd'hui</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatPrice(todayRevenue)}
                  </p>
                  <p className="text-purple-100 text-xs mt-1">DH</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Articles Vendus</p>
                  <p className="text-3xl font-bold mt-1">{totalItemsSold}</p>
                  <p className="text-orange-100 text-xs mt-1">unités</p>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Liste des ventes */}
      <Card className="bg-white shadow-lg border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Liste des Ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Aucune vente trouvée</div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{sale.invoice_number || sale.sale_number}</h3>
                      <p className="text-sm text-gray-600">{sale.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatDateFrench(sale.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatPrice(parseFloat(sale.total_amount?.toString() || '0'))} DH</p>
                      <div className="flex items-center gap-2 justify-end">
                        <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {sale.payment_status === 'paid' ? 'Payé' : 'En attente'}
                        </Badge>
                        {sale.source === 'pos' && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            POS
                          </Badge>
                        )}
                        {sale.has_return && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            {sale.return_status === 'complete' ? 'Retour complet' : 'Retour partiel'}
                          </Badge>
                        )}
                        {sale.sale_barcode && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            <Barcode className="w-3 h-3" />
                            <span className="font-mono">{sale.sale_barcode}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(sale)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title={sale.source === 'pos' ? "Télécharger Ticket Caisse" : "Télécharger Facture"}
                      >
                        <FileText className="w-4 h-4" />
                        {sale.source === 'pos' ? 'Ticket Caisse' : 'Facture'}
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEditSaleModal(sale)}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        title="Modifier la vente"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => confirmDeleteSale(sale)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Supprimer la vente et la facture associée"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReturnModal(sale)}
                        disabled={sale.has_return && sale.return_status === 'complete'}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={sale.has_return && sale.return_status === 'complete' ? 'Retour complet déjà effectué' : 'Retour / Remboursement ou Échange produit'}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retour
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Sale Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la vente</DialogTitle>
          </DialogHeader>
          {editingSale && (
            <div className="space-y-4">
              <div>
                <Label>Client</Label>
                <Input
                  value={editingSale.customer_name}
                  onChange={(e) => setEditingSale({ ...editingSale, customer_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Total</Label>
                <Input
                  type="number"
                  value={editingSale.total_amount?.toString() || ''}
                  onChange={(e) => setEditingSale({ ...editingSale, total_amount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mode de paiement</Label>
                  <Input
                    value={editingSale.payment_method}
                    onChange={(e) => setEditingSale({ ...editingSale, payment_method: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={editingSale.payment_status} onValueChange={(val) => setEditingSale({ ...editingSale, payment_status: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Payé</SelectItem>
                      <SelectItem value="partial">Partiel</SelectItem>
                      <SelectItem value="pending">En attente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingSale.notes || ''}
                  onChange={(e) => setEditingSale({ ...editingSale, notes: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)}>Annuler</Button>
                <Button onClick={handleSaveEdit}>Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la vente</DialogTitle>
          </DialogHeader>
          <p>Cette action supprimera la vente et la facture associée. Continuer ?</p>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteSale}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal de retour */}
      <Dialog open={showReturnModal} onOpenChange={setShowReturnModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Retour / Remboursement</DialogTitle>
          </DialogHeader>

          {selectedSaleForReturn && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-sm text-gray-700">Vente sélectionnée</h4>
                <p className="text-sm">{selectedSaleForReturn.invoice_number || selectedSaleForReturn.sale_number}</p>
                <p className="text-sm text-gray-600">{selectedSaleForReturn.customer_name}</p>
                <p className="font-medium">{formatPrice(parseFloat(selectedSaleForReturn.total_amount?.toString() || '0'))} DH</p>
              </div>

              <div>
                <Label htmlFor="return-type">Type de retour *</Label>
                <Select value={returnType} onValueChange={(value: 'refund' | 'exchange') => setReturnType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refund">Remboursement</SelectItem>
                    <SelectItem value="exchange">Échange produit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Order items */}
              <div>
                <h4 className="font-medium mb-2">Détails de la commande</h4>
                <div className="overflow-x-auto border rounded">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">Produit</th>
                        <th className="text-left p-2">Référence</th>
                        <th className="text-right p-2">Qté achetée</th>
                        <th className="text-right p-2">PU</th>
                        <th className="text-right p-2">Qté à retourner</th>
                        <th className="text-right p-2">Motif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((it, idx) => (
                        <tr key={it.product_id} className="border-t">
                          <td className="p-2">{it.product_name}</td>
                          <td className="p-2">{it.product_reference || '-'}</td>
                          <td className="p-2 text-right">{it.purchased_qty}</td>
                          <td className="p-2 text-right">{formatPrice(it.unit_price)}</td>
                          <td className="p-2 text-right">
                            <Input
                              type="number"
                              min={0}
                              max={it.purchased_qty}
                              value={it.quantity}
                              onChange={(e) => {
                                const val = Math.min(it.purchased_qty, Math.max(0, parseInt(e.target.value) || 0))
                                const copy = [...returnItems]
                                copy[idx] = { ...it, quantity: val }
                                setReturnItems(copy)
                              }}
                              className="w-24 ml-auto"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <Input
                              placeholder="Motif (optionnel)"
                              value={it.reason || ''}
                              onChange={(e) => {
                                const copy = [...returnItems]
                                copy[idx] = { ...it, reason: e.target.value }
                                setReturnItems(copy)
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {returnType === 'exchange' && (
                <div>
                  <h4 className="font-medium mb-2">Produits à ajouter (Échange)</h4>
                  <ExchangeProductPicker stockId={stockId} items={exchangeItems} setItems={setExchangeItems} />
                </div>
              )}

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Valeur des retours</div>
                  <div className="text-lg font-semibold">{formatPrice(calcRefundTotal())} DH</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Valeur des échanges</div>
                  <div className="text-lg font-semibold">{formatPrice(returnType==='exchange'?calcExchangeTotal():0)} DH</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Solde</div>
                  <div className="text-lg font-semibold">{formatPrice(calcExchangeTotal()-calcRefundTotal())} DH</div>
                </div>
              </div>

              <div>
                <Label htmlFor="return-reason">Notes / Motif global</Label>
                <Textarea
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="Expliquez la raison du retour..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowReturnModal(false)} disabled={returnLoading}>Annuler</Button>
                <Button onClick={handleReturnSubmit} disabled={returnLoading || (calcRefundTotal()<=0 && !(returnType==='exchange' && calcExchangeTotal()>0))} className="bg-orange-600 hover:bg-orange-700">
                  {returnLoading ? 'Traitement...' : 'Confirmer'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>

      </Dialog>


    </div>
  )
}
