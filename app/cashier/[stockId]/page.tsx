"use client"

import { useParams } from 'next/navigation'
import { Suspense } from 'react'
import CashierAccessGuard from '@/components/cashier-access-guard'
import CashierNavigation from '@/components/cashier-navigation'
import CashierSystem from '@/components/cashier-system'

interface CashierPageProps {
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
        <p className="text-sm text-gray-600">Initialisation du système caissier...</p>
      </div>
    </div>
  )
}

export default function CashierPage() {
  const params = useParams()
  const stockId = params.stockId as string

  console.log('🏪 CashierPage: Loading for stock:', stockId)

  // Validation du stockId
  const validStockIds = ['al-ouloum', 'renaissance', 'gros']
  if (!validStockIds.includes(stockId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Stock Invalide</strong>
            <span className="block sm:inline mt-1">
              Le stock "{stockId}" n'est pas reconnu.
            </span>
          </div>
          <p className="text-gray-600 mb-4">
            Stocks disponibles : Al Ouloum, Renaissance, Gros
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <CashierAccessGuard stockId={stockId}>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation spécifique aux caissiers */}
        <CashierNavigation currentStockId={stockId} />
        
        {/* Contenu principal de la caisse */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Suspense fallback={<LoadingFallback />}>
            <div className="mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      Interface Caissier
                    </h3>
                    <p className="text-sm text-gray-600">
                      {stockId === 'al-ouloum' && 'Librairie Al Ouloum'}
                      {stockId === 'renaissance' && 'Librairie La Renaissance'}
                      {stockId === 'gros' && 'Dépôt Gros'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <CashierSystem stockId={stockId} />
          </Suspense>
        </div>
      </div>
    </CashierAccessGuard>
  )
}
