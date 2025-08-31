"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { STOCK_MAPPING } from "@/lib/types"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: ('admin' | 'caissier' | 'super_admin')[]
  requiredStockId?: string
  fallbackPath?: string
}

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId?: string
}

export default function RoleGuard({ 
  children, 
  allowedRoles, 
  requiredStockId,
  fallbackPath = "/" 
}: RoleGuardProps) {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Éviter les problèmes d'hydratation en attendant le montage côté client
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return // Attendre le montage côté client

    console.log('🛡️ RoleGuard: Starting access check', { allowedRoles, requiredStockId })

    const userData = localStorage.getItem("user")

    if (!userData || userData.trim() === '') {
      console.log('❌ RoleGuard: No user data found, redirecting to', fallbackPath)
      router.push(fallbackPath)
      return
    }

    try {
      const parsedUser: UserData = JSON.parse(userData)
      console.log('👤 RoleGuard: User data parsed', parsedUser)
      setUser(parsedUser)

      // Check role access
      if (!allowedRoles.includes(parsedUser.role)) {
        console.warn(`❌ RoleGuard: Access denied - User role ${parsedUser.role} not in allowed roles:`, allowedRoles)
        router.push(fallbackPath)
        return
      }

      console.log('✅ RoleGuard: Role check passed', { userRole: parsedUser.role, allowedRoles })

      // Check stock access for non-super-admin users
      if (requiredStockId && parsedUser.role !== 'super_admin') {
        // Convert requiredStockId (string like "renaissance") to database ID (number like 2)
        const requiredStockDbId = STOCK_MAPPING[requiredStockId as keyof typeof STOCK_MAPPING]

        console.log('🔍 Stock access check:', {
          userStockId: parsedUser.stockId,
          requiredStockId,
          requiredStockDbId,
          userRole: parsedUser.role
        })

        if (parsedUser.stockId !== requiredStockDbId) {
          console.warn(`❌ RoleGuard: Stock access denied - User stock ${parsedUser.stockId} does not match required ${requiredStockDbId} (${requiredStockId})`)
          router.push(fallbackPath)
          return
        }

        console.log('✅ RoleGuard: Stock access check passed', { userStockId: parsedUser.stockId, requiredStockDbId })
      }

      console.log('🎉 RoleGuard: All checks passed, authorizing access')
      setHasAccess(true)
    } catch (error) {
      console.error('❌ RoleGuard: Error parsing user data:', error)
      // Clear corrupted localStorage
      localStorage.removeItem('user')
      router.push(fallbackPath)
    } finally {
      setLoading(false)
    }
  }, [mounted, router, allowedRoles, requiredStockId, fallbackPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}

// Helper hook to get current user data
export function useCurrentUser() {
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  return user
}

// Helper function to check if user has specific role
export function hasRole(requiredRoles: ('admin' | 'caissier' | 'super_admin')[]): boolean {
  const userData = localStorage.getItem("user")
  if (!userData) return false

  try {
    const user: UserData = JSON.parse(userData)
    return requiredRoles.includes(user.role)
  } catch {
    return false
  }
}

// Helper function to check if user can access specific stock
export function canAccessStock(stockId: string): boolean {
  const userData = localStorage.getItem("user")
  if (!userData) return false

  try {
    const user: UserData = JSON.parse(userData)

    // Super admin can access any stock
    if (user.role === 'super_admin') return true

    // Convert stockId (string like "renaissance") to database ID (number like 2)
    const stockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

    // Other roles must match their assigned stock
    return user.stockId === stockDbId
  } catch {
    return false
  }
}
