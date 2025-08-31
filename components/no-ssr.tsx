'use client'

import { useEffect, useState } from 'react'

interface NoSSRProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * NoSSR component to prevent hydration mismatches
 * Useful for components that might be affected by browser extensions
 * or other client-side modifications
 */
export default function NoSSR({ children, fallback = null }: NoSSRProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
