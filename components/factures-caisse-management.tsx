'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { formatPrice } from '@/lib/currency'
import ReturnExchangeForm from './return-exchange-form'
import { Search, Receipt, Calendar, DollarSign, Package, Barcode, Filter, X, ScanLine, ChevronDown, ChevronUp, ShoppingCart, Hash, Plus, User, Scan, FileText, Download, Eye, RotateCcw, ArrowRightLeft, Trash } from 'lucide-react'

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
  sale_barcode?: string
  source: string
  global_discount_amount?: number
}

interface FacturesCaisseManagementProps {
  stockId: string
}

const stockNames = {
  'al-ouloum': 'Librairie Al Ouloum',
  'renaissance': 'Librairie La Renaissance',
  'gros': 'Gros (Dépôt général)'
}

export default function FacturesCaisseManagement({ stockId }: FacturesCaisseManagementProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [barcodeSearch, setBarcodeSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSales, setTotalSales] = useState(0)
  const [expandedSale, setExpandedSale] = useState<number | null>(null)
  const [showReturnDialog, setShowReturnDialog] = useState(false)
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null)
  const [saleDetails, setSaleDetails] = useState<Record<number, any>>({})
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchCaisseSales = async (page = 1, search = '', barcodeFilter = '') => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        stockId: stockId || '',
        page: page.toString(),
        limit: '25',
        source: 'pos' // Only fetch POS/caisse sales
      })

      if (search && search.trim()) {
        params.append('search', search.trim())
      }

      if (barcodeFilter && barcodeFilter.trim()) {
        params.append('barcode', barcodeFilter.trim())
      }

      const response = await fetch(`/api/sales?${params}`)

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Trop de requêtes. Veuillez patienter un moment.')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const salesArray = Array.isArray(result.data?.sales) ? result.data.sales : []
        setSales(salesArray)
        setCurrentPage(result.data?.pagination?.page || result.pagination?.page || 1)
        setTotalPages(result.data?.pagination?.totalPages || result.pagination?.totalPages || 1)
        setTotalSales(result.data?.pagination?.total || result.pagination?.total || salesArray.length)
      } else {
        throw new Error(result.error || 'Failed to fetch sales')
      }
    } catch (err) {
      console.error('Error fetching caisse sales:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch sales')
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCaisseSales(1, searchTerm, barcodeSearch)
  }, [stockId])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchCaisseSales(1, searchTerm, barcodeSearch)
  }

  const handleBarcodeSearch = () => {
    setCurrentPage(1)
    fetchCaisseSales(1, searchTerm, barcodeSearch)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setBarcodeSearch('')
    setCurrentPage(1)
    fetchCaisseSales(1, '', '')
  }

  const downloadTicket = async (sale: Sale) => {
    try {
      const response = await fetch(`/api/invoices/download?sale_id=${sale.id}`)

      if (!response.ok) {
        throw new Error('Facture non trouvée')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      // The server returns HTML for POS tickets; use .html to avoid PDF viewer errors
      a.download = `ticket_${sale.invoice_number || sale.sale_number}.html`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Ticket téléchargé",
        description: `Ticket ${sale.invoice_number || sale.sale_number} téléchargé avec succès`,
        duration: 3000
      })
    } catch (error) {
      console.error('Error downloading ticket:', error)
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de télécharger le ticket"
      })
    }
  }

  const fetchSaleDetailsById = async (saleId: number) => {
    try {
      const res = await fetch(`/api/sales/${saleId}`)
      const json = await res.json()
      if (json.success) {
        setSaleDetails(prev => ({ ...prev, [saleId]: json.data }))
      }
    } catch (e) {
      console.error('Erreur chargement détails facture caisse:', e)
    }
  }

  const toggleSaleDetails = async (saleId: number) => {
    const willExpand = expandedSale !== saleId
    setExpandedSale(willExpand ? saleId : null)
    if (willExpand && !saleDetails[saleId]) {
      await fetchSaleDetailsById(saleId)
    }
  }

  const handleReturnClick = (sale: Sale) => {
    setSelectedSaleForReturn(sale)
    setShowReturnDialog(true)
  }

  const handleReturnSuccess = () => {
    // Refresh the sales list
    fetchCaisseSales(currentPage, searchTerm, barcodeSearch)
    setShowReturnDialog(false)
    setSelectedSaleForReturn(null)
  }

  if (loading && sales.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des factures caisse...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Factures Caisse
            </h1>
            <p className="text-gray-600 text-lg">
              Historique des ventes générées depuis la caisse POS
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="px-4 py-2 bg-white shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date().toLocaleDateString('fr-FR')}
            </Badge>
            <Badge variant="outline" className="px-4 py-2 bg-white shadow-sm">
              <Receipt className="h-4 w-4 mr-2" />
              {stockNames[stockId as keyof typeof stockNames] || stockId}
            </Badge>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Factures</p>
                  <p className="text-2xl font-bold text-gray-900">{totalSales}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPrice(sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ventes Aujourd'hui</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sales.filter(sale => {
                      const saleDate = new Date(sale.created_at).toDateString()
                      const today = new Date().toDateString()
                      return saleDate === today
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Panier Moyen</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sales.length > 0 ? formatPrice(sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0) / sales.length) : formatPrice(0)}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Recherche et Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* General Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Recherche générale</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Numéro de facture, client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Barcode Search */}
            <div className="space-y-2">
              <Label htmlFor="barcode-search">Recherche par code-barres</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode-search"
                  placeholder="Scanner ou saisir le code-barres"
                  value={barcodeSearch}
                  onChange={async (e) => {
                    const { cleanBarcode } = await import('@/lib/barcode')
                    const inputValue = e.target.value
                    const cleanedValue = cleanBarcode(inputValue)
                    setBarcodeSearch(cleanedValue || inputValue)
                  }}
                  onKeyDown={async (e) => {
                    const { isLikelyScanner, isScanTerminator } = await import('@/lib/barcode')
                    if (isScanTerminator(e.key)) handleBarcodeSearch()
                  }}
                />
                <Button onClick={handleBarcodeSearch} size="sm">
                  <Barcode className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Effacer les filtres
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <X className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales List */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              <span>Historique des Factures Caisse</span>
              <Badge variant="outline">{totalSales} factures</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
              <span>Chargement...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune facture caisse trouvée</p>
              {(searchTerm || barcodeSearch) && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Effacer les filtres
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div key={sale.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{sale.invoice_number || sale.sale_number}</span>
                        </div>
                        <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {sale.payment_status === 'paid' ? 'Payé' :
                           sale.payment_status === 'partial' ? 'Partiel' : 'En attente'}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          Caisse POS
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{sale.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium text-gray-900">{formatPrice(parseFloat(sale.total_amount.toString()))}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(sale.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{new Date(sale.created_at).toLocaleTimeString('fr-FR')}</span>
                        </div>
                      </div>

                      {sale.sale_barcode && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded mt-2 w-fit">
                          <Barcode className="w-3 h-3" />
                          <span className="font-mono">{sale.sale_barcode}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSaleDetails(sale.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Détails
                        {expandedSale === sale.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReturnClick(sale)}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retour
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadTicket(sale)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === sale.id}
                        onClick={async () => {
                          try {
                            setDeletingId(sale.id)
                            const resp = await fetch(`/api/sales/${sale.id}`, { method: 'DELETE' })
                            const js = await resp.json()
                            if (!resp.ok || !js.success) throw new Error(js.error || 'Suppression échouée')
                            toast({ title: 'Facture supprimée', description: `Vente #${sale.id} supprimée`, duration: 2500 })
                            fetchCaisseSales(currentPage, searchTerm, barcodeSearch)
                          } catch (e:any) {
                            console.error('Suppression facture caisse:', e)
                            toast({ variant: 'destructive', title: 'Erreur', description: e.message || 'Suppression impossible' })
                          } finally {
                            setDeletingId(null)
                          }
                        }}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash className="w-4 h-4" />
                        Supprimer
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedSale === sale.id && (
                    <div className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h4 className="font-medium mb-2">Informations de paiement</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>Méthode:</span>
                              <span className="font-medium">{sale.payment_method || 'cash'}</span>
                            </div>
                            {sale.amount_paid && (
                              <div className="flex justify-between">
                                <span>Montant payé:</span>
                                <span className="font-medium">{formatPrice(parseFloat(sale.amount_paid.toString()))}</span>
                              </div>
                            )}
                            {sale.change_amount && parseFloat(sale.change_amount.toString()) > 0 && (
                              <div className="flex justify-between">
                                <span>Monnaie rendue:</span>
                                <span className="font-medium">{formatPrice(parseFloat(sale.change_amount.toString()))}</span>
                              </div>
                            )}
                            {sale.global_discount_amount && parseFloat(sale.global_discount_amount.toString()) > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Remise globale:</span>
                                <span className="font-medium">-{formatPrice(parseFloat(sale.global_discount_amount.toString()))}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-xs text-gray-600">
                            <div><strong>ID Vente:</strong> <span className="font-mono">{sale.id}</span></div>
                            <div><strong>Source:</strong> <Badge variant="outline" className="text-xs">Caisse POS</Badge></div>
                            <div><strong>Notes:</strong> {sale.notes || 'Vente POS - Caisse'}</div>
                          </div>

                              {/* Produits de la facture */}
                              <div className="mt-4">
                                <h4 className="font-medium mb-2 flex items-center gap-2"><Package className="w-4 h-4" /> Produits</h4>
                                {saleDetails[sale.id]?.items && saleDetails[sale.id].items.length > 0 ? (
                                  <div className="divide-y rounded-md border bg-white">
                                    {saleDetails[sale.id].items.map((it:any) => (
                                      <div key={it.id} className="grid grid-cols-12 gap-2 p-3 text-sm">
                                        <div className="col-span-6 font-medium truncate">{it.product_name}</div>
                                        <div className="col-span-2 text-center">x{it.quantity}</div>
                                        <div className="col-span-2 text-right">{formatPrice(Number(it.unit_price))}</div>
                                        <div className="col-span-2 text-right font-semibold">{formatPrice(Number(it.total_price))}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500">Aucun produit chargé pour cette facture.</div>
                                )}
                              </div>

                        </div>

                        <div>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Numéro de facture:</span>
                                  <span className="font-mono text-xs">{sale.invoice_number || sale.sale_number}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span>{new Date(sale.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Statut:</span>
                                  <span className="font-medium">{sale.payment_status}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Total:</span>
                                  <span className="font-medium">{formatPrice(parseFloat(sale.total_amount.toString()))}</span>
                                </div>
                              </div>

                          <h4 className="font-medium mb-2">Informations système</h4>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>ID Vente:</span>
                              <span className="font-mono text-xs">{sale.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Source:</span>
                              <Badge variant="outline" className="text-xs">Caisse POS</Badge>
                            </div>
                            {sale.notes && (
                              <div className="flex justify-between">
                                <span>Notes:</span>
                                <span className="text-xs">{sale.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} sur {totalPages} ({totalSales} factures au total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = currentPage - 1
                    setCurrentPage(newPage)
                    fetchCaisseSales(newPage, searchTerm, barcodeSearch)
                  }}
                  disabled={currentPage <= 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = currentPage + 1
                    setCurrentPage(newPage)
                    fetchCaisseSales(newPage, searchTerm, barcodeSearch)
                  }}
                  disabled={currentPage >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return/Exchange Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Retour/Échange</DialogTitle>
          </DialogHeader>
          {selectedSaleForReturn && (
            <ReturnExchangeForm
              sale={selectedSaleForReturn}
              onClose={() => setShowReturnDialog(false)}
              onSuccess={handleReturnSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
