"use client"

import { useParams } from 'next/navigation'
import ProductManagement from '@/components/product-management'
import RoleGuard from '@/components/role-guard'

export default function ProductsPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return (
    <RoleGuard
      allowedRoles={['admin', 'super_admin']}
      requiredStockId={stockId}
    >
      <ProductManagement stockId={stockId} />
    </RoleGuard>
  )
}
