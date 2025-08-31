"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin, TrendingUp } from "lucide-react"
import { clientsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { Client, CreateClientRequest, STOCK_MAPPING } from "@/lib/types"
import { AdvancedPagination, usePagination } from "@/components/ui/advanced-pagination"

interface ClientsManagementProps {
  stockId: string
}

export default function ClientsManagement({ stockId }: ClientsManagementProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")

  // Pagination hook
  const {
    currentPage,
    itemsPerPage,
    loading,
    setLoading,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination
  } = usePagination(25)

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  // Fetch clients when pagination or search changes
  useEffect(() => {
    fetchClients()
  }, [stockId, currentPage, itemsPerPage, searchTerm])

  // Reset pagination when search term changes
  useEffect(() => {
    if (searchTerm) {
      resetPagination()
    }
  }, [searchTerm, resetPagination])

  const fetchClients = async () => {
    try {
      setLoading(true)

      // Build API URL with pagination and search parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      })

      if (stockId) {
        params.append('stockId', stockId)
      }

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const response = await fetch(`/api/clients?${params.toString()}`)
      const result = await response.json()

      if (result.success && result.data) {
        setClients(result.data)
        setTotalItems(result.pagination?.totalItems || 0)
        setTotalPages(result.pagination?.totalPages || 0)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const clientData: CreateClientRequest = {
        ...formData,
        stock_id: stockDbId
      }

      const response = await clientsApi.create(clientData)
      if (response.success) {
        setShowCreateDialog(false)
        setFormData({ name: '', email: '', phone: '', address: '' })
        fetchClients()
      }
    } catch (error) {
      console.error('Error creating client:', error)
    }
  }

  const handleEdit = async () => {
    if (!selectedClient) return

    try {
      const response = await clientsApi.update({
        id: selectedClient.id,
        ...formData
      })
      if (response.success) {
        setShowEditDialog(false)
        setSelectedClient(null)
        setFormData({ name: '', email: '', phone: '', address: '' })
        fetchClients()
      }
    } catch (error) {
      console.error('Error updating client:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return

    try {
      const response = await clientsApi.delete(id)
      if (response.success) {
        fetchClients()
      }
    } catch (error) {
      console.error('Error deleting client:', error)
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || ''
    })
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des clients...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Clients</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données clients
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Client
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Clients Actifs</p>
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avec Email</p>
                <p className="text-2xl font-bold">
                  {clients.filter(c => c.email).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Liste des Clients</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Rechercher un client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun client trouvé</p>
              <Button 
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Créer le premier client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nom</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Téléphone</th>
                    <th className="text-left p-2">Ventes</th>
                    <th className="text-left p-2">Montant Total</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client: any) => (
                    <tr key={client.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{client.name}</p>
                          {client.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {client.address.substring(0, 30)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {client.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {client.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {client.total_sales || 0} ventes
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">
                          {formatPrice(client.total_amount || 0)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant={client.is_active ? "default" : "secondary"}>
                          {client.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(client.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalItems > 0 && (
            <AdvancedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              loading={loading}
              className="mt-4"
            />
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du client"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} disabled={!formData.name}>
                Créer
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du client"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Téléphone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="06 12 34 56 78"
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Adresse</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleEdit} disabled={!formData.name}>
                Modifier
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
