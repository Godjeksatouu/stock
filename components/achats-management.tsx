"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Edit, Trash2, ShoppingCart } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

interface Achat {
  id: number
  reference: string
  supplier_name: string
  total: number
  payment_method: string
  payment_status: string
  delivery_date?: string
  notes?: string
  stock_id: number
  created_at: string
  fournisseur_id: number
}

interface Fournisseur {
  id: number
  name: string
  email?: string
  phone?: string
}

interface AchatsManagementProps {
  stockId: string
}

export default function AchatsManagement({ stockId }: AchatsManagementProps) {
  const [achats, setAchats] = useState<Achat[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalAchats, setTotalAchats] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingAchat, setEditingAchat] = useState<Achat | null>(null)

  // Form state - using non-empty default values
  const [formData, setFormData] = useState({
    fournisseur_id: 'none',
    reference: '',
    total: '',
    payment_method: 'cash',
    payment_status: 'pending',
    delivery_date: '',
    notes: ''
  })

  const stockNames = {
    'al-ouloum': 'Librairie Al Ouloum',
    'renaissance': 'Librairie La Renaissance',
    'gros': 'Gros (Dépôt général)'
  }

  const fetchAchats = async (page = 1, search = '') => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        stockId,
        page: page.toString(),
        limit: '25'
      })
      
      if (search.trim()) {
        params.append('search', search.trim())
      }

      const response = await fetch(`/api/achats?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success && result.data) {
        const achatsArray = Array.isArray(result.data.achats) ? result.data.achats : []
        setAchats(achatsArray)
        setTotalPages(result.data.pagination?.totalPages || 1)
        setTotalAchats(result.data.pagination?.total || 0)
        setCurrentPage(page)
      } else {
        setError(result.error || 'Failed to fetch achats')
        setAchats([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setAchats([])
    } finally {
      setLoading(false)
    }
  }

  const fetchFournisseurs = async () => {
    try {
      const response = await fetch('/api/fournisseurs-list')
      const result = await response.json()
      if (result.success) {
        setFournisseurs(result.data || [])
      }
    } catch (err) {
      console.error('Error fetching fournisseurs:', err)
    }
  }

  useEffect(() => {
    if (stockId) {
      fetchAchats(1, searchTerm)
      fetchFournisseurs()
    }
  }, [stockId])

  const handleSearch = () => {
    fetchAchats(1, searchTerm)
  }

  const handlePageChange = (page: number) => {
    fetchAchats(page, searchTerm)
  }

  const resetForm = () => {
    setFormData({
      fournisseur_id: 'none',
      reference: '',
      total: '',
      payment_method: 'cash',
      payment_status: 'pending',
      delivery_date: '',
      notes: ''
    })
  }

  const handleAdd = async () => {
    try {
      setError(null)
      
      if (formData.fournisseur_id === 'none') {
        setError('Fournisseur est requis')
        return
      }

      if (!formData.total || parseFloat(formData.total) <= 0) {
        setError('Montant total doit être supérieur à 0')
        return
      }

      const requestData = {
        fournisseur_id: parseInt(formData.fournisseur_id),
        reference: formData.reference,
        total: parseFloat(formData.total),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        delivery_date: formData.delivery_date || null,
        notes: formData.notes
      }

      const response = await fetch(`/api/achats?stockId=${stockId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setShowAddDialog(false)
        resetForm()
        fetchAchats(currentPage, searchTerm)
        setError(null)
      } else {
        setError(result.error || 'Failed to create achat')
      }
    } catch (err) {
      setError('Failed to create achat')
    }
  }

  const handleEdit = (achat: Achat) => {
    setEditingAchat(achat)
    setFormData({
      fournisseur_id: achat.fournisseur_id.toString(),
      reference: achat.reference || '',
      total: achat.total.toString(),
      payment_method: achat.payment_method || 'cash',
      payment_status: achat.payment_status || 'pending',
      delivery_date: achat.delivery_date || '',
      notes: achat.notes || ''
    })
    setShowEditDialog(true)
  }

  const handleUpdate = async () => {
    try {
      setError(null)
      
      if (!editingAchat || formData.fournisseur_id === 'none') {
        setError('Fournisseur est requis')
        return
      }

      if (!formData.total || parseFloat(formData.total) <= 0) {
        setError('Montant total doit être supérieur à 0')
        return
      }

      const requestData = {
        fournisseur_id: parseInt(formData.fournisseur_id),
        reference: formData.reference,
        total: parseFloat(formData.total),
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        delivery_date: formData.delivery_date || null,
        notes: formData.notes
      }

      const response = await fetch(`/api/achats/${editingAchat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (result.success) {
        setShowEditDialog(false)
        setEditingAchat(null)
        resetForm()
        fetchAchats(currentPage, searchTerm)
        setError(null)
      } else {
        setError(result.error || 'Failed to update achat')
      }
    } catch (err) {
      setError('Failed to update achat')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet achat ?')) {
      return
    }

    try {
      const response = await fetch(`/api/achats/${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        fetchAchats(currentPage, searchTerm)
        setError(null)
      } else {
        setError(result.error || 'Failed to delete achat')
      }
    } catch (err) {
      setError('Failed to delete achat')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des achats...</p>
        </div>
      </div>
    )
  }

  const FormFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="fournisseur">Fournisseur *</Label>
        <Select value={formData.fournisseur_id} onValueChange={(value) => setFormData({...formData, fournisseur_id: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sélectionner un fournisseur</SelectItem>
            {fournisseurs.map((fournisseur) => (
              <SelectItem key={fournisseur.id} value={fournisseur.id.toString()}>
                {fournisseur.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="reference">Référence</Label>
        <Input
          id="reference"
          value={formData.reference}
          onChange={(e) => setFormData({...formData, reference: e.target.value})}
          placeholder="Référence de l'achat"
        />
      </div>
      <div>
        <Label htmlFor="total">Montant total (DH) *</Label>
        <Input
          id="total"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.total}
          onChange={(e) => setFormData({...formData, total: e.target.value})}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label htmlFor="payment_method">Méthode de paiement</Label>
        <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Espèces</SelectItem>
            <SelectItem value="card">Carte</SelectItem>
            <SelectItem value="check">Chèque</SelectItem>
            <SelectItem value="credit">Crédit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="payment_status">Statut de paiement</Label>
        <Select value={formData.payment_status} onValueChange={(value) => setFormData({...formData, payment_status: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="partial">Partiel</SelectItem>
            <SelectItem value="paid">Payé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="delivery_date">Date de livraison</Label>
        <Input
          id="delivery_date"
          type="date"
          value={formData.delivery_date}
          onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
        />
      </div>
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Notes sur l'achat"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5" />
              <span>Gestion des Achats</span>
              <Badge variant="outline">
                {stockNames[stockId as keyof typeof stockNames] || stockId}
              </Badge>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setShowAddDialog(true) }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel achat
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Ajouter un nouvel achat</DialogTitle>
                  <DialogDescription>
                    Remplissez les informations de l'achat. Le fournisseur et le montant total sont obligatoires.
                  </DialogDescription>
                </DialogHeader>
                <FormFields />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleAdd}>
                    Ajouter
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="flex space-x-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher un achat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Rechercher
            </Button>
          </div>

          {/* Achats Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(achats) && achats.length > 0 ? (
                  achats.map((achat) => (
                    <TableRow key={achat.id}>
                      <TableCell className="font-medium">{achat.reference || `ACH-${achat.id}`}</TableCell>
                      <TableCell>{achat.supplier_name}</TableCell>
                      <TableCell className="font-medium">{formatPrice(achat.total)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{achat.payment_method}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={achat.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {achat.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {achat.created_at ? new Date(achat.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(achat)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(achat.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      {loading ? 'Chargement...' : 'Aucun achat trouvé'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Affichage de {((currentPage - 1) * 25) + 1} à {Math.min(currentPage * 25, totalAchats)} sur {totalAchats} résultats
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-3 py-1 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'achat</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'achat. Le fournisseur et le montant total sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          <FormFields />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>
              Mettre à jour
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
