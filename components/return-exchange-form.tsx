'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/currency'
import { RotateCcw, ArrowRightLeft, Package, DollarSign, User, Calendar, Minus, Plus, X } from 'lucide-react'

interface SaleItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
  discount_amount?: number
}

interface Sale {
  id: number
  sale_number: string
  invoice_number?: string
  customer_name: string
  total_amount: number
  payment_method: string
  created_at: string
  items?: SaleItem[]
}

interface ReturnItem {
  sale_item_id: number
  product_id: number
  product_name: string
  original_quantity: number
  return_quantity: number
  unit_price: number
  return_amount: number
  reason: string
  condition: string
}

interface ReturnExchangeFormProps {
  sale: Sale
  onClose: () => void
  onSuccess: () => void
}

export default function ReturnExchangeForm({ sale, onClose, onSuccess }: ReturnExchangeFormProps) {
  const [loading, setLoading] = useState(false)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  const [returnType, setReturnType] = useState<'return' | 'exchange'>('return')
  const [returnReason, setReturnReason] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')

  useEffect(() => {
    fetchSaleDetails()
  }, [sale.id])

  const fetchSaleDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales/${sale.id}`)
      const result = await response.json()

      if (result.success && result.data.items) {
        setSaleItems(result.data.items)
        // Initialize return items
        const initialReturnItems = result.data.items.map((item: SaleItem) => ({
          sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          original_quantity: item.quantity,
          return_quantity: 0,
          unit_price: item.unit_price,
          return_amount: 0,
          reason: '',
          condition: 'good'
        }))
        setReturnItems(initialReturnItems)
      }
    } catch (error) {
      console.error('Error fetching sale details:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de charger les détails de la vente"
      })
    } finally {
      setLoading(false)
    }
  }

  const updateReturnQuantity = (itemId: number, quantity: number) => {
    setReturnItems(items => items.map(item => {
      if (item.sale_item_id === itemId) {
        const returnQuantity = Math.max(0, Math.min(quantity, item.original_quantity))
        const returnAmount = returnQuantity * item.unit_price
        return { ...item, return_quantity: returnQuantity, return_amount: returnAmount }
      }
      return item
    }))
  }

  const updateReturnReason = (itemId: number, reason: string) => {
    setReturnItems(items => items.map(item => 
      item.sale_item_id === itemId ? { ...item, reason } : item
    ))
  }

  const updateReturnCondition = (itemId: number, condition: string) => {
    setReturnItems(items => items.map(item => 
      item.sale_item_id === itemId ? { ...item, condition } : item
    ))
  }

  const getTotalReturnAmount = () => {
    return returnItems.reduce((sum, item) => sum + item.return_amount, 0)
  }

  const getReturnItemsCount = () => {
    return returnItems.filter(item => item.return_quantity > 0).length
  }

  const handleSubmit = async () => {
    const itemsToReturn = returnItems.filter(item => item.return_quantity > 0)
    
    if (itemsToReturn.length === 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article à retourner"
      })
      return
    }

    // Validate that all return items have reasons
    const itemsWithoutReason = itemsToReturn.filter(item => !item.reason.trim())
    if (itemsWithoutReason.length > 0) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez indiquer une raison pour tous les articles à retourner"
      })
      return
    }

    if (!returnReason.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Veuillez indiquer la raison générale du retour"
      })
      return
    }

    try {
      setLoading(true)

      const returnData = {
        original_sale_id: sale.id,
        return_type: returnType,
        total_refund_amount: getTotalReturnAmount(),
        reason: returnReason,
        customer_notes: customerNotes,
        items: itemsToReturn.map(item => ({
          original_sale_item_id: item.sale_item_id,
          product_id: item.product_id,
          quantity: item.return_quantity,
          unit_price: item.unit_price,
          total_amount: item.return_amount,
          reason: item.reason,
          condition_notes: item.condition
        }))
      }

      const response = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(returnData)
      })

      const result = await response.json()

      if (result.success) {
        // 1) Notify
        toast({
          title: "Retour enregistré",
          description: `${returnType === 'return' ? 'Retour' : 'Échange'} #${result.data.id} créé avec succès`,
          duration: 2000
        })

        // 2) Fetch original sale details to include return section
        const saleRes = await fetch(`/api/sales/${sale.id}`)
        const saleJson = await saleRes.json()
        if (saleJson.success) {
          const s = saleJson.data
          // Map returned items to ticket format
          const returnedItems = itemsToReturn
            .filter(it => it.return_quantity > 0)
            .map(it => ({
              product_name: it.product_name,
              quantity: it.return_quantity,
              unit_price: it.unit_price,
              total: it.return_quantity * it.unit_price,
              type: returnType === 'exchange' ? 'exchange' : 'return'
            }))

          // Compute refund amount for display (matches API aggregate)
          const refundAmount = Number(result.data.total_refund_amount || 0)

          // Build POS ticket with retour section using SAME template
          const { generateSimpleTicketHTML } = await import('@/lib/simple-ticket-generator')
          const html = generateSimpleTicketHTML({
            id: s.id,
            invoiceNumber: s.invoice_number || s.sale_number,
            date: new Date(s.created_at).toLocaleDateString('fr-FR'),
            stockId: sale.stock_id ? String(sale.stock_id) : 'al-ouloum',
            customerName: s.customer_name || 'Client anonyme',
            items: (s.items || []).map((it:any)=>({
              product_name: it.product_name,
              quantity: Number(it.quantity),
              unit_price: Number(it.unit_price),
              total: Number(it.total_price)
            })),
            subtotal: Number(s.subtotal || s.total_amount || s.total || 0),
            total: Number(s.total_amount || s.total || 0),
            payment_method: s.payment_method || 'cash',
            amount_paid: Number(s.amount_paid || 0),
            change: Number(s.change_amount || 0),
            barcode: s.sale_barcode,
            notes: s.notes || undefined,
            returnInfo: {
              status: returnedItems.reduce((sum, it)=> sum + it.quantity, 0) >= (s.total_quantity || 0) ? 'Retour total' : 'Retour partiel',
              refund_amount: refundAmount,
              refund_method: s.payment_method || 'cash',
              items: returnedItems
            }
          })

          // 3) Trigger auto-download (HTML; identical layout as POS ticket)
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `ticket_${s.invoice_number || s.sale_number}_retour.html`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        }

        // 4) Refresh list and close
        onSuccess()
        onClose()
      } else {
        throw new Error(result.error || 'Erreur lors de la création du retour')
      }
    } catch (error) {
      console.error('Error creating return:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le retour"
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && saleItems.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des détails de la vente...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Sale Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Retour/Échange - Facture {sale.invoice_number || sale.sale_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>Client: {sale.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span>Total: {formatPrice(sale.total_amount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>Date: {new Date(sale.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              <span>Paiement: {sale.payment_method}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Type d'opération</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button
                variant={returnType === 'return' ? 'default' : 'outline'}
                onClick={() => setReturnType('return')}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retour (Remboursement)
              </Button>
              <Button
                variant={returnType === 'exchange' ? 'default' : 'outline'}
                onClick={() => setReturnType('exchange')}
                className="flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Échange
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="return-reason">Raison du {returnType === 'return' ? 'retour' : 'échange'}</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une raison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="defective">Produit défectueux</SelectItem>
                  <SelectItem value="wrong_item">Mauvais article</SelectItem>
                  <SelectItem value="not_satisfied">Client non satisfait</SelectItem>
                  <SelectItem value="damaged">Produit endommagé</SelectItem>
                  <SelectItem value="size_issue">Problème de taille</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-notes">Notes client (optionnel)</Label>
              <Textarea
                id="customer-notes"
                placeholder="Commentaires additionnels..."
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Articles à {returnType === 'return' ? 'retourner' : 'échanger'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {saleItems.map((saleItem) => {
              const returnItem = returnItems.find(item => item.sale_item_id === saleItem.id)
              if (!returnItem) return null

              return (
                <div key={saleItem.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{saleItem.product_name}</h4>
                      <div className="text-sm text-gray-600">
                        Prix unitaire: {formatPrice(saleItem.unit_price)} | 
                        Quantité originale: {saleItem.quantity} | 
                        Total: {formatPrice(saleItem.total_price)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Quantity Selection */}
                    <div className="space-y-2">
                      <Label>Quantité à {returnType === 'return' ? 'retourner' : 'échanger'}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReturnQuantity(saleItem.id, returnItem.return_quantity - 1)}
                          disabled={returnItem.return_quantity <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="0"
                          max={saleItem.quantity}
                          value={returnItem.return_quantity}
                          onChange={(e) => updateReturnQuantity(saleItem.id, parseInt(e.target.value) || 0)}
                          className="w-24 text-center font-semibold text-gray-900 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          style={{appearance: 'textfield'}}
                        />
                        <div className="px-3 py-1 text-lg font-bold text-gray-900 select-none">
                          {returnItem.return_quantity}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReturnQuantity(saleItem.id, returnItem.return_quantity + 1)}
                          disabled={returnItem.return_quantity >= saleItem.quantity}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      {returnItem.return_quantity > 0 && (
                        <div className="text-sm text-green-600 font-medium">
                          Montant: {formatPrice(returnItem.return_amount)}
                        </div>
                      )}
                    </div>

                    {/* Reason Selection */}
                    {returnItem.return_quantity > 0 && (
                      <>
                        <div className="space-y-2">
                          <Label>Raison spécifique</Label>
                          <Select value={returnItem.reason} onValueChange={(value) => updateReturnReason(saleItem.id, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Raison" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="defective">Défectueux</SelectItem>
                              <SelectItem value="damaged">Endommagé</SelectItem>
                              <SelectItem value="wrong_item">Mauvais article</SelectItem>
                              <SelectItem value="not_needed">Plus nécessaire</SelectItem>
                              <SelectItem value="other">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>État du produit</Label>
                          <Select value={returnItem.condition} onValueChange={(value) => updateReturnCondition(saleItem.id, value)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="good">Bon état</SelectItem>
                              <SelectItem value="damaged">Endommagé</SelectItem>
                              <SelectItem value="defective">Défectueux</SelectItem>
                              <SelectItem value="opened">Ouvert/Utilisé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          {getReturnItemsCount() > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900">Résumé du {returnType === 'return' ? 'retour' : 'échange'}</h4>
                  <p className="text-sm text-blue-700">
                    {getReturnItemsCount()} article(s) sélectionné(s)
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-900">
                    {formatPrice(getTotalReturnAmount())}
                  </div>
                  <div className="text-sm text-blue-700">
                    {returnType === 'return' ? 'Montant à rembourser' : 'Valeur d\'échange'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || getReturnItemsCount() === 0}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Traitement...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4 mr-2" />
              Confirmer le {returnType === 'return' ? 'retour' : 'échange'}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
