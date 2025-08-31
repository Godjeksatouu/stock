"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, RotateCcw, ArrowLeftRight, DollarSign, Package, CheckCircle, XCircle, Clock, Trash2, Download, FileText } from "lucide-react"
import { returnsApi, salesApi, productsApi, clientsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { STOCK_MAPPING } from "@/lib/types"
import { generateReturnInvoiceNumber, ReturnInvoiceData, downloadReturnInvoiceHTML, printReturnInvoice } from "@/lib/return-invoice-generator"
import { ReturnFileManager } from "@/lib/return-file-manager"

interface RetourManagementProps {
  stockId: string
}

export default function RetourManagement({ stockId }: RetourManagementProps) {
  const searchParams = useSearchParams()
  const [returns, setReturns] = useState<any[]>([])
  const [sales, setSales] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<any>(null)
  const [returnType, setReturnType] = useState<'refund' | 'exchange'>('refund')
  const [selectedSaleDetails, setSelectedSaleDetails] = useState<any>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    original_sale_id: '',
    client_id: 'direct',
    payment_method: 'cash' as 'cash' | 'card' | 'check' | 'credit',
    notes: '',
    return_items: [] as any[],
    exchange_items: [] as any[]
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  useEffect(() => {
    fetchData()
    
    // Check if we have pre-selected sale from URL params
    const saleId = searchParams.get('saleId')
    const productId = searchParams.get('productId')
    
    if (saleId) {
      setFormData(prev => ({ ...prev, original_sale_id: saleId }))
      setShowCreateDialog(true)
      
      // Pre-select the product for return (with delay to ensure data is loaded)
      setTimeout(() => {
        preSelectProduct(parseInt(saleId), productId ? parseInt(productId) : undefined)
      }, 1000)
    }
  }, [stockId, searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [returnsResponse, salesResponse, productsResponse, clientsResponse] = await Promise.all([
        returnsApi.getAll(stockId),
        salesApi.getAll(stockId),
        productsApi.getAll(stockId),
        clientsApi.getAll(stockId)
      ])

      if (returnsResponse.success) setReturns(returnsResponse.data)
      if (salesResponse.success) setSales(salesResponse.data)
      if (productsResponse.success) setProducts(productsResponse.data)
      if (clientsResponse.success) setClients(clientsResponse.data)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const preSelectProduct = async (saleId: number, productId?: number) => {
    try {
      // Fetch the specific sale with items
      const saleResponse = await salesApi.getById(saleId)

      if (saleResponse.success && saleResponse.data) {
        const sale = saleResponse.data

        // Store the complete sale details for display
        setSelectedSaleDetails(sale)

        setFormData(prev => ({
          ...prev,
          client_id: sale.client_id?.toString() || '',
        }))

        if (productId) {
          // Pre-select specific product
          const product = products.find(p => p.id === productId)
          const saleItem = sale.items?.find((item: any) => item.product_id === productId)

          if (saleItem && product) {
            setFormData(prev => ({
              ...prev,
              return_items: [{
                original_sale_item_id: saleItem.id,
                product_id: productId,
                product_name: product.name,
                quantity: 1,
                max_quantity: saleItem.quantity,
                unit_price: saleItem.unit_price,
                reason: '',
                condition_notes: ''
              }]
            }))
          }
        } else {
          // Show all products from the sale for selection
          if (sale.items && sale.items.length > 0) {
            const firstItem = sale.items[0]
            const product = products.find(p => p.id === firstItem.product_id)

            if (product) {
              setFormData(prev => ({
                ...prev,
                return_items: [{
                  original_sale_item_id: firstItem.id,
                  product_id: firstItem.product_id,
                  product_name: product.name,
                  quantity: 1,
                  max_quantity: firstItem.quantity,
                  unit_price: firstItem.unit_price,
                  reason: '',
                  condition_notes: ''
                }]
              }))
            }
          }
        }
      }
    } catch (error) {
      console.error('Error pre-selecting product:', error)
    }
  }

  // Load sale details when user selects a sale manually
  const loadSaleDetails = async (saleId: string) => {
    if (!saleId) {
      setSelectedSaleDetails(null)
      return
    }

    try {
      const saleResponse = await salesApi.getById(parseInt(saleId))
      if (saleResponse.success && saleResponse.data) {
        setSelectedSaleDetails(saleResponse.data)
      }
    } catch (error) {
      console.error('Error loading sale details:', error)
    }
  }

  const handleCreateReturn = async () => {
    try {
      if (!formData.original_sale_id || formData.return_items.length === 0) {
        alert('Veuillez sélectionner une vente et au moins un produit à retourner')
        return
      }

      if (returnType === 'exchange' && formData.exchange_items.length === 0) {
        alert('Veuillez sélectionner au moins un produit à échanger')
        return
      }

      const returnData = {
        stock_id: stockDbId,
        original_sale_id: parseInt(formData.original_sale_id),
        user_id: JSON.parse(localStorage.getItem("user") || '{}').id,
        client_id: formData.client_id && formData.client_id !== "direct" ? parseInt(formData.client_id) : null,
        return_type: returnType,
        payment_method: formData.payment_method,
        notes: formData.notes,
        return_items: formData.return_items,
        exchange_items: returnType === 'exchange' ? formData.exchange_items : undefined
      }

      const response = await returnsApi.create(returnData)
      if (response.success) {
        // Générer et télécharger automatiquement la facture de retour
        await generateAndDownloadReturnInvoice(response.data)

        setShowCreateDialog(false)
        resetForm()
        fetchData()

        if (returnType === 'exchange' && response.data.balance_adjustment !== 0) {
          const message = response.data.balance_adjustment > 0
            ? `Échange créé. Le client doit payer ${formatPrice(response.data.balance_adjustment)} supplémentaire.`
            : `Échange créé. Remboursement de ${formatPrice(Math.abs(response.data.balance_adjustment))} au client.`
          alert(message + ' La facture a été générée automatiquement.')
        } else {
          alert(`${returnType === 'refund' ? 'Remboursement' : 'Échange'} créé avec succès! La facture a été générée automatiquement.`)
        }
      }
    } catch (error) {
      console.error('Error creating return:', error)
      alert('Erreur lors de la création du retour')
    }
  }

  const generateAndDownloadReturnInvoice = async (returnTransaction: any) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || '{}')
      const invoiceNumber = generateReturnInvoiceNumber(returnTransaction.return_type, returnTransaction.id)

      // Préparer les données de la facture
      const invoiceData: ReturnInvoiceData = {
        id: returnTransaction.id,
        invoiceNumber,
        date: new Date().toISOString(),
        returnType: returnTransaction.return_type,
        originalSaleId: returnTransaction.original_sale_id,
        stockId: stockId, // Ajout du stockId pour les informations dynamiques
        client: selectedSaleDetails?.client_name ? {
          name: selectedSaleDetails.client_name,
          address: selectedSaleDetails.client_address,
          phone: selectedSaleDetails.client_phone
        } : undefined,
        seller: {
          name: user.username || 'Utilisateur'
        },
        returnedItems: formData.return_items.map(item => ({
          product_name: item.product_name,
          product_reference: products.find(p => p.id === item.product_id)?.reference,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price,
          reason: item.reason
        })),
        exchangeItems: returnTransaction.return_type === 'exchange' ? formData.exchange_items.map(item => ({
          product_name: item.product_name,
          product_reference: products.find(p => p.id === item.product_id)?.reference,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.quantity * item.unit_price
        })) : undefined,
        totalRefundAmount: returnTransaction.total_refund_amount,
        totalExchangeAmount: returnTransaction.total_exchange_amount,
        balanceAdjustment: returnTransaction.balance_adjustment,
        payment_method: returnTransaction.payment_method,
        payment_status: 'paid', // Les retours sont généralement traités comme payés
        amount_paid: selectedSaleDetails?.total || 0, // Montant original de la vente
        amount_refunded: returnTransaction.total_refund_amount,
        notes: returnTransaction.notes
      }

      // Sauvegarder et télécharger la facture
      await ReturnFileManager.saveReturnInvoice(invoiceData)

    } catch (error) {
      console.error('Error generating return invoice:', error)
      alert('Erreur lors de la génération de la facture')
    }
  }

  const resetForm = () => {
    setFormData({
      original_sale_id: '',
      client_id: 'direct',
      payment_method: 'cash',
      notes: '',
      return_items: [],
      exchange_items: []
    })
    setReturnType('refund')
    setSelectedSaleDetails(null)
  }

  const addReturnItem = () => {
    setFormData(prev => ({
      ...prev,
      return_items: [...prev.return_items, {
        original_sale_item_id: null,
        product_id: null,
        product_name: '',
        quantity: 1,
        max_quantity: 1,
        unit_price: 0,
        reason: '',
        condition_notes: ''
      }]
    }))
  }

  const removeReturnItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      return_items: prev.return_items.filter((_, i) => i !== index)
    }))
  }

  const updateReturnItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      return_items: prev.return_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const addExchangeItem = () => {
    setFormData(prev => ({
      ...prev,
      exchange_items: [...prev.exchange_items, {
        product_id: null,
        product_name: '',
        quantity: 1,
        unit_price: 0
      }]
    }))
  }

  const removeExchangeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      exchange_items: prev.exchange_items.filter((_, i) => i !== index)
    }))
  }

  const updateExchangeItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      exchange_items: prev.exchange_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const getReturnTotal = () => {
    return formData.return_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const getExchangeTotal = () => {
    return formData.exchange_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  }

  const getBalanceAdjustment = () => {
    return getExchangeTotal() - getReturnTotal()
  }

  const generateInvoiceForReturn = async (returnTransaction: any) => {
    try {
      // Récupérer les détails complets du retour
      const returnResponse = await returnsApi.getById(returnTransaction.id)
      if (!returnResponse.success || !returnResponse.data) {
        alert('Erreur lors de la récupération des détails du retour')
        return
      }

      const returnDetails = returnResponse.data
      const user = JSON.parse(localStorage.getItem("user") || '{}')
      const invoiceNumber = generateReturnInvoiceNumber(returnDetails.return_type, returnDetails.id)

      // Préparer les données de la facture
      const invoiceData: ReturnInvoiceData = {
        id: returnDetails.id,
        invoiceNumber,
        date: returnDetails.created_at,
        returnType: returnDetails.return_type,
        originalSaleId: returnDetails.original_sale_id,
        stockId: stockId, // Ajout du stockId pour les informations dynamiques
        client: returnDetails.client_name ? {
          name: returnDetails.client_name,
          address: returnDetails.client_address,
          phone: returnDetails.client_phone
        } : undefined,
        seller: {
          name: returnDetails.user_name || user.username || 'Utilisateur'
        },
        returnedItems: returnDetails.items?.filter((item: any) => item.action_type === 'return').map((item: any) => ({
          product_name: item.product_name,
          product_reference: item.product_reference,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total_amount,
          reason: item.reason
        })) || [],
        exchangeItems: returnDetails.return_type === 'exchange' ?
          returnDetails.items?.filter((item: any) => item.action_type === 'exchange_in').map((item: any) => ({
            product_name: item.product_name,
            product_reference: item.product_reference,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total_amount
          })) || [] : undefined,
        totalRefundAmount: returnDetails.total_refund_amount,
        totalExchangeAmount: returnDetails.total_exchange_amount,
        balanceAdjustment: returnDetails.balance_adjustment,
        payment_method: returnDetails.payment_method,
        payment_status: 'paid', // Les retours sont généralement traités comme payés
        amount_paid: returnDetails.original_sale_total || 0, // Montant original de la vente
        amount_refunded: returnDetails.total_refund_amount,
        notes: returnDetails.notes
      }

      // Télécharger la facture
      downloadReturnInvoiceHTML(invoiceData)

    } catch (error) {
      console.error('Error generating return invoice:', error)
      alert('Erreur lors de la génération de la facture')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des retours...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Retours</h1>
          <p className="text-muted-foreground">
            Gérez les retours et échanges de produits
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Retour
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Retours</p>
                <p className="text-2xl font-bold">{returns.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Montant Remboursé</p>
                <p className="text-2xl font-bold">
                  {formatPrice(returns.filter(r => r.return_type === 'refund').reduce((sum, r) => sum + r.total_refund_amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Échanges</p>
                <p className="text-2xl font-bold">
                  {returns.filter(r => r.return_type === 'exchange').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Complétés</p>
                <p className="text-2xl font-bold">
                  {returns.filter(r => r.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des Retours</CardTitle>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <div className="text-center py-8">
              <RotateCcw className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun retour trouvé</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Créer le premier retour
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Client</th>
                    <th className="text-left p-2">Vente Originale</th>
                    <th className="text-left p-2">Montant</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {returns.map((returnItem: any) => (
                    <tr key={returnItem.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">
                            {new Date(returnItem.created_at).toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(returnItem.created_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={returnItem.return_type === 'refund' ? 'destructive' : 'secondary'}>
                          {returnItem.return_type === 'refund' ? 'Remboursement' : 'Échange'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {returnItem.client_name ? (
                          <span className="font-medium">{returnItem.client_name}</span>
                        ) : (
                          <span className="text-muted-foreground">Vente directe</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="text-sm">#{returnItem.original_sale_id}</span>
                      </td>
                      <td className="p-2">
                        <div>
                          {returnItem.return_type === 'refund' ? (
                            <span className="font-medium text-red-600">
                              -{formatPrice(returnItem.total_refund_amount)}
                            </span>
                          ) : (
                            <div className="text-sm">
                              <div>Retour: {formatPrice(returnItem.total_refund_amount)}</div>
                              <div>Échange: {formatPrice(returnItem.total_exchange_amount)}</div>
                              {returnItem.balance_adjustment !== 0 && (
                                <div className={returnItem.balance_adjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                                  {returnItem.balance_adjustment > 0 ? '+' : ''}{formatPrice(returnItem.balance_adjustment)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge
                          variant={
                            returnItem.status === 'completed' ? 'default' :
                            returnItem.status === 'pending' ? 'secondary' : 'destructive'
                          }
                        >
                          {returnItem.status === 'completed' ? 'Complété' :
                           returnItem.status === 'pending' ? 'En attente' : 'Annulé'}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReturn(returnItem)}
                            title="Voir les détails"
                          >
                            Voir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateInvoiceForReturn(returnItem)}
                            title="Télécharger la facture"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {returnItem.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                await returnsApi.update(returnItem.id, { status: 'completed' })
                                fetchData()
                              }}
                              title="Marquer comme complété"
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau Retour</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Return Type Selection */}
            <div className="space-y-2">
              <Label>Type de Retour</Label>
              <Tabs value={returnType} onValueChange={(value: any) => setReturnType(value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="refund">Remboursement</TabsTrigger>
                  <TabsTrigger value="exchange">Échange</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Sale Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sale">Vente Originale *</Label>
                <Select
                  value={formData.original_sale_id}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, original_sale_id: value }))
                    loadSaleDetails(value)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une vente" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.map((sale: any) => (
                      <SelectItem key={sale.id} value={sale.id.toString()}>
                        #{sale.id} - {new Date(sale.created_at).toLocaleDateString('fr-FR')} - {formatPrice(sale.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, client_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Vente directe</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sale Details Display */}
            {selectedSaleDetails && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Détails de la Vente #{selectedSaleDetails.id}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sale Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-600">Date:</span>
                        <div>{new Date(selectedSaleDetails.created_at).toLocaleDateString('fr-FR')}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Client:</span>
                        <div>{selectedSaleDetails.client_name || 'Vente directe'}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">Total:</span>
                        <div className="font-bold text-green-600">{formatPrice(selectedSaleDetails.total)}</div>
                      </div>
                    </div>

                    {/* Products Purchased */}
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">Produits Achetés:</h4>
                      <div className="bg-white rounded-lg border">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 font-medium text-gray-600">Produit</th>
                              <th className="text-center p-3 font-medium text-gray-600">Quantité</th>
                              <th className="text-right p-3 font-medium text-gray-600">Prix Unitaire</th>
                              <th className="text-right p-3 font-medium text-gray-600">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedSaleDetails.items?.map((item: any, index: number) => (
                              <tr key={index} className="border-t">
                                <td className="p-3">
                                  <div className="font-medium">{item.product_name}</div>
                                  {item.product_reference && (
                                    <div className="text-sm text-gray-500">Réf: {item.product_reference}</div>
                                  )}
                                </td>
                                <td className="p-3 text-center">{item.quantity}</td>
                                <td className="p-3 text-right">{formatPrice(item.unit_price)}</td>
                                <td className="p-3 text-right font-medium">
                                  {formatPrice(item.quantity * item.unit_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="text-yellow-600 mt-0.5">💡</div>
                        <div className="text-sm text-yellow-800">
                          <strong>Instructions:</strong> Sélectionnez ci-dessous les produits que le client souhaite retourner.
                          Vous pouvez choisir une quantité partielle pour chaque produit.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Produits à Retourner *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addReturnItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter Produit
                </Button>
              </div>

              {formData.return_items.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-12 gap-4 items-end">
                    <div className="col-span-3">
                      <Label>Produit</Label>
                      <Select
                        value={item.product_id ? item.product_id.toString() : "none"}
                        onValueChange={(value) => {
                          if (value === "none") return
                          const product = products.find(p => p.id === parseInt(value))
                          updateReturnItem(index, 'product_id', parseInt(value))
                          updateReturnItem(index, 'product_name', product?.name || '')
                          updateReturnItem(index, 'unit_price', product?.price || 0)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sélectionner un produit</SelectItem>
                          {products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        min="1"
                        max={item.max_quantity}
                        value={item.quantity}
                        onChange={(e) => updateReturnItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div className="col-span-2">
                      <Label>Prix Unitaire</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateReturnItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="col-span-3">
                      <Label>Raison</Label>
                      <Input
                        value={item.reason}
                        onChange={(e) => updateReturnItem(index, 'reason', e.target.value)}
                        placeholder="Défaut, erreur..."
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeReturnItem(index)}
                        disabled={formData.return_items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <Label>Notes sur l'état</Label>
                    <Textarea
                      value={item.condition_notes}
                      onChange={(e) => updateReturnItem(index, 'condition_notes', e.target.value)}
                      placeholder="État du produit retourné..."
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>

            {/* Exchange Items (only for exchange type) */}
            {returnType === 'exchange' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Nouveaux Produits (Échange)</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addExchangeItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter Produit
                  </Button>
                </div>

                {formData.exchange_items.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-4">
                        <Label>Produit</Label>
                        <Select
                          value={item.product_id ? item.product_id.toString() : "none"}
                          onValueChange={(value) => {
                            if (value === "none") return
                            const product = products.find(p => p.id === parseInt(value))
                            updateExchangeItem(index, 'product_id', parseInt(value))
                            updateExchangeItem(index, 'product_name', product?.name || '')
                            updateExchangeItem(index, 'unit_price', product?.price || 0)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sélectionner un produit</SelectItem>
                            {products.map((product: any) => (
                              <SelectItem key={product.id} value={product.id.toString()}>
                                {product.name} - {formatPrice(product.price)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="col-span-2">
                        <Label>Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateExchangeItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </div>

                      <div className="col-span-3">
                        <Label>Prix Unitaire</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updateExchangeItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div className="col-span-2">
                        <Label>Total</Label>
                        <div className="p-2 bg-muted rounded">
                          {formatPrice(item.quantity * item.unit_price)}
                        </div>
                      </div>

                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeExchangeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Retour:</span>
                  <span className="font-medium text-red-600">-{formatPrice(getReturnTotal())}</span>
                </div>
                {returnType === 'exchange' && (
                  <>
                    <div className="flex justify-between">
                      <span>Total Échange:</span>
                      <span className="font-medium text-green-600">+{formatPrice(getExchangeTotal())}</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-bold">
                        <span>Ajustement:</span>
                        <span className={getBalanceAdjustment() >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {getBalanceAdjustment() >= 0 ? '+' : ''}{formatPrice(getBalanceAdjustment())}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getBalanceAdjustment() > 0
                          ? 'Le client doit payer la différence'
                          : getBalanceAdjustment() < 0
                          ? 'Remboursement au client'
                          : 'Échange équivalent'
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Payment Method and Notes */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Méthode de Paiement</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                    <SelectItem value="check">Chèque</SelectItem>
                    <SelectItem value="credit">Crédit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes additionnelles..."
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateReturn}>
                Créer {returnType === 'refund' ? 'Remboursement' : 'Échange'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
