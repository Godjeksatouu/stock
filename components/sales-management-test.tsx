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
import { generateImprovedA4InvoicePDF } from '@/lib/a4-invoice-generator-improved'
import { Search, Receipt, Calendar, DollarSign, Package, Barcode, Filter, X, ScanLine, ChevronDown, ChevronUp, ShoppingCart, Hash, Plus, User, Scan, FileText, Download } from 'lucide-react'

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
}

interface SalesManagementProps {
  stockId: string
}

export default function SalesManagement({ stockId }: SalesManagementProps) {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSales, setTotalSales] = useState(0)

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

  const generateA4Invoice = async (sale: Sale) => {
    try {
      console.log('🧾 Génération de la facture A4 améliorée pour la vente:', sale.id)

      // Préparer les données pour la facture améliorée
      const invoiceData = {
        invoiceNumber: sale.invoice_number || sale.sale_number,
        date: sale.created_at,
        customerName: sale.customer_name || 'Client anonyme',
        customerPhone: '',
        customerAddress: '',
        items: [{
          name: 'Article de vente',
          quantity: 1,
          unitPrice: parseFloat(sale.total_amount?.toString() || '0'),
          discount: 0,
          total: parseFloat(sale.total_amount?.toString() || '0')
        }],
        subtotal: parseFloat(sale.total_amount?.toString() || '0'),
        discount: 0,
        tax: 0,
        total: parseFloat(sale.total_amount?.toString() || '0'),
        amountPaid: parseFloat(sale.amount_paid?.toString() || '0'),
        change: parseFloat(sale.change_amount?.toString() || '0'),
        paymentMethod: sale.payment_method,
        notes: sale.notes,
        stockId: stockId,
        barcodes: sale.barcodes
      }

      // Générer le PDF avec le nouveau design
      const pdf = generateImprovedA4InvoicePDF(invoiceData)
      
      // Télécharger le PDF
      const filename = `facture_A4_moderne_${sale.invoice_number || sale.sale_number}.pdf`
      pdf.save(filename)

      toast({
        title: "Facture A4 Moderne générée !",
        description: `${filename} a été téléchargée avec le nouveau design`,
        duration: 3000
      })

      console.log('✅ Facture A4 moderne générée:', filename)

    } catch (error) {
      console.error('❌ Erreur lors de la génération de la facture A4 moderne:', error)
      toast({
        title: "Erreur",
        description: "Impossible de générer la facture A4 moderne. Veuillez réessayer.",
        variant: "destructive",
        duration: 5000
      })
    }
  }

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sales?stockId=${stockId}&page=${currentPage}&limit=10`)
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
  }, [stockId, currentPage])

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
                  <p className="text-green-100 text-xs mt-1">FCFA</p>
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
                  <p className="text-purple-100 text-xs mt-1">FCFA</p>
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
                        {new Date(sale.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatPrice(parseFloat(sale.total_amount?.toString() || '0'))} FCFA</p>
                      <Badge variant={sale.payment_status === 'paid' ? 'default' : 'secondary'}>
                        {sale.payment_status === 'paid' ? 'Payé' : 'En attente'}
                      </Badge>
                    </div>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateA4Invoice(sale)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <FileText className="w-4 h-4" />
                        Facture A4 PDF
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
