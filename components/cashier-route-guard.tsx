"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { STOCK_MAPPING } from "@/lib/types"

interface CashierRouteGuardProps {
  children: React.ReactNode
}

interface UserData {
  id: number
  email: string
  username: string
  role: 'admin' | 'caissier' | 'super_admin'
  stockId?: number
}

// Routes autorisées pour les caissiers
const CASHIER_ALLOWED_ROUTES = [
  '/cashier/',
  '/dashboard/stock/',  // Autorise l'accès aux pages de stock (incluant /cashier)
  '/api/products',
  '/api/sales',
  '/api/auth',
  '/api/direct-login',
  '/api/server-login'
]

// Routes spécifiquement interdites pour les caissiers (plus spécifiques)
const CASHIER_FORBIDDEN_ROUTES = [
  '/dashboard/super-admin',
  '/admin/',
  '/products/',
  '/stock/',
  '/clients/',
  '/suppliers/',
  '/purchases/',
  '/reports/',
  '/settings/',
  '/users/'
]

// Fonction pour vérifier si une route de dashboard est autorisée pour un caissier
function isCashierDashboardRouteAllowed(pathname: string): boolean {
  // Autoriser uniquement les routes de caisse dans le dashboard
  const cashierPattern = /^\/dashboard\/stock\/[^\/]+\/cashier/
  return cashierPattern.test(pathname)
}

export default function CashierRouteGuard({ children }: CashierRouteGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [isLoading, setIsLoading] = useState(false) // Start with false to avoid hydration mismatch
  const [isMounted, setIsMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Éviter l'hydratation mismatch
  useEffect(() => {
    setIsMounted(true)
    setIsLoading(true) // Set loading to true only after mounting
  }, [])

  useEffect(() => {
    if (!isMounted) return // Don't run until mounted

    const checkRouteAccess = async () => {
      try {
        console.log('🛡️ CashierRouteGuard: Checking route access for:', pathname)

        // Vérifier si on est côté client
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        const userData = localStorage.getItem("user")

        if (!userData || userData.trim() === '') {
          console.log('❌ No user data found')
          setIsLoading(false)
          return
        }

        const user: UserData = JSON.parse(userData)
        console.log('👤 User role:', user.role)

        // Si l'utilisateur n'est pas un caissier, autoriser l'accès
        if (user.role !== 'caissier') {
          console.log('✅ Non-cashier user, access granted')
          setIsAuthorized(true)
          setIsLoading(false)
          return
        }

        // Pour les caissiers, vérifier les routes autorisées
        console.log('👤 Cashier detected, checking route permissions...')

        // Vérifier si la route est explicitement interdite
        const isForbiddenRoute = CASHIER_FORBIDDEN_ROUTES.some(route =>
          pathname.startsWith(route)
        )

        if (isForbiddenRoute) {
          console.log('❌ Cashier access denied to forbidden route:', pathname)

          // Rediriger silencieusement vers la caisse du stock du caissier
          const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
          const stockKey = stockEntry ? stockEntry[0] : 'al-ouloum'

          router.replace(`/dashboard/stock/${stockKey}/cashier`)
          return
        }

        // Vérifier si c'est une route de dashboard
        if (pathname.startsWith('/dashboard/')) {
          // Pour les routes de dashboard, vérifier si c'est une route de caisse autorisée
          if (!isCashierDashboardRouteAllowed(pathname)) {
            console.log('❌ Cashier access denied to dashboard route:', pathname)

            // Rediriger silencieusement vers la caisse du stock du caissier
            const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
            const stockKey = stockEntry ? stockEntry[0] : 'al-ouloum'

            router.replace(`/dashboard/stock/${stockKey}/cashier`)
            return
          }
        }

        // Vérifier si la route est autorisée pour les caissiers
        const isAllowedRoute = CASHIER_ALLOWED_ROUTES.some(route =>
          pathname.startsWith(route)
        ) || pathname === '/' // Page d'accueil autorisée

        if (!isAllowedRoute) {
          console.log('❌ Cashier access denied to unauthorized route:', pathname)

          // Rediriger silencieusement vers la caisse du stock du caissier
          const stockEntry = Object.entries(STOCK_MAPPING).find(([_, id]) => id === user.stockId)
          const stockKey = stockEntry ? stockEntry[0] : 'al-ouloum'

          router.replace(`/dashboard/stock/${stockKey}/cashier`)
          return
        }

        // Si on arrive ici, l'accès est autorisé
        console.log('✅ Cashier access granted to route:', pathname)
        setIsAuthorized(true)

      } catch (error) {
        console.error('❌ CashierRouteGuard error:', error)
        setError('Erreur de vérification des permissions')
      } finally {
        setIsLoading(false)
      }
    }

    checkRouteAccess()
  }, [pathname, router, isMounted])

  // Always render children first to avoid hydration mismatch
  // The loading state will only show after client-side hydration
  if (!isMounted) {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Vérification des permissions...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}

// Hook pour vérifier si une route est autorisée pour un caissier
export function useIsCashierRouteAllowed(route: string): boolean {
  const [isAllowed, setIsAllowed] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') {
      return
    }

    const userData = localStorage.getItem("user")
    if (userData) {
      try {
        const user: UserData = JSON.parse(userData)

        if (user.role === 'caissier') {
          const isForbidden = CASHIER_FORBIDDEN_ROUTES.some(forbiddenRoute =>
            route.startsWith(forbiddenRoute)
          )

          const isAllowedRoute = CASHIER_ALLOWED_ROUTES.some(allowedRoute =>
            route.startsWith(allowedRoute)
          ) || route === '/'

          setIsAllowed(!isForbidden && isAllowedRoute)
        } else {
          setIsAllowed(true) // Non-cashiers have access to all routes
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        setIsAllowed(false)
      }
    }
  }, [route, isMounted])

  return isAllowed
}
