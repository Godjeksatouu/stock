import { Suspense } from 'react'
import POSSystem from '@/components/pos-system'

interface CaissePageProps {
  params: {
    stockId: string
  }
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Chargement de la Caisse</h2>
        <p className="text-sm text-gray-600">Initialisation du système POS...</p>
      </div>
    </div>
  )
}

export default function CaissePage({ params }: CaissePageProps) {
  // Validate params
  if (!params?.stockId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Paramètre Manquant</h2>
          <p className="text-sm text-gray-600">L'identifiant du stock est requis.</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Retour au Dashboard
          </button>
        </div>
      </div>
    )
  }

  const validStockIds = ['al-ouloum', 'renaissance', 'gros']
  if (!validStockIds.includes(params.stockId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Stock Invalide</h2>
          <p className="text-sm text-gray-600">
            Le stock "{params.stockId}" n'est pas reconnu.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Retour au Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <POSSystem stockId={params.stockId} />
      </Suspense>
    </div>
  )
}
