"use client"

import dynamic from 'next/dynamic'

// Import dynamique de TOUT le contenu pour éviter l'hydratation
const CashierPageContent = dynamic(() => import('@/components/cashier-page-content'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 text-lg">Chargement de l'interface caisse...</p>
      </div>
    </div>
  )
})

export default function CashierPage() {
  return <CashierPageContent />
}
