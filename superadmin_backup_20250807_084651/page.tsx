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
import { LogOut, BarChart3, Eye, TrendingUp, Package, DollarSign, Users, Edit, Monitor, Settings } from "lucide-react"
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

const stockNames = {
  "al-ouloum": "Librairie Al Ouloum",
  renaissance: "Librairie La Renaissance",
  gros: "Gros (Dépôt général)",
}

// Données de démonstration
const globalStats = {
  totalSales: 125430,
  topStock: "al-ouloum",
  totalProducts: {
    "al-ouloum": 1250,
    renaissance: 980,
    gros: 2340,
  },
}

const salesData = [
  { date: "2024-01-01", "al-ouloum": 1200, renaissance: 800, gros: 2100 },
  { date: "2024-01-02", "al-ouloum": 1500, renaissance: 950, gros: 1800 },
  { date: "2024-01-03", "al-ouloum": 1100, renaissance: 1200, gros: 2300 },
  { date: "2024-01-04", "al-ouloum": 1800, renaissance: 1100, gros: 2000 },
  { date: "2024-01-05", "al-ouloum": 1400, renaissance: 900, gros: 2200 },
  { date: "2024-01-06", "al-ouloum": 1600, renaissance: 1300, gros: 1900 },
  { date: "2024-01-07", "al-ouloum": 1300, renaissance: 1000, gros: 2400 },
]

const stockProducts = {
  "al-ouloum": [
    { id: 1, name: "Produit exemple A", reference: "AL001", price: 25.5, quantity: 45 },
    { id: 2, name: "Produit exemple B", reference: "AL002", price: 8.75, quantity: 120 },
    { id: 3, name: "Produit exemple C", reference: "AL003", price: 2.3, quantity: 200 },
  ],
  renaissance: [
    { id: 1, name: "Roman français", reference: "RF001", price: 18.9, quantity: 35 },
    { id: 2, name: "Dictionnaire", reference: "DIC001", price: 45.0, quantity: 25 },
    { id: 3, name: "Agenda 2024", reference: "AG2024", price: 12.5, quantity: 80 },
  ],
  gros: [
    { id: 1, name: "Carton de cahiers", reference: "CC100", price: 85.0, quantity: 50 },
    { id: 2, name: "Lot de stylos (50)", reference: "LS50", price: 95.0, quantity: 30 },
    { id: 3, name: "Papier A4 (500 feuilles)", reference: "PA4500", price: 15.75, quantity: 150 },
  ],
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"]

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [selectedStock, setSelectedStock] = useState<string>("")
  const [users, setUsers] = useState<any[]>([])
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (parsedUser.role !== "super_admin") {
      router.push("/")
      return
    }

    setUser(parsedUser)
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUsers(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const openEditDialog = (userToEdit: any) => {
    setSelectedUser(userToEdit)
    setEditForm({
      email: userToEdit.email,
      password: '',
      confirmPassword: ''
    })
    setShowEditDialog(true)
    setMessage('')
  }

  const handleUpdateUser = async () => {
    if (!selectedUser) return

    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setMessage('Les mots de passe ne correspondent pas')
      return
    }

    if (editForm.password && editForm.password.length < 6) {
      setMessage('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setLoading(true)
    try {
      const updateData: any = {
        id: selectedUser.id,
        email: editForm.email
      }

      if (editForm.password) {
        updateData.password = editForm.password
      }

      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const data = await response.json()
      if (data.success) {
        setMessage('Utilisateur mis à jour avec succès')
        fetchUsers()
        setTimeout(() => {
          setShowEditDialog(false)
          setMessage('')
        }, 1500)
      } else {
        setMessage(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      setMessage('Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const navigateToStock = (stockId: string) => {
    // Store current super admin session
    const currentUser = localStorage.getItem('user')
    if (currentUser) {
      localStorage.setItem('superAdminSession', currentUser)
      // Temporarily set stock context
      const userData = JSON.parse(currentUser)
      localStorage.setItem('user', JSON.stringify({
        ...userData,
        stockId: stockId,
        viewingAsStock: true
      }))
    }
    router.push(`/dashboard/stock/${stockId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  if (!user) {
    return <div>Chargement...</div>
  }

  const pieData = Object.entries(globalStats.totalProducts).map(([stock, count]) => ({
    name: stockNames[stock as keyof typeof stockNames],
    value: count,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Super Admin</h1>
              <p className="text-sm text-gray-600">Interface globale de gestion</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="global" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Vue Globale
            </TabsTrigger>
            <TabsTrigger value="stocks" className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              Accès Stocks
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Gestion Comptes
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Analyse Détaillée
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="space-y-6">
            {/* Statistiques générales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total des Ventes</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatPrice(globalStats.totalSales)}</div>
                  <p className="text-xs text-muted-foreground">Tous les stocks confondus</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Stock</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stockNames[globalStats.topStock as keyof typeof stockNames]}
                  </div>
                  <p className="text-xs text-muted-foreground">Meilleur chiffre d'affaires</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Produits</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.values(globalStats.totalProducts).reduce((a, b) => a + b, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Tous les stocks</p>
                </CardContent>
              </Card>
            </div>

            {/* Graphiques comparatifs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Ventes par Stock (7 derniers jours)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="al-ouloum" fill="#3b82f6" name="Al Ouloum" />
                      <Bar dataKey="renaissance" fill="#10b981" name="Renaissance" />
                      <Bar dataKey="gros" fill="#f59e0b" name="Gros" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition des Produits</CardTitle>
                </CardHeader>
                <CardContent>
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stocks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accès Direct aux Dashboards des Stocks</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur un stock pour accéder à son dashboard complet
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-blue-200 hover:border-blue-400">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Librairie Al Ouloum</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {globalStats.totalProducts["al-ouloum"]} produits
                      </p>
                      <Button
                        onClick={() => navigateToStock('al-ouloum')}
                        className="w-full"
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        Accéder au Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-green-200 hover:border-green-400">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Librairie La Renaissance</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {globalStats.totalProducts.renaissance} produits
                      </p>
                      <Button
                        onClick={() => navigateToStock('renaissance')}
                        className="w-full"
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        Accéder au Dashboard
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-orange-200 hover:border-orange-400">
                    <CardContent className="p-6 text-center">
                      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Gros (Dépôt général)</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {globalStats.totalProducts.gros} produits
                      </p>
                      <Button
                        onClick={() => navigateToStock('gros')}
                        className="w-full"
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        Accéder au Dashboard
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Information</h4>
                  <p className="text-sm text-blue-700">
                    En tant que Super Admin, vous avez accès complet à tous les dashboards des stocks.
                    Vous pouvez naviguer librement entre les stocks et revenir à cette interface globale à tout moment.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des Comptes Administrateurs</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Gérez les comptes des administrateurs de chaque stock
                </p>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Chargement des utilisateurs...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3">Utilisateur</th>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Stock Assigné</th>
                          <th className="text-left p-3">Rôle</th>
                          <th className="text-left p-3">Statut</th>
                          <th className="text-left p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => u.role !== 'super_admin').map((userItem) => (
                          <tr key={userItem.id} className="border-b hover:bg-muted/50">
                            <td className="p-3">
                              <div>
                                <p className="font-medium">{userItem.username}</p>
                                <p className="text-sm text-muted-foreground">ID: {userItem.id}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="text-sm">{userItem.email}</p>
                            </td>
                            <td className="p-3">
                              <p className="text-sm">
                                {userItem.stock_name || 'Non assigné'}
                              </p>
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">
                                {userItem.role === 'admin' ? 'Administrateur' : userItem.role}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge variant={userItem.is_active ? 'default' : 'destructive'}>
                                {userItem.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(userItem)}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Modifier
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Sélection de Stock pour Analyse Détaillée</CardTitle>
                <div className="w-full max-w-xs">
                  <Select value={selectedStock} onValueChange={setSelectedStock}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un stock" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="al-ouloum">Librairie Al Ouloum</SelectItem>
                      <SelectItem value="renaissance">Librairie La Renaissance</SelectItem>
                      <SelectItem value="gros">Gros (Dépôt général)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>

            {selectedStock && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Produits - {stockNames[selectedStock as keyof typeof stockNames]}</CardTitle>
                    <p className="text-sm text-gray-600">Lecture seule</p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Nom</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Référence</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Prix</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Quantité</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockProducts[selectedStock as keyof typeof stockProducts]?.map((product) => (
                            <tr key={product.id}>
                              <td className="border border-gray-300 px-4 py-2">{product.name}</td>
                              <td className="border border-gray-300 px-4 py-2">{product.reference}</td>
                              <td className="border border-gray-300 px-4 py-2">{formatPrice(product.price)}</td>
                              <td className="border border-gray-300 px-4 py-2">{product.quantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Statistiques - {stockNames[selectedStock as keyof typeof stockNames]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={salesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey={selectedStock}
                          stroke="#8884d8"
                          strokeWidth={2}
                          name={stockNames[selectedStock as keyof typeof stockNames]}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le Compte Administrateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{selectedUser.username}</p>
                <p className="text-xs text-muted-foreground">
                  Stock: {selectedUser.stock_name || 'Non assigné'}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="admin@exemple.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Nouveau Mot de Passe</Label>
              <Input
                id="password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Laisser vide pour ne pas changer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 6 caractères. Laisser vide pour conserver le mot de passe actuel.
              </p>
            </div>

            {editForm.password && (
              <div>
                <Label htmlFor="confirmPassword">Confirmer le Mot de Passe *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                  placeholder="Confirmer le nouveau mot de passe"
                />
              </div>
            )}

            {message && (
              <Alert variant={message.includes('succès') ? 'default' : 'destructive'}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpdateUser}
                disabled={loading || !editForm.email}
                className="flex-1"
              >
                {loading ? 'Mise à jour...' : 'Mettre à Jour'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={loading}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
