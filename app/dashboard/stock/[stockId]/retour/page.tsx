import { Suspense } from 'react'
import RetourManagement from '@/components/retour-management'

interface RetourPageProps {
  params: Promise<{
    stockId: string
  }>
}

export default async function RetourPage({ params }: RetourPageProps) {
  const { stockId } = await params
  return (
    <div className="container mx-auto p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement...</p>
          </div>
        </div>
      }>
        <RetourManagement stockId={stockId} />
      </Suspense>
    </div>
  )
}
