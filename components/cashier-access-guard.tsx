"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { STOCK_MAPPING } from "@/lib/types"

interface CashierAccessGuardProps {
  children: React.ReactNode
  stockId: string
}

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId?: number
}

export default function CashierAccessGuard({ children, stockId }: CashierAccessGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkCashierAccess = async () => {
      try {
        console.log('🔐 CashierAccessGuard: Checking access for stock:', stockId)
        
        const userData = localStorage.getItem("user")
        
        if (!userData || userData.trim() === '') {
          console.log('❌ No user data found, redirecting to home')
          router.replace('/')
          return
        }

        const user: UserData = JSON.parse(userData)
        console.log('👤 User data:', user)

        // 1. Check if user has caissier role
        if (user.role === 'caissier') {
          console.log('👤 User is a caissier, checking stock access...')
          
          // 2. Check if caissier has access to this specific stock
          const requiredStockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
          
          if (user.stockId !== requiredStockDbId) {
            console.log('❌ Caissier stock access denied:', {
              userStockId: user.stockId,
              requiredStockDbId,
              stockId
            })
            // Rediriger silencieusement vers le stock du caissier
            const userStockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
            const userStockKey = userStockEntry ? userStockEntry[0] : 'al-ouloum'
            router.replace(`/dashboard/stock/${userStockKey}/cashier`)
            return
          }
          
          console.log('✅ Caissier access granted to stock:', stockId)
          setIsAuthorized(true)
          
        } else if (user.role === 'admin' || user.role === 'super_admin') {
          console.log('👤 User is admin/super_admin, checking stock access...')
          
          // 3. For admins, check stock access (super_admin has access to all)
          if (user.role === 'super_admin') {
            console.log('✅ Super admin access granted')
            setIsAuthorized(true)
          } else {
            // Regular admin - check stock access
            const requiredStockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]
            
            if (user.stockId !== requiredStockDbId) {
              console.log('❌ Admin stock access denied:', {
                userStockId: user.stockId,
                requiredStockDbId,
                stockId
              })
              // Rediriger silencieusement vers le stock de l'admin
              const userStockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
              const userStockKey = userStockEntry ? userStockEntry[0] : 'al-ouloum'
              router.replace(`/dashboard/stock/${userStockKey}`)
              return
            }
            
            console.log('✅ Admin access granted to stock:', stockId)
            setIsAuthorized(true)
          }
        } else {
          console.log('❌ Invalid role:', user.role)
          router.replace('/')
          return
        }
        
      } catch (error) {
        console.error('❌ CashierAccessGuard error:', error)
        localStorage.removeItem('user')
        router.replace('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkCashierAccess()
  }, [stockId, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Vérification des permissions caissier...</p>
        </div>
      </div>
    )
  }



  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

// Hook pour vérifier si l'utilisateur actuel est un caissier
export function useIsCashier(): boolean {
  const [isCashier, setIsCashier] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user: UserData = JSON.parse(userData)
        setIsCashier(user.role === 'caissier')
      } catch (error) {
        console.error('Error parsing user data:', error)
        setIsCashier(false)
      }
    }
  }, [])

  return isCashier
}

// Hook pour obtenir les informations du stock du caissier
export function useCashierStock(): { stockId: number | null; stockName: string | null } {
  const [stockInfo, setStockInfo] = useState<{ stockId: number | null; stockName: string | null }>({
    stockId: null,
    stockName: null
  })

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user: UserData = JSON.parse(userData)
        if (user.role === 'caissier' && user.stockId) {
          // Trouver le nom du stock basé sur l'ID
          const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
          const stockName = stockEntry ? stockEntry[0] : null
          
          setStockInfo({
            stockId: user.stockId,
            stockName: stockName
          })
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  return stockInfo
}
