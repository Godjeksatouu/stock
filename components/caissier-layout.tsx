"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, ShoppingCart, User, Building2 } from "lucide-react"
import { STOCK_MAPPING } from "@/lib/types"

interface CaissierLayoutProps {
  children: React.ReactNode
  stockId: string
}

const stockNames = {
  "al-ouloum": "Librairie Al Ouloum",
  "renaissance": "Librairie La Renaissance",
  "gros": "Gros (Dépôt général)",
}

export default function CaissierLayout({ children, stockId }: CaissierLayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Éviter les problèmes d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return // Attendre le montage côté client

    console.log('🏪 CaissierLayout: Starting access check', { stockId })

    const userData = localStorage.getItem("user")
    if (!userData || userData.trim() === '') {
      console.log('❌ CaissierLayout: No user data found, redirecting to home')
      router.push("/")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
    console.log('👤 CaissierLayout: User data parsed', parsedUser)

    // Only caissier role can use this layout
    if (parsedUser.role !== "caissier") {
      console.log('❌ CaissierLayout: User is not a caissier, redirecting to home', { userRole: parsedUser.role })
      router.push("/")
      return
    }

    // Caissier must match their assigned stock
    // Convert stockId string to number for comparison
    const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING];
    console.log('🔍 CaissierLayout: Stock access check', { userStockId: parsedUser.stockId, urlStockId: stockId, mappedStockId: stockDbId })

    if (parsedUser.stockId !== stockDbId) {
      console.log('❌ CaissierLayout: Stock ID mismatch, redirecting to home', { userStockId: parsedUser.stockId, urlStockId: stockId, mappedStockId: stockDbId });
      router.push("/")
      return
    }

      console.log('✅ CaissierLayout: All checks passed, setting user')
      setUser(parsedUser)
      setLoading(false)
    } catch (error) {
      console.error('❌ CaissierLayout: Error parsing user data:', error)
      // Clear corrupted localStorage
      localStorage.removeItem('user')
      router.push("/")
    }
  }, [mounted, router, stockId])

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const stockName = stockNames[stockId as keyof typeof stockNames] || stockId

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{stockName}</h1>
                  <p className="text-sm text-gray-600">Système de Caisse</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{user.username}</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Caissier
                </span>
              </div>
              
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-blue-900">Interface Caissier</h2>
                  <p className="text-sm text-blue-700">
                    Scannez les codes-barres, ajoutez des produits et confirmez les ventes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              <span>© 2024 Système de Gestion de Stock</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Version Caissier 1.0</span>
              <span>•</span>
              <span>Accès limité aux fonctions de vente</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
