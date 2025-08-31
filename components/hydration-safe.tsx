"use client"

import { useEffect, useState } from 'react'

interface HydrationSafeProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  suppressHydrationWarning?: boolean
}

/**
 * Component to prevent hydration mismatches by only rendering children on client-side
 * Also handles browser extension interference
 */
export default function HydrationSafe({
  children,
  fallback = null,
  suppressHydrationWarning = true
}: HydrationSafeProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // Add a small delay to ensure browser extensions have finished modifying the DOM
    const timer = setTimeout(() => {
      setIsClient(true)
    }, 10)

    return () => clearTimeout(timer)
  }, [])

  if (!isClient) {
    return <div suppressHydrationWarning={suppressHydrationWarning}>{fallback}</div>
  }

  return <div suppressHydrationWarning={suppressHydrationWarning}>{children}</div>
}

/**
 * Hook to check if we're on the client side
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}

/**
 * Higher-order component to wrap components that might have hydration issues
 */
export function withHydrationSafe<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function HydrationSafeWrapper(props: P) {
    return (
      <HydrationSafe fallback={fallback}>
        <Component {...props} />
      </HydrationSafe>
    )
  }
}
