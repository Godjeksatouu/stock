"use client"

import { useParams } from 'next/navigation'
import StockStatistics from '@/components/stock-statistics'

export default function StatisticsPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <StockStatistics stockId={stockId} />
}
