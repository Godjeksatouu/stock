'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle, CheckCircle, Trash2, Eye } from 'lucide-react'

interface DuplicateGroup {
  name: string
  duplicate_count: number
  product_ids: string
  references: string
  prices: string
  created_dates: string
}

interface CleanupPlan {
  name: string
  duplicateCount: number
  keepId: number
  deleteIds: number[]
  totalSales: number
  totalRevenue: number
  salesDetails: any[]
}

interface DuplicatesData {
  duplicates: DuplicateGroup[]
  cleanupPlan: CleanupPlan[]
  totalGroups: number
  totalToDelete: number
  salesImpact: any
}

export default function DuplicatesPage() {
  const [data, setData] = useState<DuplicatesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cleaning, setCleaning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDuplicates = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/products/duplicates')
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la récupération des doublons')
      }
      
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const cleanDuplicates = async (dryRun: boolean = true) => {
    if (!data?.cleanupPlan) return
    
    try {
      setCleaning(true)
      setError(null)
      
      const response = await fetch('/api/products/duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cleanupPlan: data.cleanupPlan,
          dryRun
        })
      })
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erreur lors du nettoyage')
      }
      
      setResults(result.data)
      
      if (!dryRun) {
        // Recharger les données après le nettoyage réel
        await fetchDuplicates()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setCleaning(false)
    }
  }

  useEffect(() => {
    fetchDuplicates()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Recherche des doublons...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchDuplicates} className="mt-4">
          Réessayer
        </Button>
      </div>
    )
  }

  if (!data || data.totalGroups === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Aucun doublon trouvé
            </CardTitle>
            <CardDescription>
              Votre base de données ne contient aucun produit en double.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchDuplicates}>
              Vérifier à nouveau
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion des doublons</h1>
          <p className="text-muted-foreground">
            {data.totalGroups} groupe(s) de doublons trouvé(s) - {data.totalToDelete} produit(s) à supprimer
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDuplicates} variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button 
            onClick={() => cleanDuplicates(true)} 
            disabled={cleaning}
            variant="secondary"
          >
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simuler le nettoyage
          </Button>
          <Button 
            onClick={() => cleanDuplicates(false)} 
            disabled={cleaning}
            variant="destructive"
          >
            {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Nettoyer maintenant
          </Button>
        </div>
      </div>

      {results && (
        <Alert className={results.dryRun ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{results.dryRun ? 'Simulation terminée' : 'Nettoyage terminé'}</strong>
            <br />
            {results.totalProcessed} groupe(s) traité(s)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {data.cleanupPlan.map((plan, index) => (
          <Card key={index}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <Badge variant="destructive">
                  {plan.duplicateCount} doublons
                </Badge>
              </div>
              <CardDescription>
                {plan.totalSales > 0 ? (
                  <>
                    {plan.totalSales} vente(s) - {plan.totalRevenue.toFixed(2)}€ de CA
                  </>
                ) : (
                  'Aucune vente associée'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Garder ID: {plan.keepId}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    (Produit avec le plus de ventes ou le plus ancien)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    Supprimer IDs: {plan.deleteIds.join(', ')}
                  </Badge>
                </div>
                {plan.salesDetails.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Détails des ventes par produit :</h4>
                    <div className="space-y-1">
                      {plan.salesDetails.map((sale, idx) => (
                        <div key={idx} className="text-xs flex justify-between">
                          <span>ID {sale.product_id}:</span>
                          <span>{sale.sales_count} vente(s) - {sale.total_revenue.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {results && results.results && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats détaillés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.results.map((result: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{result.productName}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.action}
                    </Badge>
                    {result.message && (
                      <span className="text-xs text-muted-foreground">{result.message}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
