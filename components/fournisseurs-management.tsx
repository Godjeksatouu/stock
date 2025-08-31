"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Truck, Mail, Phone, MapPin, Building, TrendingUp } from "lucide-react"
import { fournisseursApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { Fournisseur, CreateFournisseurRequest, STOCK_MAPPING } from "@/lib/types"
import { AdvancedPagination, usePagination } from "@/components/ui/advanced-pagination"

interface FournisseursManagementProps {
  stockId: string
}

export default function FournisseursManagement({ stockId }: FournisseursManagementProps) {
  const [fournisseurs, setFournisseurs] = useState<any[]>([])
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
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contact_person: '',
    payment_terms: '30 jours'
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  // Fetch fournisseurs when pagination or search changes
  useEffect(() => {
    fetchFournisseurs()
  }, [stockId, currentPage, itemsPerPage, searchTerm])

  // Reset pagination when search term changes
  useEffect(() => {
    if (searchTerm) {
      resetPagination()
    }
  }, [searchTerm, resetPagination])

  const fetchFournisseurs = async () => {
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

      const response = await fetch(`/api/fournisseurs?${params.toString()}`)
      const result = await response.json()

      if (result.success && result.data) {
        setFournisseurs(result.data)
        setTotalItems(result.pagination?.totalItems || 0)
        setTotalPages(result.pagination?.totalPages || 0)
      }
    } catch (error) {
      console.error('Error fetching fournisseurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const fournisseurData: CreateFournisseurRequest = {
        ...formData,
        stock_id: stockDbId
      }

      const response = await fournisseursApi.create(fournisseurData)
      if (response.success) {
        setShowCreateDialog(false)
        setFormData({ name: '', email: '', phone: '', address: '', contact_person: '', payment_terms: '30 jours' })
        fetchFournisseurs()
      }
    } catch (error) {
      console.error('Error creating fournisseur:', error)
    }
  }

  const handleEdit = async () => {
    if (!selectedFournisseur) return

    try {
      const response = await fournisseursApi.update({
        id: selectedFournisseur.id,
        ...formData
      })
      if (response.success) {
        setShowEditDialog(false)
        setSelectedFournisseur(null)
        setFormData({ name: '', email: '', phone: '', address: '', contact_person: '', payment_terms: '30 jours' })
        fetchFournisseurs()
      }
    } catch (error) {
      console.error('Error updating fournisseur:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return

    try {
      const response = await fournisseursApi.delete(id)
      if (response.success) {
        fetchFournisseurs()
      }
    } catch (error) {
      console.error('Error deleting fournisseur:', error)
    }
  }

  const openEditDialog = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur)
    setFormData({
      name: fournisseur.name,
      email: fournisseur.email || '',
      phone: fournisseur.phone || '',
      address: fournisseur.address || '',
      contact_person: fournisseur.contact_person || '',
      payment_terms: fournisseur.payment_terms || '30 jours'
    })
    setShowEditDialog(true)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des fournisseurs...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données fournisseurs et suivez vos achats
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Fournisseur
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Fournisseurs</p>
                <p className="text-2xl font-bold">{fournisseurs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Fournisseurs Actifs</p>
                <p className="text-2xl font-bold">
                  {fournisseurs.filter(f => f.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Achats</p>
                <p className="text-2xl font-bold">
                  {fournisseurs.reduce((sum, f) => sum + (f.total_achats || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Solde Impayé</p>
                <p className="text-2xl font-bold">
                  {formatPrice(fournisseurs.reduce((sum, f) => sum + (f.outstanding_balance || 0), 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fournisseurs Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Liste des Fournisseurs</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Rechercher un fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {fournisseurs.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun fournisseur trouvé</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Créer le premier fournisseur
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Nom / Société</th>
                    <th className="text-left p-2">Contact</th>
                    <th className="text-left p-2">Téléphone</th>
                    <th className="text-left p-2">Achats</th>
                    <th className="text-left p-2">Montant Total</th>
                    <th className="text-left p-2">Solde Impayé</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fournisseurs.map((fournisseur: any) => (
                    <tr key={fournisseur.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div>
                          <p className="font-medium">{fournisseur.name}</p>
                          {fournisseur.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {fournisseur.address.substring(0, 30)}...
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <div>
                          {fournisseur.contact_person && (
                            <p className="text-sm font-medium">{fournisseur.contact_person}</p>
                          )}
                          {fournisseur.email && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {fournisseur.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {fournisseur.phone ? (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {fournisseur.phone}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge variant="secondary">
                          {fournisseur.total_achats || 0} achats
                        </Badge>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">
                          {formatPrice(fournisseur.total_amount || 0)}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`font-medium ${(fournisseur.outstanding_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPrice(fournisseur.outstanding_balance || 0)}
                        </span>
                      </td>
                      <td className="p-2">
                        <Badge variant={fournisseur.is_active ? "default" : "secondary"}>
                          {fournisseur.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(fournisseur)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(fournisseur.id)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom / Société *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du fournisseur ou société"
              />
            </div>
            <div>
              <Label htmlFor="contact_person">Personne de Contact</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nom du contact"
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
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="payment_terms">Conditions de Paiement</Label>
              <Input
                id="payment_terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="30 jours"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier Fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nom / Société *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nom du fournisseur ou société"
              />
            </div>
            <div>
              <Label htmlFor="edit-contact_person">Personne de Contact</Label>
              <Input
                id="edit-contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Nom du contact"
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
              <Label htmlFor="edit-address">Adresse</Label>
              <Textarea
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-payment_terms">Conditions de Paiement</Label>
              <Input
                id="edit-payment_terms"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                placeholder="30 jours"
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
