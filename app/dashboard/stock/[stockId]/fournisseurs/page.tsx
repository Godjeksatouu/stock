"use client"

import { useParams } from 'next/navigation'
import FournisseursManagement from '@/components/fournisseurs-management'

export default function FournisseursPage() {
  const params = useParams()
  const stockId = params.stockId as string

  return <FournisseursManagement stockId={stockId} />
}
