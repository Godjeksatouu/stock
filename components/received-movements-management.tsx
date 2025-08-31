"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, AlertTriangle, Clock, FileText, Package, ArrowRightLeft, Download } from "lucide-react"
import { stockMovementsApi } from "@/lib/api"
import { formatPrice } from "@/lib/currency"
import { STOCK_MAPPING } from "@/lib/types"
import { formatDate, formatTime, formatDateTime } from "@/lib/date-utils"
import { downloadMovementInvoice } from "@/lib/pdf-generator"

interface ReceivedMovementsManagementProps {
  stockId: string
}

export default function ReceivedMovementsManagement({ stockId }: ReceivedMovementsManagementProps) {
  const [movements, setMovements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMovement, setSelectedMovement] = useState<any>(null)
  const [showClaimDialog, setShowClaimDialog] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')

  const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

  useEffect(() => {
    fetchData()
  }, [stockId])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch movements sent TO this library (received movements)
      const response = await stockMovementsApi.getReceived(stockId)
      if (response.success) {
        setMovements(response.data)
      }
    } catch (error) {
      console.error('Error fetching received movements:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMovementDetails = async (movementId: number) => {
    try {
      const response = await stockMovementsApi.getById(movementId)
      if (response.success) {
        setSelectedMovement(response.data)
      }
    } catch (error) {
      console.error('Error fetching movement details:', error)
      alert('Erreur lors du chargement des détails du mouvement')
    }
  }

  const handleConfirmMovement = async (movementId: number) => {
    try {
      const response = await stockMovementsApi.confirm(movementId, stockId)
      if (response.success) {
        fetchData()
        alert('Réception confirmée avec succès!')
      }
    } catch (error) {
      console.error('Error confirming movement:', error)
      alert('Erreur lors de la confirmation')
    }
  }

  const handleCreateClaim = async () => {
    try {
      if (!selectedMovement || !claimMessage.trim()) {
        alert('Veuillez saisir un message de réclamation')
        return
      }

      const response = await stockMovementsApi.claim(selectedMovement.id, claimMessage, stockId)
      if (response.success) {
        setShowClaimDialog(false)
        setSelectedMovement(null)
        setClaimMessage('')
        fetchData()
        alert('Réclamation envoyée avec succès!')
      }
    } catch (error) {
      console.error('Error creating claim:', error)
      alert('Erreur lors de l\'envoi de la réclamation')
    }
  }

  const handleDownloadInvoice = async (movement: any) => {
    try {
      // Fetch detailed movement data if not already available
      let movementData = movement
      if (!movement.items || movement.items.length === 0) {
        const response = await stockMovementsApi.getById(movement.id)
        if (response.success) {
          movementData = response.data
        }
      }

      const invoiceData = {
        movement_number: movementData.movement_number,
        created_at: movementData.created_at,
        from_stock_name: movementData.from_stock_name || 'Dépôt Général',
        to_stock_name: getStockName(stockId),
        recipient_name: movementData.recipient_name,
        total_amount: movementData.total_amount,
        notes: movementData.notes,
        items: movementData.items || []
      }

      downloadMovementInvoice(invoiceData)
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Erreur lors du téléchargement de la facture')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
      case 'confirmed':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Confirmé</Badge>
      case 'claimed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Réclamation</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStockName = (stockId: string) => {
    const stockNames = {
      'al-ouloum': 'Librairie Al Ouloum',
      'renaissance': 'Librairie La Renaissance',
      'gros': 'Dépôt Général'
    }
    return stockNames[stockId as keyof typeof stockNames] || stockId
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement des réceptions...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Réceptions</h1>
          <p className="text-muted-foreground">
            Gérez les mouvements de stock reçus du dépôt
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Réceptions</p>
                <p className="text-2xl font-bold">{movements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">En Attente</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Confirmées</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'confirmed').length}
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
                <p className="text-sm text-muted-foreground">Réclamations</p>
                <p className="text-2xl font-bold">
                  {movements.filter(m => m.status === 'claimed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Mouvements Reçus</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Aucune réception trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Numéro</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Responsable</th>
                    <th className="text-left p-2">Montant</th>
                    <th className="text-left p-2">Statut</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement: any) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <span className="font-mono text-sm">{movement.movement_number}</span>
                      </td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium">
                            {formatDate(movement.created_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(movement.created_at)}
                          </p>
                        </div>
                      </td>
                      <td className="p-2">
                        <span>{movement.recipient_name}</span>
                      </td>
                      <td className="p-2">
                        <span className="font-medium">
                          {formatPrice(movement.total_amount)}
                        </span>
                      </td>
                      <td className="p-2">
                        {getStatusBadge(movement.status)}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchMovementDetails(movement.id)}
                            title="Voir les détails"
                          >
                            <FileText className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadInvoice(movement)}
                            title="Télécharger la facture"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          {movement.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleConfirmMovement(movement.id)}
                                title="Confirmer la réception"
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirmer
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  await fetchMovementDetails(movement.id)
                                  setShowClaimDialog(true)
                                }}
                                title="Créer une réclamation"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Réclamation
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement Details Dialog */}
      {selectedMovement && !showClaimDialog && (
        <Dialog open={!!selectedMovement} onOpenChange={() => setSelectedMovement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Détails de la Réception {selectedMovement.movement_number}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provenance</Label>
                  <p className="font-medium">{selectedMovement.from_stock_name}</p>
                </div>
                <div>
                  <Label>Responsable</Label>
                  <p className="font-medium">{selectedMovement.recipient_name}</p>
                </div>
                <div>
                  <Label>Statut</Label>
                  {getStatusBadge(selectedMovement.status)}
                </div>
                <div>
                  <Label>Montant Total</Label>
                  <p className="font-medium">{formatPrice(selectedMovement.total_amount)}</p>
                </div>
              </div>

              <div>
                <Label>Produits</Label>
                <div className="mt-2 space-y-2">
                  {selectedMovement.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>{item.product_name} x{item.quantity}</span>
                      <span className="font-medium">{formatPrice(item.total_price)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMovement.status === 'claimed' && selectedMovement.claim_message && (
                <div>
                  <Label>Message de Réclamation</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800">{selectedMovement.claim_message}</p>
                    {selectedMovement.claim_date && (
                      <p className="text-xs text-red-600 mt-1">
                        {formatDateTime(selectedMovement.claim_date)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedMovement.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm">{selectedMovement.notes}</p>
                </div>
              )}

              {selectedMovement.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => handleConfirmMovement(selectedMovement.id)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmer la Réception
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowClaimDialog(true)
                    }}
                    className="flex-1"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Créer une Réclamation
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Claim Dialog */}
      <Dialog open={showClaimDialog} onOpenChange={setShowClaimDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une Réclamation</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Mouvement</Label>
              <p className="font-medium">{selectedMovement?.movement_number}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim-message">Message de Réclamation *</Label>
              <Textarea
                id="claim-message"
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                placeholder="Décrivez le problème avec cette réception..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowClaimDialog(false)
                  setClaimMessage('')
                }}
              >
                Annuler
              </Button>
              <Button
                variant="destructive"
                onClick={handleCreateClaim}
                disabled={!claimMessage.trim()}
              >
                Envoyer Réclamation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
