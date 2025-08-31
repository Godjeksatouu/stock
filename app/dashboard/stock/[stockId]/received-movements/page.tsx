"use client"

import { useParams } from 'next/navigation'
import ReceivedMovementsManagement from '@/components/received-movements-management'
import RoleGuard from '@/components/role-guard'

export default function ReceivedMovementsPage() {
  const params = useParams()
  const stockId = params.stockId as string

  // Only allow libraries (not depot) to access this page
  if (stockId === 'gros') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Accès Restreint
          </h2>
          <p className="text-gray-600">
            Les réceptions ne sont disponibles que pour les librairies.
          </p>
        </div>
      </div>
    )
  }

  return (
    <RoleGuard 
      allowedRoles={['admin', 'caissier', 'super_admin']}
      requiredStockId={stockId}
    >
      <ReceivedMovementsManagement stockId={stockId} />
    </RoleGuard>
  )
}
