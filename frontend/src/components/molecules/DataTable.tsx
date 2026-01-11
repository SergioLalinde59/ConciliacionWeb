import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useState, useMemo } from 'react'

/**
 * Definición de una columna para DataTable
 */
export interface Column<T> {
    /** Clave única de la columna */
    key: string
    /** Título que se muestra en el header */
    header: string
    /** Función para extraer el valor a mostrar */
    accessor?: (row: T) => React.ReactNode
    /** Campo del objeto para ordenar (si es diferente de key) */
    sortKey?: keyof T
    /** Si la columna es ordenable */
    sortable?: boolean
    /** Ancho de la columna (ej: 'w-20', '120px') */
    width?: string
    /** Alineación del texto */
    align?: 'left' | 'center' | 'right'
    /** Clases CSS adicionales para la celda */
    cellClassName?: string
    /** Clases CSS adicionales para el header */
    headerClassName?: string
}

/**
 * Props para DataTable
 */
export interface DataTableProps<T> {
    /** Datos a mostrar */
    data: T[]
    /** Definición de columnas */
    columns: Column<T>[]
    /** Si está cargando los datos */
    loading?: boolean
    /** Mensaje cuando está cargando */
    loadingMessage?: string
    /** Mensaje cuando no hay datos */
    emptyMessage?: string
    /** Función para obtener la key única de cada fila */
    getRowKey: (row: T) => string | number
    /** Callback al hacer clic en editar */
    onEdit?: (row: T) => void
    /** Callback al hacer clic en eliminar */
    onDelete?: (row: T) => void
    /** Mensaje de confirmación para eliminar */
    deleteConfirmMessage?: string | ((row: T) => string)
    /** Si mostrar la columna de acciones */
    showActions?: boolean
    /** Columna por la que ordenar inicialmente */
    defaultSortKey?: string
    /** Dirección inicial de ordenamiento */
    defaultSortDirection?: 'asc' | 'desc'
    /** Clases CSS adicionales para el contenedor */
    className?: string
    /** Si la tabla tiene bordes redondeados */
    rounded?: boolean
}

type SortDirection = 'asc' | 'desc' | null

/**
 * Componente DataTable genérico y reutilizable
 * 
 * @example
 * <DataTable
 *   data={grupos}
 *   loading={loading}
 *   columns={[
 *     { key: 'id', header: 'ID', width: 'w-20' },
 *     { key: 'nombre', header: 'Nombre', sortable: true },
 *   ]}
 *   getRowKey={(g) => g.id}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 * />
 */
export function DataTable<T extends Record<string, any>>({
    data,
    columns,
    loading = false,
    loadingMessage = 'Cargando...',
    emptyMessage = 'No hay datos para mostrar.',
    getRowKey,
    onEdit,
    onDelete,
    deleteConfirmMessage = '¿Estás seguro de eliminar este registro?',
    showActions = true,
    defaultSortKey,
    defaultSortDirection = 'asc',
    className = '',
    rounded = true,
}: DataTableProps<T>) {
    const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortKey ? defaultSortDirection : null)

    // Ordenar datos
    const sortedData = useMemo(() => {
        if (!sortKey || !sortDirection) return data

        const column = columns.find(c => c.key === sortKey)
        if (!column) return data

        const key = column.sortKey ?? column.key

        return [...data].sort((a, b) => {
            const aVal = a[key as keyof T]
            const bVal = b[key as keyof T]

            // Manejo de nulls
            if (aVal == null && bVal == null) return 0
            if (aVal == null) return sortDirection === 'asc' ? 1 : -1
            if (bVal == null) return sortDirection === 'asc' ? -1 : 1

            // Comparación
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal)
            }

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
            }

            return 0
        })
    }, [data, sortKey, sortDirection, columns])

    // Toggle ordenamiento
    const handleSort = (columnKey: string) => {
        const column = columns.find(c => c.key === columnKey)
        if (!column?.sortable) return

        if (sortKey === columnKey) {
            // Ciclar: asc -> desc -> null
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortKey(null)
                setSortDirection(null)
            }
        } else {
            setSortKey(columnKey)
            setSortDirection('asc')
        }
    }

    // Manejar eliminación con confirmación
    const handleDelete = (row: T) => {
        const message = typeof deleteConfirmMessage === 'function'
            ? deleteConfirmMessage(row)
            : deleteConfirmMessage

        if (confirm(message)) {
            onDelete?.(row)
        }
    }

    // Renderizar celda
    const renderCell = (row: T, column: Column<T>) => {
        if (column.accessor) {
            return column.accessor(row)
        }
        return row[column.key as keyof T] as React.ReactNode
    }

    // Estado loading
    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500">
                <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mr-2" />
                {loadingMessage}
            </div>
        )
    }

    // Estado vacío
    if (data.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                {emptyMessage}
            </div>
        )
    }

    const showActionsColumn = showActions && (onEdit || onDelete)

    return (
        <div className={`overflow-x-auto ${rounded ? 'rounded-lg' : ''} ${className}`}>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`
                                    py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider
                                    ${column.width ?? ''}
                                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                                    ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-100 transition-colors' : ''}
                                    ${column.headerClassName ?? ''}
                                `}
                                onClick={() => column.sortable && handleSort(column.key)}
                            >
                                <div className={`flex items-center gap-1 ${column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : ''}`}>
                                    {column.header}
                                    {column.sortable && sortKey === column.key && (
                                        sortDirection === 'asc'
                                            ? <ChevronUp size={14} className="text-blue-600" />
                                            : <ChevronDown size={14} className="text-blue-600" />
                                    )}
                                </div>
                            </th>
                        ))}
                        {showActionsColumn && (
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right w-32">
                                Acciones
                            </th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {sortedData.map((row) => (
                        <tr key={getRowKey(row)} className="hover:bg-gray-50 transition-colors">
                            {columns.map((column) => (
                                <td
                                    key={column.key}
                                    className={`
                                        py-3 px-4 text-sm
                                        ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                                        ${column.cellClassName ?? ''}
                                    `}
                                >
                                    {renderCell(row, column)}
                                </td>
                            ))}
                            {showActionsColumn && (
                                <td className="py-3 px-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {onEdit && (
                                            <button
                                                onClick={() => onEdit(row)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                onClick={() => handleDelete(row)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/**
 * Helper para crear columnas fácilmente
 */
export const createColumn = <T,>(column: Column<T>): Column<T> => column

/**
 * Columna de ID preconfigurada
 */
export const idColumn = <T extends { id: number }>(overrides?: Partial<Column<T>>): Column<T> => ({
    key: 'id',
    header: 'ID',
    width: 'w-20',
    accessor: (row) => <span className="font-mono text-gray-600">#{row.id}</span>,
    sortable: true,
    ...overrides,
})

/**
 * Columna de nombre preconfigurada
 */
export const nombreColumn = <T extends { nombre: string }>(overrides?: Partial<Column<T>>): Column<T> => ({
    key: 'nombre',
    header: 'Nombre',
    accessor: (row) => <span className="font-medium text-gray-900">{row.nombre}</span>,
    sortable: true,
    ...overrides,
})
