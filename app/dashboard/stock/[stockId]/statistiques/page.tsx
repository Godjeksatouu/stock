"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  BarChart3, 
  ArrowLeft,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  RefreshCw,
  Download,
  Calendar
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts"
import RoleGuard from "@/components/role-guard"
import { statisticsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"

const stockNames = {
  "al-ouloum": "Librairie Al Ouloum",
  "renaissance": "Librairie La Renaissance", 
  "gros": "Gros (Dépôt général)",
}

export default function StatistiquesPage() {
  const params = useParams()
  const router = useRouter()
  const stockId = params.stockId as string
  const stockName = stockNames[stockId as keyof typeof stockNames] || stockId

  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState(30) // 30 jours par défaut

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await statisticsApi.get(stockId, period)
      
      if (response.success) {
        setStatistics(response.data)
      } else {
        setError('Erreur lors du chargement des statistiques')
      }
    } catch (err) {
      console.error('Error fetching statistics:', err)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [stockId, period])

  const goBack = () => {
    router.push(`/dashboard/stock/${stockId}`)
  }

  const exportData = () => {
    alert("Fonctionnalité d'export à implémenter")
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={['admin', 'super_admin']} requiredStockId={stockId}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-red-600" />
                Statistiques - {stockName}
              </h1>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </RoleGuard>
    )
  }

  if (error) {
    return (
      <RoleGuard allowedRoles={['admin', 'super_admin']} requiredStockId={stockId}>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-red-600" />
                Statistiques - {stockName}
              </h1>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchStatistics}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    )
  }

  // Préparer les données pour les graphiques
  const dailySalesData = statistics?.dailySales?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    sales: item.daily_revenue || 0,
    orders: item.sales_count || 0
  })) || []

  const topProductsData = statistics?.topProducts?.map((item: any, index: number) => ({
    name: item.name,
    value: item.total_sold || 0,
    revenue: item.revenue || 0,
    color: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]
  })) || []

  return (
    <RoleGuard
      allowedRoles={['admin', 'super_admin']}
      requiredStockId={stockId}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BarChart3 className="w-8 h-8 text-red-600" />
                Statistiques Détaillées - {stockName}
              </h1>
              <p className="text-muted-foreground">
                Analyses complètes et rapports de performance
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="px-3 py-2 border rounded-md"
            >
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
              <option value={365}>1 an</option>
            </select>
            
            <Button variant="outline" onClick={exportData}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            
            <Button onClick={fetchStatistics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Chiffre d'Affaires</p>
                  <p className="text-2xl font-bold">{formatPrice(statistics?.sales?.total_revenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">{period} derniers jours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Ventes</p>
                  <p className="text-2xl font-bold">{statistics?.sales?.total_sales || 0}</p>
                  <p className="text-xs text-muted-foreground">Nombre de transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Produits</p>
                  <p className="text-2xl font-bold">{statistics?.products?.total_products || 0}</p>
                  <p className="text-xs text-muted-foreground">En stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Bénéfice Aujourd'hui</p>
                  <p className="text-2xl font-bold">{formatPrice(statistics?.todayProfit?.profit || 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {statistics?.todayProfit?.profit >= 0 ? '+' : ''}{((statistics?.todayProfit?.profit || 0) / (statistics?.todayProfit?.sales_total || 1) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Ventes</TabsTrigger>
            <TabsTrigger value="products">Produits</TabsTrigger>
            <TabsTrigger value="trends">Tendances</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Ventes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatPrice(value), 'Ventes']} />
                      <Area type="monotone" dataKey="sales" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nombre de Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailySalesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Produits les Plus Vendus</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topProductsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topProductsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenus par Produit</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topProductsData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => [formatPrice(value), 'Revenus']} />
                      <Bar dataKey="revenue" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analyse des Tendances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {statistics?.weekSales?.week_sales_count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Ventes cette semaine</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">
                      {statistics?.monthSales?.month_sales_count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Ventes ce mois</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">
                      {statistics?.todaySales?.today_sales_count || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Ventes aujourd'hui</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}
