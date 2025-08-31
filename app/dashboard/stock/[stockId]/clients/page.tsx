"use client"

import { useParams } from 'next/navigation'
import ClientsManagement from '@/components/clients-management'

export default function ClientsPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <ClientsManagement stockId={stockId} />
}
