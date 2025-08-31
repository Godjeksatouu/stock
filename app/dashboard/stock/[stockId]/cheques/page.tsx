"use client"

import { useParams } from 'next/navigation'
import ChequesManagement from '@/components/cheques-management'

export default function ChequesPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <ChequesManagement stockId={stockId} />
}
