"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import EnhancedSidebar from "@/components/enhanced-sidebar"
import CaissierLayout from "@/components/caissier-layout"
import { STOCK_MAPPING } from "@/lib/types"

export default function StockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const stockId = params.stockId as string
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }

    const parsedUser = JSON.parse(userData)

    // Allow super admin to access any stock dashboard
    if (parsedUser.role === "super_admin") {
      // Super admin can access any stock
      setUser(parsedUser)
      setLoading(false)
      return
    }

    // Regular admin and caissier must match their assigned stock
    // Convert stockId slug to numeric ID for comparison
    const expectedStockId = STOCK_MAPPING[stockId as keyof typeof STOCK_MAPPING]

    console.log('🔍 Stock access check:', {
      userRole: parsedUser.role,
      userStockId: parsedUser.stockId,
      urlStockId: stockId,
      expectedStockId,
      isValidRole: parsedUser.role === "admin" || parsedUser.role === "caissier",
      stockMatches: parsedUser.stockId === expectedStockId
    })

    if ((parsedUser.role !== "admin" && parsedUser.role !== "caissier") || parsedUser.stockId !== expectedStockId) {
      console.log('❌ Access denied - redirecting to home')
      router.push("/")
      return
    }

    setUser(parsedUser)
    setLoading(false)
  }, [router, stockId])

  const handleLogout = () => {
    // Check if this is a super admin viewing a stock
    const superAdminContext = localStorage.getItem('superadmin_context')
    if (superAdminContext && user?.role === 'super_admin') {
      // Return to super admin dashboard
      localStorage.removeItem('superadmin_context')
      router.push('/dashboard/super-admin')
    } else {
      // Regular logout
      localStorage.removeItem("user")
      localStorage.removeItem('superadmin_context')
      router.push("/")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" suppressHydrationWarning>
        <div className="text-center" suppressHydrationWarning>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" suppressHydrationWarning></div>
          <p className="mt-2 text-gray-600" suppressHydrationWarning>Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Caissier gets a simplified layout
  if (user.role === "caissier") {
    return (
      <CaissierLayout stockId={stockId}>
        {children}
      </CaissierLayout>
    )
  }

  // Admin and super_admin get the full sidebar layout
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <EnhancedSidebar
          stockId={stockId}
          userRole={user.role}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
