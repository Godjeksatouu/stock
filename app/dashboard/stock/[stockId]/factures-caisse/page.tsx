import { Suspense } from 'react'
import FacturesCaisseManagement from '@/components/factures-caisse-management'

interface FacturesCaissePageProps {
  params: Promise<{
    stockId: string
  }>
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Chargement des Factures Caisse</h2>
        <p className="text-sm text-gray-600">Récupération de l'historique des ventes caisse...</p>
      </div>
    </div>
  )
}

export default async function FacturesCaissePage({ params }: FacturesCaissePageProps) {
  const { stockId } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<LoadingFallback />}>
          <FacturesCaisseManagement stockId={stockId} />
        </Suspense>
      </div>
    </div>
  )
}
