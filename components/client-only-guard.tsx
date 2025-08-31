"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { STOCK_MAPPING } from "@/lib/types"

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId: number | null
}

interface ClientOnlyGuardProps {
  children: React.ReactNode
  allowedRoles: Array<'admin' | 'caissier' | 'super_admin'>
  requiredStockId?: string
  fallbackPath?: string
}

export default function ClientOnlyGuard({ 
  children, 
  allowedRoles, 
  requiredStockId, 
  fallbackPath = "/" 
}: ClientOnlyGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Cette fonction s'exécute uniquement côté client
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem("user")
        
        if (!userData || userData.trim() === '') {
          console.log('❌ ClientOnlyGuard: No user data, redirecting to', fallbackPath)
          router.push(fallbackPath)
          return
        }

        const user: UserData = JSON.parse(userData)
        console.log('👤 ClientOnlyGuard: User data:', user)

        // Check role
        if (!allowedRoles.includes(user.role)) {
          console.log('❌ ClientOnlyGuard: Role not allowed', { userRole: user.role, allowedRoles })
          router.push(fallbackPath)
          return
        }

        // Check stock access
        if (requiredStockId && user.role !== 'super_admin') {
          const requiredStockDbId = STOCK_MAPPING[requiredStockId as keyof typeof STOCK_MAPPING]
          
          if (user.stockId !== requiredStockDbId) {
            console.log('❌ ClientOnlyGuard: Stock access denied', { 
              userStockId: user.stockId, 
              requiredStockDbId,
              requiredStockId 
            })
            router.push(fallbackPath)
            return
          }
        }

        console.log('✅ ClientOnlyGuard: Access granted')
        setIsAuthorized(true)
        
      } catch (error) {
        console.error('❌ ClientOnlyGuard: Error:', error)
        localStorage.removeItem('user')
        router.push(fallbackPath)
      } finally {
        setIsLoading(false)
      }
    }

    // Petit délai pour s'assurer que le composant est monté
    const timer = setTimeout(checkAuth, 100)
    
    return () => clearTimeout(timer)
  }, [allowedRoles, requiredStockId, fallbackPath, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification des autorisations...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
