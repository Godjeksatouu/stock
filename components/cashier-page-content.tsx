"use client"

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import CashierSystem from '@/components/cashier-system'
import { STOCK_MAPPING } from '@/lib/types'

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId: number | null
}

export default function CashierPageContent() {
  const params = useParams()
  const router = useRouter()
  const stockId = params.stockId as string
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 CashierPageContent: Starting auth check for', stockId)
        
        // Petit délai pour s'assurer que le DOM est prêt
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const userData = localStorage.getItem("user")
        
        if (!userData || userData.trim() === '') {
          console.log('❌ No user data found, redirecting to home')
          router.replace('/')
          return
        }

        const user: UserData = JSON.parse(userData)
        console.log('👤 User data:', user)

        // Check role
        const allowedRoles = ['admin', 'caissier', 'super_admin']
        if (!allowedRoles.includes(user.role)) {
          console.log('❌ Role not allowed:', user.role)
          router.replace('/')
          return
        }

        // Check stock access
        if (user.role !== 'super_admin') {
          const requiredStockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
          
          if (user.stockId !== requiredStockDbId) {
            console.log('❌ Stock access denied:', {
              userStockId: user.stockId,
              requiredStockDbId,
              stockId
            })
            // Rediriger vers le stock de l'utilisateur
            const userStockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
            const userStockKey = userStockEntry ? userStockEntry[0] : 'al-ouloum'
            router.replace(`/dashboard/stock/${userStockKey}/cashier`)
            return
          }
        }

        console.log('✅ Access granted')
        setIsAuthorized(true)
        
      } catch (error) {
        console.error('❌ Auth error:', error)
        localStorage.removeItem('user')
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [stockId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Vérification des autorisations...</p>
          <p className="mt-2 text-gray-500 text-sm">Stock: {stockId}</p>
        </div>
      </div>
    )
  }



  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-gray-400 text-lg">Redirection en cours...</div>
        </div>
      </div>
    )
  }

  return <CashierSystem stockId={stockId} />
}
