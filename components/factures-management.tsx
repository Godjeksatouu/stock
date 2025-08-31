"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Download, Eye, Calendar, DollarSign, Users, FileText } from "lucide-react"
import { invoicesApi, salesApi, clientsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { Sale, Client, STOCK_MAPPING } from "@/lib/types"

interface FacturesManagementProps {
  stockId: string
}

export default function FacturesManagement({ stockId }: FacturesManagementProps) {
  const [factures, setFactures] = useState<any[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    sale_reference_id: ''
  })

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  useEffect(() => {
    fetchData()
  }, [stockId])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [facturesResponse, salesResponse, clientsResponse] = await Promise.all([
        invoicesApi.getAll(stockId),
        salesApi.getAll(stockId),
        clientsApi.getAll(stockId)
      ])

      if (facturesResponse.success) setFactures(facturesResponse.data)
      if (salesResponse.success) setSales(salesResponse.data)
      if (clientsResponse.success) setClients(clientsResponse.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.sale_reference_id) {
      alert("Veuillez sélectionner une vente")
      return
    }

    try {
      const response = await invoicesApi.create({
        reference_id: parseInt(formData.sale_reference_id),
        invoice_type: "sale",
        stock_id: stockDbId
      })

      if (response.success) {
        setShowCreateDialog(false)
        setFormData({ sale_reference_id: "" })
        fetchData()
        alert(`Facture ${response.data.invoice_number} créée avec succès !`)
      }
    } catch (error) {
      console.error("Error creating invoice:", error)
      alert("Erreur lors de la création de la facture")
    }
  }

  const generatePDF = (facture: any) => {
    console.log("Generating PDF for:", facture.invoice_number)
    alert("Fonctionnalité PDF en cours de développement")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Chargement des factures...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Factures</h1>
          <p className="text-muted-foreground">
            Gérez vos factures de vente et d'achat
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Facture
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Factures</p>
              <p className="text-2xl font-bold">{factures.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Montant Total</p>
              <p className="text-2xl font-bold">
                {formatPrice(
                  factures.reduce(
                    (sum, f) => sum + (f.total_amount || 0),
                    0
                  )
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm text-muted-foreground">Ce Mois</p>
              <p className="text-2xl font-bold">
                {factures.filter(f => {
                  const d = new Date(f.created_at)
                  const now = new Date()
                  return (
                    d.getMonth() === now.getMonth() &&
                    d.getFullYear() === now.getFullYear()
                  )
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Aujourd'hui</p>
              <p className="text-2xl font-bold">
                {factures.filter(f => {
                  const d = new Date(f.created_at)
                  const today = new Date()
                  return d.toDateString() === today.toDateString()
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Factures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Factures</CardTitle>
        </CardHeader>
        <CardContent>
          {factures.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune facture trouvée</p>
              <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                Créer la première facture
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="p-2 text-left">Numéro de Facture</th>
                    <th className="p-2 text-left">Vente Associée</th>
                    <th className="p-2 text-left">Date de Création</th>
                    <th className="p-2 text-left">Montant</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map(f => (
                    <tr key={f.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{f.invoice_number}</td>
                      <td className="p-2">
                        {f.sale_id ? (
                          <Badge variant="default">Vente #{f.sale_id}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Pas de vente
                          </span>
                        )}
                      </td>
                      <td className="p-2">{new Date(f.created_at).toLocaleDateString("fr-FR")}</td>
                      <td className="p-2">{formatPrice(f.total_amount || 0)}</td>
                      <td className="p-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => generatePDF(f)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            alert(
                              `Facture: ${f.invoice_number}\nVente: #${f.sale_id || "N/A"}\nMontant: ${formatPrice(f.total_amount || 0)}`
                            )
                          }
                        >
                          <Eye className="h-3 w-3" />
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

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle Facture</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sale">Vente à Facturer *</Label>
              <Select
                value={formData.sale_reference_id}
                onValueChange={v => setFormData({ ...formData, sale_reference_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une vente" />
                </SelectTrigger>
                <SelectContent>
                  {sales
                    .filter(s => !factures.some(f => f.reference_id === s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        Vente #{s.id} - {formatPrice(s.total)} ({new Date(s.created_at).toLocaleDateString("fr-FR")})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Seules les ventes sans facture sont affichées
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} disabled={!formData.sale_reference_id}>
                Créer la Facture
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
