"use client"

import { useParams } from 'next/navigation'
import GainDuJourManagement from '@/components/gain-du-jour-management'

export default function GainDuJourPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <GainDuJourManagement stockId={stockId} />
}
