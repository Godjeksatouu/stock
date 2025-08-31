"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, CreditCard, AlertTriangle, Calendar, DollarSign, Users, Building } from "lucide-react"
import { formatPrice } from "@/lib/currency"
import { STOCK_MAPPING } from "@/lib/types"

interface ChequesManagementProps {
  stockId: string
}

interface Cheque {
  id: number
  reference: string
  amount: number
  bank_name: string | null
  account_number: string | null
  issue_date: string
  due_date: string
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled'
  type: 'received' | 'issued'
  client_name?: string
  fournisseur_name?: string
  person_name: string
  person_cin: string
  notes: string | null
  created_at: string
}

export default function ChequesManagement({ stockId }: ChequesManagementProps) {
  const [cheques, setCheques] = useState<Cheque[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null)
  const [formData, setFormData] = useState({
    reference: '',
    amount: 0,
    bank_name: '',
    account_number: '',
    issue_date: '',
    due_date: '',
    type: 'received' as 'received' | 'issued',
    person_name: '',
    person_cin: '',
    notes: ''
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  useEffect(() => {
    fetchCheques()
  }, [stockId])

  const fetchCheques = async () => {
    try {
      setLoading(true)
      // Simulate API call - replace with actual API
      const mockCheques: Cheque[] = [
        {
          id: 1,
          reference: 'CHQ-001',
          amount: 5000,
          bank_name: 'Banque Populaire',
          account_number: '123456789',
          issue_date: '2024-01-15',
          due_date: '2024-02-15',
          status: 'pending',
          type: 'received',
          person_name: 'Ahmed Benali',
          person_cin: 'AB123456',
          notes: 'Paiement facture #001',
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 2,
          reference: 'CHQ-002',
          amount: 3500,
          bank_name: 'BMCE Bank',
          account_number: '987654321',
          issue_date: '2024-01-20',
          due_date: '2024-02-20',
          status: 'cleared',
          type: 'received',
          person_name: 'Fatima Zahra',
          person_cin: 'FZ789012',
          notes: 'Règlement commande',
          created_at: '2024-01-20T14:30:00Z'
        }
      ]
      setCheques(mockCheques)
    } catch (error) {
      console.error('Error fetching cheques:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const newCheque: Cheque = {
        id: Date.now(), // Temporary ID
        reference: formData.reference || `CHQ-${Date.now()}`,
        amount: formData.amount,
        bank_name: formData.bank_name,
        account_number: formData.account_number,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        status: 'pending',
        type: formData.type,
        person_name: formData.person_name,
        person_cin: formData.person_cin,
        notes: formData.notes,
        created_at: new Date().toISOString()
      }

      setCheques([...cheques, newCheque])
      setShowCreateDialog(false)
      resetForm()
    } catch (error) {
      console.error('Error creating cheque:', error)
    }
  }

  const handleEdit = async () => {
    if (!selectedCheque) return

    try {
      const updatedCheques = cheques.map(cheque =>
        cheque.id === selectedCheque.id
          ? { ...cheque, ...formData }
          : cheque
      )
      setCheques(updatedCheques)
      setShowEditDialog(false)
      setSelectedCheque(null)
      resetForm()
    } catch (error) {
      console.error('Error updating cheque:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce chèque ?')) return

    try {
      setCheques(cheques.filter(cheque => cheque.id !== id))
    } catch (error) {
      console.error('Error deleting cheque:', error)
    }
  }

  const updateStatus = async (id: number, status: Cheque['status']) => {
    try {
      const updatedCheques = cheques.map(cheque =>
        cheque.id === id ? { ...cheque, status } : cheque
      )
      setCheques(updatedCheques)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      reference: '',
      amount: 0,
      bank_name: '',
      account_number: '',
      issue_date: '',
      due_date: '',
      type: 'received',
      person_name: '',
      person_cin: '',
      notes: ''
    })
  }

  const openEditDialog = (cheque: Cheque) => {
    setSelectedCheque(cheque)
    setFormData({
      reference: cheque.reference,
      amount: cheque.amount,
      bank_name: cheque.bank_name || '',
      account_number: cheque.account_number || '',
      issue_date: cheque.issue_date,
      due_date: cheque.due_date,
      type: cheque.type,
      person_name: cheque.person_name,
      person_cin: cheque.person_cin,
      notes: cheque.notes || ''
    })
    setShowEditDialog(true)
  }

  const getDueSoonCheques = () => {
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    return cheques.filter(cheque => 
      cheque.status === 'pending' && 
      new Date(cheque.due_date) <= threeDaysFromNow
    )
  }

  const getStatusColor = (status: Cheque['status']) => {
    switch (status) {
      case 'pending': return 'destructive'
      case 'deposited': return 'secondary'
      case 'cleared': return 'default'
      case 'bounced': return 'destructive'
      case 'cancelled': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: Cheque['status']) => {
    switch (status) {
      case 'pending': return 'En attente'
      case 'deposited': return 'Déposé'
      case 'cleared': return 'Encaissé'
      case 'bounced': return 'Rejeté'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des chèques...</div>
        </CardContent>
      </Card>
    )
  }

  const dueSoonCheques = getDueSoonCheques()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Chèques</h1>
          <p className="text-muted-foreground">
            Gérez vos chèques reçus et émis avec alertes d'échéance
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Chèque
        </Button>
      </div>

      {/* Due Soon Alert */}
      {dueSoonCheques.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{dueSoonCheques.length} chèque(s)</strong> arrivent à échéance dans les 3 prochains jours !
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Chèques</p>
                <p className="text-2xl font-bold">{cheques.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Montant Total</p>
                <p className="text-2xl font-bold">
                  {formatPrice(cheques.reduce((sum, c) => sum + c.amount, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold">
                  {cheques.filter(c => c.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Échéance Proche</p>
                <p className="text-2xl font-bold">{dueSoonCheques.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cheques Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Chèques</CardTitle>
        </CardHeader>
        <CardContent>
          {cheques.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucun chèque trouvé</p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="mt-4"
              >
                Créer le premier chèque
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Référence</th>
                    <th className="text-left p-2">Nom de la Personne</th>
                    <th className="text-left p-2">CIN/ID</th>
                    <th className="text-left p-2">Montant</th>
                    <th className="text-left p-2">Banque</th>
                    <th className="text-left p-2">Date d'Échéance</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cheques.map((cheque) => {
                    const isOverdue = new Date(cheque.due_date) < new Date() && cheque.status === 'pending'
                    const isDueSoon = getDueSoonCheques().some(c => c.id === cheque.id)

                    return (
                      <tr key={cheque.id} className={`border-b hover:bg-muted/50 ${isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}`}>
                        <td className="p-2">
                          <div>
                            <p className="font-medium">{cheque.reference}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(cheque.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </td>
                        <td className="p-2">
                          <p className="font-medium">{cheque.person_name}</p>
                        </td>
                        <td className="p-2">
                          <p className="text-sm">{cheque.person_cin}</p>
                        </td>
                        <td className="p-2">
                          <span className="font-medium">
                            {formatPrice(cheque.amount)}
                          </span>
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="text-sm">{cheque.bank_name || '-'}</p>
                            {cheque.account_number && (
                              <p className="text-xs text-muted-foreground">{cheque.account_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <div>
                            <p className="text-sm">
                              {new Date(cheque.due_date).toLocaleDateString('fr-FR')}
                            </p>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                En retard
                              </Badge>
                            )}
                            {isDueSoon && !isOverdue && (
                              <Badge variant="secondary" className="text-xs">
                                Bientôt
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={cheque.type === 'received' ? 'default' : 'secondary'}>
                            {cheque.type === 'received' ? 'Reçu' : 'Émis'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Select
                            value={cheque.status}
                            onValueChange={(value: any) => updateStatus(cheque.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">En attente</SelectItem>
                              <SelectItem value="deposited">Déposé</SelectItem>
                              <SelectItem value="cleared">Encaissé</SelectItem>
                              <SelectItem value="bounced">Rejeté</SelectItem>
                              <SelectItem value="cancelled">Annulé</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(cheque)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(cheque.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau Chèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                placeholder="CHQ-001"
              />
            </div>
            <div>
              <Label htmlFor="person_name">Nom de la Personne *</Label>
              <Input
                id="person_name"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label htmlFor="person_cin">Numéro CIN/ID *</Label>
              <Input
                id="person_cin"
                value={formData.person_cin}
                onChange={(e) => setFormData({ ...formData, person_cin: e.target.value })}
                placeholder="AB123456"
              />
            </div>
            <div>
              <Label htmlFor="amount">Montant (DH) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="bank_name">Nom de la Banque</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Banque Populaire"
              />
            </div>
            <div>
              <Label htmlFor="account_number">Numéro de Compte</Label>
              <Input
                id="account_number"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                placeholder="123456789"
              />
            </div>
            <div>
              <Label htmlFor="issue_date">Date d'Émission *</Label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="due_date">Date d'Échéance *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Chèque Reçu</SelectItem>
                  <SelectItem value="issued">Chèque Émis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleCreate}
                disabled={!formData.person_name || !formData.person_cin || !formData.amount || !formData.issue_date || !formData.due_date}
              >
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
            <DialogTitle>Modifier Chèque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-person_name">Nom de la Personne *</Label>
              <Input
                id="edit-person_name"
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label htmlFor="edit-person_cin">Numéro CIN/ID *</Label>
              <Input
                id="edit-person_cin"
                value={formData.person_cin}
                onChange={(e) => setFormData({ ...formData, person_cin: e.target.value })}
                placeholder="AB123456"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount">Montant (DH) *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-due_date">Date d'Échéance *</Label>
              <Input
                id="edit-due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notes additionnelles"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleEdit} disabled={!formData.person_name || !formData.person_cin}>
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
