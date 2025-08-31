"use client"

import React from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, MoreHorizontal, Loader2 } from "lucide-react"

interface AdvancedPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
  loading?: boolean
  showItemsPerPage?: boolean
  itemsPerPageOptions?: number[]
  className?: string
  showInfo?: boolean
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
  showItemsPerPage = true,
  itemsPerPageOptions = [10, 25, 50, 100],
  className = "",
  showInfo = true
}: AdvancedPaginationProps) {
  
  // Calculate visible page numbers
  const getVisiblePages = () => {
    const delta = 2 // Number of pages to show on each side of current page
    const range = []
    const rangeWithDots = []

    // Always show first page
    if (totalPages > 0) {
      rangeWithDots.push(1)
    }

    // Add dots if there's a gap
    if (currentPage - delta > 2) {
      rangeWithDots.push('...')
    }

    // Add pages around current page
    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i)
    }

    rangeWithDots.push(...range)

    // Add dots if there's a gap before last page
    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...')
    }

    // Always show last page (if different from first)
    if (totalPages > 1) {
      rangeWithDots.push(totalPages)
    }

    // Remove duplicates
    return rangeWithDots.filter((page, index, arr) => 
      index === 0 || page !== arr[index - 1]
    )
  }

  const visiblePages = getVisiblePages()
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && !loading) {
      onPageChange(page)
    }
  }

  const handleItemsPerPageChange = (value: string) => {
    if (!loading) {
      onItemsPerPageChange(parseInt(value))
    }
  }

  if (totalItems === 0 && !showItemsPerPage) {
    return null
  }

  return (
    <div className={`flex flex-col lg:flex-row items-center justify-between gap-4 p-4 border-t bg-background ${className}`}>
      {/* Items per page selector */}
      {showItemsPerPage && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground whitespace-nowrap">Afficher</span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={handleItemsPerPageChange}
            disabled={loading}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={option.toString()}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground whitespace-nowrap">par page</span>
        </div>
      )}

      {/* Page info */}
      {showInfo && (
        <div className="text-sm text-muted-foreground text-center">
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Chargement...</span>
            </div>
          ) : totalItems > 0 ? (
            <>
              Affichage de <span className="font-medium text-foreground">{startItem}</span> à{' '}
              <span className="font-medium text-foreground">{endItem}</span> sur{' '}
              <span className="font-medium text-foreground">{totalItems}</span> résultats
            </>
          ) : (
            <span>Aucun résultat trouvé</span>
          )}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Previous button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="h-8 px-3 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Précédent</span>
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {visiblePages.map((page, index) => {
              if (page === '...') {
                return (
                  <div key={`dots-${index}`} className="flex h-8 w-8 items-center justify-center">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </div>
                )
              }

              const pageNumber = page as number
              const isCurrentPage = pageNumber === currentPage

              return (
                <Button
                  key={pageNumber}
                  variant={isCurrentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNumber)}
                  disabled={loading}
                  className={`h-8 w-8 p-0 ${isCurrentPage ? 'bg-primary text-primary-foreground' : ''}`}
                >
                  {pageNumber}
                </Button>
              )
            })}
          </div>

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || loading}
            className="h-8 px-3 gap-1"
          >
            <span className="hidden sm:inline">Suivant</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Hook for pagination state management
export function usePagination(initialItemsPerPage: number = 25) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(initialItemsPerPage)
  const [loading, setLoading] = React.useState(false)

  const handlePageChange = React.useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleItemsPerPageChange = React.useCallback((newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page when changing items per page
  }, [])

  const resetPagination = React.useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    currentPage,
    itemsPerPage,
    loading,
    setLoading,
    handlePageChange,
    handleItemsPerPageChange,
    resetPagination
  }
}

// Utility function to paginate data client-side
export function paginateData<T>(
  data: T[],
  currentPage: number,
  itemsPerPage: number
): {
  paginatedData: T[]
  totalPages: number
  totalItems: number
} {
  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = data.slice(startIndex, endIndex)

  return {
    paginatedData,
    totalPages,
    totalItems
  }
}

// Server-side pagination parameters
export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export function getPaginationParams(currentPage: number, itemsPerPage: number): PaginationParams {
  const page = Math.max(1, currentPage)
  const limit = Math.max(1, itemsPerPage)
  const offset = (page - 1) * limit

  return {
    page,
    limit,
    offset
  }
}
