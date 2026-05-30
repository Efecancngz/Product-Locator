import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalItems: number
    itemsPerPage: number
    onPageChange: (page: number) => void
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange
}: PaginationProps) {
    if (totalPages <= 1) return null

    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    // Generate page numbers to show
    const getPageNumbers = (): (number | string)[] => {
        const pages: (number | string)[] = []
        const maxVisible = 5

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i)
                pages.push('...')
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                pages.push(1)
                pages.push('...')
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
            } else {
                pages.push(1)
                pages.push('...')
                pages.push(currentPage - 1)
                pages.push(currentPage)
                pages.push(currentPage + 1)
                pages.push('...')
                pages.push(totalPages)
            }
        }

        return pages
    }

    return (
        <div className="flex items-center justify-between px-4 py-4 border-t bg-white rounded-b-xl">
            <div className="text-sm text-gray-600">
                <span className="font-medium">{startItem}-{endItem}</span> / {totalItems} ürün
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {getPageNumbers().map((page, idx) => (
                    typeof page === 'number' ? (
                        <Button
                            key={idx}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => onPageChange(page)}
                            className="h-8 w-8 p-0"
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={idx} className="px-1 text-gray-400">...</span>
                    )
                ))}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

// Helper hook for pagination logic
export function usePagination<T>(items: T[], itemsPerPage: number = 9) {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(items.length / itemsPerPage)
    const paginatedItems = items.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset to page 1 when items change
    const resetPage = () => setCurrentPage(1)

    return {
        currentPage,
        totalPages,
        totalItems: items.length,
        paginatedItems,
        setCurrentPage,
        resetPage,
        itemsPerPage
    }
}
