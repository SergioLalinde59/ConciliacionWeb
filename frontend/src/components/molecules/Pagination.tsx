import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalRecords?: number;
    pageSize?: number;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalRecords,
    pageSize
}: PaginationProps) {
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    // Calcular rango de registros mostrados
    const startRecord = totalRecords ? (currentPage - 1) * (pageSize || 50) + 1 : null;
    const endRecord = totalRecords ? Math.min(currentPage * (pageSize || 50), totalRecords) : null;

    // Generar números de página a mostrar
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxPagesToShow = 7; // Mostrar máximo 7 botones de números

        if (totalPages <= maxPagesToShow) {
            // Si hay pocas páginas, mostrar todas
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Siempre mostrar primera página
            pages.push(1);

            if (currentPage > 3) {
                pages.push('...');
            }

            // Páginas alrededor de la actual
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) {
                pages.push('...');
            }

            // Siempre mostrar última página
            pages.push(totalPages);
        }

        return pages;
    };

    if (totalPages <= 1) {
        // Si solo hay una página, no mostrar paginación
        return null;
    }

    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            {/* Info de registros */}
            {totalRecords && (
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700">
                            Mostrando{' '}
                            <span className="font-medium">{startRecord}</span>
                            {' '}a{' '}
                            <span className="font-medium">{endRecord}</span>
                            {' '}de{' '}
                            <span className="font-medium">{totalRecords}</span>
                            {' '}registros
                        </p>
                    </div>
                </div>
            )}

            {/* Controles de navegación */}
            <div className="flex flex-1 justify-between sm:justify-end gap-2">
                {/* Primera página */}
                <button
                    onClick={() => onPageChange(1)}
                    disabled={!canGoPrevious}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Primera página"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Página anterior */}
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrevious}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página anterior"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Números de página */}
                <div className="hidden sm:flex gap-1">
                    {getPageNumbers().map((page, index) => {
                        if (page === '...') {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700"
                                >
                                    ...
                                </span>
                            );
                        }

                        const pageNum = page as number;
                        const isActive = pageNum === currentPage;

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`relative inline-flex items-center rounded-md px-4 py-2 text-sm font-medium ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                {/* Página siguiente */}
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página siguiente"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>

                {/* Última página */}
                <button
                    onClick={() => onPageChange(totalPages)}
                    disabled={!canGoNext}
                    className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Última página"
                >
                    <ChevronsRight className="h-4 w-4" />
                </button>
            </div>

            {/* Info móvil */}
            <div className="flex sm:hidden">
                <p className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                </p>
            </div>
        </div>
    );
}
