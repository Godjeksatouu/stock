"use client"

import { useParams } from 'next/navigation'
import AchatsManagement from '@/components/achats-management'

export default function AchatsPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <AchatsManagement stockId={stockId} />
}
