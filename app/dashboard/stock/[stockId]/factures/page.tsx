"use client"

import { useParams } from 'next/navigation'
import FacturesManagement from '@/components/factures-management'

export default function FacturesPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <FacturesManagement stockId={stockId} />
}
