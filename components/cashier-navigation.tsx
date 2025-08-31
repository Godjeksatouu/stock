"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { STOCK_MAPPING } from "@/lib/types"

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId?: number
}

interface CashierNavigationProps {
  currentStockId?: string
}

export default function CashierNavigation({ currentStockId }: CashierNavigationProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [stockName, setStockName] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const parsedUser: UserData = JSON.parse(userData)
        setUser(parsedUser)
        
        // Déterminer le nom du stock
        if (parsedUser.stockId) {
          const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === parsedUser.stockId)
          if (stockEntry) {
            const stockKey = stockEntry[0]
            const stockNames = {
              'al-ouloum': 'Librairie Al Ouloum',
              'renaissance': 'Librairie La Renaissance',
              'gros': 'Dépôt Gros'
            }
            setStockName(stockNames[stockKey as keyof typeof stockNames] || stockKey)
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/')
  }

  const getCashierStockUrl = () => {
    if (user?.stockId) {
      const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
      if (stockEntry) {
        return `/cashier/${stockEntry[0]}`
      }
    }
    return '/cashier/al-ouloum'
  }

  if (!user) {
    return null
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">
                {user.role === 'caissier' ? '💰 Caisse' : '🏪 Gestion'}
              </h1>
            </div>
            
            {user.role === 'caissier' && (
              <div className="ml-6">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  📍 {stockName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Navigation pour caissiers - uniquement caisse */}
            {user.role === 'caissier' && (
              <div className="flex space-x-2">
                <Link href={getCashierStockUrl()}>
                  <Button 
                    variant={currentStockId ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    💰 Ma Caisse
                  </Button>
                </Link>
              </div>
            )}

            {/* Navigation pour admins - accès complet */}
            {(user.role === 'admin' || user.role === 'super_admin') && (
              <div className="flex space-x-2">
                <Link href={getCashierStockUrl()}>
                  <Button variant="outline" size="sm">
                    💰 Caisse
                  </Button>
                </Link>
                
                {user.role === 'super_admin' && (
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm">
                      📊 Dashboard
                    </Button>
                  </Link>
                )}
                
                {user.stockId && (
                  <Link href={`/dashboard/stock/${Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)?.[0] || 'al-ouloum'}`}>
                    <Button variant="outline" size="sm">
                      📦 Mon Stock
                    </Button>
                  </Link>
                )}
              </div>
            )}

            {/* Informations utilisateur */}
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user.username}</span>
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {user.role === 'caissier' ? '💰 Caissier' : 
                   user.role === 'admin' ? '👤 Admin' : 
                   '👑 Super Admin'}
                </span>
              </div>
              
              <Button 
                onClick={handleLogout}
                variant="outline" 
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                🚪 Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

// Composant d'alerte pour les caissiers qui tentent d'accéder à des sections interdites
export function CashierAccessAlert() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Accès Restreint
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            En tant que caissier, vous avez uniquement accès à la section caisse de votre stock.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Astuce:</strong> Utilisez le bouton "Ma Caisse" dans la navigation pour accéder à votre interface de caisse.
            </p>
          </div>
          
          <Link href="/">
            <Button className="w-full">
              🏠 Retour à l'accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
