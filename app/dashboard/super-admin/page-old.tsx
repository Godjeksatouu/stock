"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LogOut, BarChart3, Eye, TrendingUp, Package, DollarSign, Users, Edit, Monitor, Settings, ArrowRight, RefreshCw } from "lucide-react"
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
import { formatPrice } from "@/lib/currency"

const STOCK_MAPPING = {
  "al-ouloum": 1,
  "renaissance": 2,
  "gros": 3,
}

const STOCK_NAMES = {
  "al-ouloum": "Librairie Al Ouloum",
  "renaissance": "Librairie La Renaissance",
  "gros": "Gros (Dépôt général)",
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    console.log('🔍 SuperAdmin page loading...')
    
    // Check authentication
    const userData = localStorage.getItem('user')
    console.log('👤 User data from localStorage:', userData)
    
    if (!userData) {
      console.log('❌ No user data found, redirecting to login')
      router.push('/login?stock=super-admin')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      console.log('👤 Parsed user:', parsedUser)
      
      // Check if user is superadmin
      if (parsedUser.role === 'superadmin') {
        console.log('✅ Superadmin role confirmed')
        setUser(parsedUser)
        setAuthorized(true)
        setLoading(false)
        
        // Fetch dashboard data
        fetchDashboardData()
      } else {
        console.log('❌ Not superadmin role:', parsedUser.role)
        router.push('/')
        return
      }
    } catch (error) {
      console.error('❌ Error parsing user data:', error)
      localStorage.removeItem('user')
      router.push('/login?stock=super-admin')
      return
    }
  }, [router])

  const fetchDashboardData = async () => {
    try {
      console.log('📊 Fetching dashboard data...')
      setDataLoading(true)
      
      const response = await fetch('/api/superadmin/dashboard')
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Dashboard data loaded:', result.data)
        setDashboardData(result.data)
      } else {
        console.error('❌ Failed to load dashboard data:', result.error)
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error)
    } finally {
      setDataLoading(false)
    }
  }

  const navigateToStock = (stockId: string) => {
    console.log('🔄 Superadmin accessing stock directly:', stockId)
    
    // Create a superadmin session for the specific stock
    const currentUser = localStorage.getItem('user')
    if (currentUser) {
      const userData = JSON.parse(currentUser)
      
      // Create a temporary admin session for this stock
      const stockAdminSession = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        role: 'admin', // Temporarily act as admin for this stock
        stockId: STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING],
        originalRole: 'superadmin', // Keep track of original role
        superadminAccess: true, // Flag to indicate this is superadmin access
        accessingStock: stockId
      }
      
      console.log('🔑 Creating stock admin session:', stockAdminSession)
      
      // Store the superadmin session for later restoration
      localStorage.setItem('superAdminSession', currentUser)
      
      // Set the temporary stock admin session
      localStorage.setItem('user', JSON.stringify(stockAdminSession))
      
      // Navigate directly to stock dashboard
      router.push(`/dashboard/stock/${stockId}`)
    }
  }

  const handleLogout = () => {
    console.log('🚪 Logging out superadmin')
    localStorage.removeItem("user")
    localStorage.removeItem("superAdminSession")
    router.push("/")
  }

  const handleEditUser = (user: any) => {
    setEditingUser({ ...user })
    setShowEditDialog(true)
  }

  const handleSaveUser = () => {
    // In a real app, this would make an API call
    console.log('💾 Saving user:', editingUser)
    setShowEditDialog(false)
    setEditingUser(null)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du tableau de bord superadmin...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized state
  if (!authorized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-red-600">Accès non autorisé</h2>
          <p className="text-gray-600 mb-4">Vous devez être connecté en tant que superadmin.</p>
          <Button onClick={() => router.push('/login?stock=super-admin')}>
            Se connecter
          </Button>
        </div>
      </div>
    )
  }

  // Prepare chart data - FIXED PIE CHART DATA
  const pieData = dashboardData?.productsByStock ? 
    Object.entries(dashboardData.productsByStock)
      .filter(([stockKey, data]: [string, any]) => data.count > 0) // Only show stocks with products
      .map(([stockKey, data]: [string, any]) => ({
        name: STOCK_NAMES[stockKey as keyof typeof STOCK_NAMES] || data.name,
        value: data.count,
        stockKey: stockKey
      })) : []

  console.log('🥧 Pie chart data:', pieData)

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord Superadmin</h1>
              <p className="text-sm text-gray-600">
                Connecté en tant que: <span className="font-medium">{user.email}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={dataLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                <Monitor className="w-3 h-3 mr-1" />
                Super Administrateur
              </Badge>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {dataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement des données...</p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="stocks">Gestion des Stocks</TabsTrigger>
              <TabsTrigger value="users">Utilisateurs</TabsTrigger>
              <TabsTrigger value="settings">Paramètres</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ventes Totales</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData ? formatPrice(dashboardData.totalSales) : '0.00 DH'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData?.totalSalesCount || 0} ventes au total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stock Principal</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.topStock?.name || 'Aucun'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {dashboardData?.topStock ? 
                        `${formatPrice(dashboardData.topStock.sales)} de ventes` : 
                        'Aucune donnée'
                      }
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Produits Totaux</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.stats?.totalProducts || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Tous les stocks confondus
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Évolution des Ventes (7 derniers jours)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dashboardData?.chartData || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="al-ouloum" stroke="#0088FE" name="Al Ouloum" />
                        <Line type="monotone" dataKey="renaissance" stroke="#00C49F" name="Renaissance" />
                        <Line type="monotone" dataKey="gros" stroke="#FFBB28" name="Gros" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Répartition des Produits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value, name) => [`${value} produits`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500">
                        <div className="text-center">
                          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Aucun produit à afficher</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Stocks Management Tab */}
            <TabsContent value="stocks" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(STOCK_NAMES).map(([stockId, stockName]) => {
                  const stockData = dashboardData?.productsByStock?.[stockId]
                  return (
                    <Card key={stockId} className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-purple-200">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {stockName}
                          <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                            {stockData?.count || 0} produits
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-sm text-gray-600">
                            Stock ID: {stockId}
                          </div>
                          <div className="text-sm text-gray-600">
                            Quantité totale: {stockData?.quantity || 0}
                          </div>
                          <div className="text-xs text-purple-600 font-medium">
                            🔑 Accès direct avec privilèges superadmin
                          </div>
                          <Button 
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
                            onClick={() => navigateToStock(stockId)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Accéder au Stock
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              
              <Alert className="border-purple-200 bg-purple-50">
                <Monitor className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Privilèges Superadmin:</strong> Vous avez un accès direct à tous les stocks sans authentification supplémentaire. 
                  Vos privilèges superadmin sont préservés lors de la navigation.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Users Management Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gestion des Utilisateurs ({dashboardData?.users?.length || 0} utilisateurs)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.users?.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            <Badge variant="outline">
                              {user.stock_name || `Stock ${user.stock_id || 'null'}`}
                            </Badge>
                            <Badge variant={user.active ? 'default' : 'destructive'}>
                              {user.active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        Aucun utilisateur trouvé
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres Système</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Settings className="h-4 w-4" />
                      <AlertDescription>
                        Interface de configuration système en cours de développement.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Nom d'utilisateur</Label>
                <Input
                  id="username"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Rôle</Label>
                <Select value={editingUser.role} onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="caissier">Caissier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveUser}>
                  Sauvegarder
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
