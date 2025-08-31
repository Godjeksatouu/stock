"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "recharts"
import { TrendingUp, DollarSign, ShoppingCart, Package, RefreshCw } from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { statisticsApi } from "@/lib/api"

interface StockStatisticsProps {
  stockId: string
}

export default function StockStatistics({ stockId }: StockStatisticsProps) {
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await statisticsApi.get(stockId, 7)

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

    // Actualiser les statistiques toutes les 15 secondes
    const interval = setInterval(fetchStatistics, 15000)

    // Écouter un événement global pour mise à jour immédiate après création de vente
    const onSalesUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || !detail.stockId || detail.stockId === stockId) {
        fetchStatistics()
      }
    }
    window.addEventListener('sales-updated', onSalesUpdated as EventListener)

    return () => {
      clearInterval(interval)
      window.removeEventListener('sales-updated', onSalesUpdated as EventListener)
    }
  }, [stockId])

  if (loading) {
    return (
      <div className="space-y-6">
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
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchStatistics}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!statistics) return null

  // Préparer les données pour les graphiques
  const dailySalesData = statistics.dailySales?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
    sales: item.daily_revenue || 0,
    orders: item.sales_count || 0
  })) || []

  const topProductsData = statistics.topProducts?.map((item: any, index: number) => ({
    name: item.name,
    value: item.total_sold || 0,
    color: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'][index % 5]
  })) || []

  // Données pour les ventes hebdomadaires (simulées à partir des données journalières)
  const weeklySales = statistics.weeklySales?.map((item: any) => ({
    week: `Semaine ${item.week}`,
    sales: item.weekly_revenue || 0
  })) || [
    { week: 'Semaine 1', sales: statistics.weekSales?.week_revenue || 0 },
    { week: 'Semaine 2', sales: 0 },
    { week: 'Semaine 3', sales: 0 },
    { week: 'Semaine 4', sales: 0 }
  ]

  // Données pour les ventes mensuelles (simulées)
  const monthlySales = statistics.monthlySales?.map((item: any) => ({
    month: new Date(item.month).toLocaleDateString('fr-FR', { month: 'short' }),
    sales: item.monthly_revenue || 0
  })) || [
    { month: 'Jan', sales: 0 },
    { month: 'Fév', sales: 0 },
    { month: 'Mar', sales: statistics.monthSales?.month_revenue || 0 },
    { month: 'Avr', sales: 0 },
    { month: 'Mai', sales: 0 },
    { month: 'Juin', sales: 0 }
  ]

  return (
    <div className="space-y-6">
      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes Aujourd'hui</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(statistics.todaySales?.today_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">{statistics.todaySales?.today_sales_count || 0} ventes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes Semaine</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(statistics.weekSales?.week_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">{statistics.weekSales?.week_sales_count || 0} ventes cette semaine</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventes Mois</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(statistics.monthSales?.month_revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">{statistics.monthSales?.month_sales_count || 0} ventes ce mois</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commandes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.sales?.total_sales || 0}</div>
            <p className="text-xs text-muted-foreground">7 derniers jours</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques par période */}
      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Journalier</TabsTrigger>
          <TabsTrigger value="weekly">Hebdomadaire</TabsTrigger>
          <TabsTrigger value="monthly">Mensuel</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventes Journalières (7 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatPrice(value), 'Ventes']} />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nombre de Commandes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [value, 'Commandes']} />
                    <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventes Hebdomadaires</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={weeklySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventes Mensuelles</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Produits les plus vendus */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Produits les Plus Vendus
          </CardTitle>
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
    </div>
  )
}
