"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function CashierLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login?stock=cashier")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p>Redirection vers l'interface de connexion caisse...</p>
      </div>
    </div>
  )
}
