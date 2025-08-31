'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { STOCK_MAPPING } from '@/lib/types'
import SalesManagement from '@/components/sales-management'

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId: number | null
}

export default function SalesPage() {
  const params = useParams()
  const router = useRouter()
  const stockId = params.stockId as string
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('🔍 SalesPage: Starting auth check for', stockId)

    const userData = localStorage.getItem("user")

    if (!userData || userData.trim() === '') {
      console.log('❌ No user data found, redirecting to home')
      router.push('/')
      return
    }

    try {
      const parsedUser: UserData = JSON.parse(userData)
      console.log('👤 User data:', parsedUser)

      // Check role access - allow admin, caissier, and super_admin
      const allowedRoles = ['admin', 'caissier', 'super_admin']
      if (!allowedRoles.includes(parsedUser.role)) {
        console.log('❌ Role not allowed:', parsedUser.role)
        router.push('/')
        return
      }

      // Check stock access (except for super_admin)
      if (parsedUser.role !== 'super_admin') {
        const requiredStockDbId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

        if (parsedUser.stockId !== requiredStockDbId) {
          console.log('❌ Stock access denied:', {
            userStockId: parsedUser.stockId,
            requiredStockDbId,
            stockId
          })
          // Redirect to user's stock
          const userStockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === parsedUser.stockId)
          const userStockKey = userStockEntry ? userStockEntry[0] : 'al-ouloum'
          router.push(`/dashboard/stock/${userStockKey}/sales`)
          return
        }
      }

      console.log('✅ Access granted to sales page')
      setUser(parsedUser)

    } catch (error) {
      console.error('❌ Auth error:', error)
      localStorage.removeItem('user')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }, [router, stockId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès non autorisé</h1>
          <p className="text-gray-600">Vous devez être connecté pour accéder à cette page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <SalesManagement stockId={stockId} />
    </div>
  )
}
