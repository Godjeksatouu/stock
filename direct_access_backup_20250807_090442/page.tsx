"use client"

import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, ShoppingCart, BarChart3, Users, Truck, TrendingUp } from "lucide-react"
import StockStatistics from "@/components/stock-statistics"
import RoleGuard from "@/components/role-guard"

const stockNames = {
  "al-ouloum": "Librairie Al Ouloum",
  renaissance: "Librairie La Renaissance",
  gros: "Gros (Dépôt général)",
}

export default function StockDashboard() {
  const params = useParams()
  const router = useRouter()
  const stockId = params.stockId as string
  const stockName = stockNames[stockId as keyof typeof stockNames] || stockId

  const navigateTo = (path: string) => {
    router.push(`/dashboard/stock/${stockId}/${path}`)
  }

  return (
    <RoleGuard
      allowedRoles={['admin', 'super_admin']}
      requiredStockId={stockId}
    >
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{stockName}</h1>
        <p className="text-muted-foreground">
          Tableau de bord principal - Gérez tous les aspects de votre stock
        </p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('products')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Gestion des Produits</h3>
                <p className="text-sm text-muted-foreground">
                  Inventaire et catalogue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/dashboard/stock/renaissance/cashier')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Point de Vente</h3>
                <p className="text-sm text-muted-foreground">
                  Système de caisse
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('clients')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Clients</h3>
                <p className="text-sm text-muted-foreground">
                  Base de données clients
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('achats')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold">Fournisseurs</h3>
                <p className="text-sm text-muted-foreground">
                  Gestion des achats
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('statistiques')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold">Statistiques</h3>
                <p className="text-sm text-muted-foreground">
                  Analyses et rapports
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigateTo('gain-du-jour')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold">Gain du Jour</h3>
                <p className="text-sm text-muted-foreground">
                  Bénéfices quotidiens
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Aperçu des Performances</h2>
        <StockStatistics stockId={stockId} />
      </div>
      </div>
    </RoleGuard>
  )
}
