"use client"

import { useParams } from 'next/navigation'
import StockMovementManagement from '@/components/stock-movement-management'
import RoleGuard from '@/components/role-guard'

export default function StockMovementPage() {
  const params = useParams()
  const stockId = params.stockId as string

  // Only allow depot (gros) to access this page
  if (stockId !== 'gros') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès Restreint
          </h2>
          <p className="text-gray-600">
            Les mouvements de stock ne sont disponibles que pour le dépôt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard 
      allowedRoles={['admin', 'super_admin']}
      requiredStockId={stockId}
    >
      <StockMovementManagement stockId={stockId} />
    </RoleGuard>
  )
}
