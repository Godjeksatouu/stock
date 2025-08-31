"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign,
  TrendingUp,
  Package,
  RefreshCw,
  Edit,
  Trash2,
  Plus,
  Building2,
  Users,
  LogOut,
  ArrowRight,
  BarChart3
} from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { toast } from "@/hooks/use-toast"

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
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    stock_id: ''
  })
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    console.log('🔍 SuperAdmin page loading...')

    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login?stock=super-admin')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)

      if (parsedUser.role === 'super_admin' || parsedUser.role === 'superadmin') {
        setUser(parsedUser)
        setAuthorized(true)
        setLoading(false)
        fetchDashboardData()
      } else {
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
      setDataLoading(true)
      const response = await fetch('/api/superadmin/dashboard-simplified')
      const result = await response.json()

      if (result.success) {
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
    console.log('🔄 Superadmin accessing stock:', stockId)

    // Store the original super admin session for restoration later
    const currentUser = localStorage.getItem('user')
    if (currentUser) {
      localStorage.setItem('superadmin_context', JSON.stringify({
        original_user: user,
        access_time: new Date().toISOString(),
        target_stock: stockId
      }))

      // Keep the super admin user data as-is since the layout already handles super_admin role
      // No need to modify the user session - the layout will allow super_admin to access any stock
    }

    router.push(`/dashboard/stock/${stockId}`)
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('superadmin_context')
    router.push('/login')
  }

  const openUserDialog = (user = null) => {
    setEditingUser(user)
    if (user) {
      // Populate form with existing user data
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        role: user.role || '',
        stock_id: user.role === 'super_admin' ? 'global' : (user.stock_id ? user.stock_id.toString() : '')
      })
    } else {
      // Reset form for new user
      setFormData({
        username: '',
        email: '',
        password: '',
        role: '',
        stock_id: ''
      })
    }
    setShowUserDialog(true)
  }

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      }

      // Reset stock_id when role changes to super_admin
      if (field === 'role' && value === 'super_admin') {
        newData.stock_id = 'global'
      }

      return newData
    })
  }

  const handleSaveUser = async () => {
    try {
      setFormLoading(true)

      // Validation
      if (!formData.username || !formData.email || !formData.role) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive"
        })
        return
      }

      // Validate stock selection for non-super_admin roles
      if (formData.role !== 'super_admin' && !formData.stock_id) {
        toast({
          title: "Erreur",
          description: "Veuillez sélectionner un stock pour ce rôle",
          variant: "destructive"
        })
        return
      }

      // If new user, password is required
      if (!editingUser && !formData.password) {
        toast({
          title: "Erreur",
          description: "Le mot de passe est obligatoire pour un nouvel utilisateur",
          variant: "destructive"
        })
        return
      }

      const userData = {
        ...formData,
        stock_id: (formData.role === 'super_admin' || formData.stock_id === 'global') ? null : parseInt(formData.stock_id) || null
      }

      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users'
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Succès",
          description: editingUser ? "Utilisateur modifié avec succès" : "Utilisateur créé avec succès"
        })
        setShowUserDialog(false)
        fetchDashboardData() // Refresh data
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la sauvegarde",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error saving user:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la sauvegarde de l'utilisateur",
        variant: "destructive"
      })
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Succès",
          description: "Utilisateur supprimé avec succès"
        })
        fetchDashboardData() // Refresh data
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Erreur lors de la suppression",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression de l'utilisateur",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Accès non autorisé</h1>
          <p className="text-gray-600 mb-4">Vous n'avez pas les permissions pour accéder à cette page.</p>
          <Button onClick={() => router.push('/')}>Retour à l'accueil</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
              <p className="text-sm text-gray-600 mt-1">
                Connecté en tant que: <span className="font-medium">{user.email}</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={fetchDashboardData} disabled={dataLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
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
          <div className="space-y-8">
            {/* Section 1: Analytics for 3 stocks */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📈 Analytics par Stock</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(dashboardData?.stocksData || {}).map(([stockKey, sData]: any) => (
                  <Card key={stockKey} className="border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
                        {sData.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-600">Produits</span><span className="font-medium">{sData.products || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Ventes</span><span className="font-medium">{sData.sales || 0}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">CA</span><span className="font-medium">{formatPrice(sData.revenue || 0)} DH</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>


            {/* Section 3: Stocks */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🏬 Stocks</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(STOCK_NAMES).map(([stockId, stockName]) => (
                  <Card
                    key={stockId}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300 group"
                    onClick={() => navigateToStock(stockId)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                          {stockName}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">Accéder au dashboard de ce stock</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Gestion des Utilisateurs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">👥 Gestion des Utilisateurs</h2>
                <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openUserDialog()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvel utilisateur
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Nom d'utilisateur *</Label>
                        <Input
                          id="username"
                          placeholder="Nom d'utilisateur"
                          value={formData.username}
                          onChange={(e) => handleFormChange('username', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Email"
                          value={formData.email}
                          onChange={(e) => handleFormChange('email', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">
                          Mot de passe {!editingUser && '*'}
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder={editingUser ? "Laisser vide pour ne pas changer" : "Mot de passe"}
                          value={formData.password}
                          onChange={(e) => handleFormChange('password', e.target.value)}
                        />
                      </div>

                      <div>
                        <Label htmlFor="role">Rôle *</Label>
                        <Select value={formData.role} onValueChange={(value) => handleFormChange('role', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un rôle" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="caissier">Caissier</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="stock">
                          Stock / Emplacement {formData.role !== 'super_admin' && '*'}
                        </Label>
                        <Select
                          value={formData.stock_id}
                          onValueChange={(value) => handleFormChange('stock_id', value)}
                          disabled={formData.role === 'super_admin'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={
                              formData.role === 'super_admin'
                                ? "Accès global"
                                : "Sélectionner un stock"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {formData.role === 'super_admin' ? (
                              <SelectItem value="global">Accès global</SelectItem>
                            ) : (
                              <>
                                <SelectItem value="1">Librairie Al Ouloum</SelectItem>
                                <SelectItem value="2">Librairie La Renaissance</SelectItem>
                                <SelectItem value="3">Gros (Dépôt général)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                        {formData.role === 'super_admin' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Les super admins ont accès à tous les stocks
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowUserDialog(false)}
                          disabled={formLoading}
                        >
                          Annuler
                        </Button>
                        <Button
                          onClick={handleSaveUser}
                          disabled={formLoading}
                        >
                          {formLoading ? 'Sauvegarde...' : (editingUser ? 'Modifier' : 'Créer')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="space-y-0">
                    {dashboardData?.users?.map((user: any) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                            {user.stock_name && (
                              <Badge variant="outline">
                                {user.stock_name}
                              </Badge>
                            )}
                            <Badge variant={user.active ? 'default' : 'destructive'}>
                              {user.active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openUserDialog(user)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
