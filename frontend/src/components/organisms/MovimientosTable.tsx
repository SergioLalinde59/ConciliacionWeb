import { Edit2, Eye, LayoutList } from 'lucide-react'
import { EntityDisplay } from '../molecules/entities/EntityDisplay'
import { ClassificationDisplay } from '../molecules/entities/ClassificationDisplay'
import { Button } from '../atoms/Button'
import { DataTable } from '../molecules/DataTable'
import type { Column } from '../molecules/DataTable'
import { useState, useMemo, useEffect, useRef } from 'react'
import type { Movimiento } from '../../types'

interface MovimientosTableProps {
    movimientos: Movimiento[]
    loading: boolean
    onEdit: (mov: Movimiento) => void
    onView?: (mov: Movimiento) => void
    onDelete?: (mov: Movimiento) => void
    totales: {
        ingresos: number
        egresos: number
        saldo: number
    }
}

type SortDirection = 'asc' | 'desc' | null

export const MovimientosTable = ({ movimientos, loading, onEdit, onView, onDelete, totales }: MovimientosTableProps) => {
    // State for controlled sorting
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)

    // State for pagination/infinite scroll
    const [visibleLimit, setVisibleLimit] = useState(15)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Reset limit when filters change (movimientos list changes)
    useEffect(() => {
        setVisibleLimit(15)
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0
        }
    }, [movimientos])

    const handleSort = (key: string, direction: SortDirection) => {
        setSortKey(key === '' ? null : key)
        setSortDirection(direction)
    }

    // Handle infinite scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
        // Load more when scrolled near bottom (100px threshold)
        if (scrollHeight - scrollTop - clientHeight < 100) {
            if (visibleLimit < movimientos.length) {
                setVisibleLimit(prev => Math.min(prev + 15, movimientos.length))
            }
        }
    }

    // Calculate sorted and sliced data
    const processedData = useMemo(() => {
        let data = [...movimientos]

        // 1. Sort globally
        if (sortKey && sortDirection) {
            data.sort((a, b) => {
                let aVal = a[sortKey as keyof Movimiento]
                let bVal = b[sortKey as keyof Movimiento]

                // Handle specific complex fields by mapping to simple values if needed, 
                // essentially handled by providing the correct sortKey in columns definition

                if (aVal == null && bVal == null) return 0
                if (aVal == null) return sortDirection === 'asc' ? 1 : -1
                if (bVal == null) return sortDirection === 'asc' ? -1 : 1

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
        }

        // 2. Slice for view
        return data.slice(0, visibleLimit)
    }, [movimientos, sortKey, sortDirection, visibleLimit])

    const columns: Column<Movimiento>[] = useMemo(() => [
        {
            key: 'id',
            header: 'ID',
            sortable: true,
            width: 'w-10',
            align: 'center',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 font-mono text-[11px] text-gray-400',
            accessor: (row) => `#${row.id}`
        },
        {
            key: 'fecha',
            header: 'FECHA',
            sortable: true,
            width: 'w-18',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 text-[13px] text-gray-600 font-normal',
            accessor: (row) => row.fecha
        },
        {
            key: 'cuenta',
            header: 'CUENTA',
            sortable: true,
            sortKey: 'cuenta_nombre', // Fix sort
            width: 'w-30',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <EntityDisplay
                    id={row.cuenta_id}
                    nombre={row.cuenta_nombre || row.cuenta_display || ''}
                    nameClassName="text-[12px] text-gray-500"
                />
            )
        },
        {
            key: 'tercero',
            header: 'TERCERO',
            sortable: true,
            sortKey: 'tercero_nombre', // Fix sort
            width: 'w-45',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <EntityDisplay
                    id={row.tercero_id || ''}
                    nombre={row.tercero_nombre || ''}
                    nameClassName="text-[12px] text-gray-600"
                    className="max-w-[200px]"
                />
            )
        },
        {
            key: 'clasificacion',
            header: 'CLASIFICACIÓN',
            sortable: true,
            sortKey: 'centro_costo_nombre', // Fix sort - prioritizing cost center as main classification
            width: 'w-30',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <ClassificationDisplay
                    centroCosto={row.centro_costo_id ? { id: row.centro_costo_id, nombre: row.centro_costo_nombre || '' } : null}
                    concepto={row.concepto_id ? { id: row.concepto_id, nombre: row.concepto_nombre || '' } : null}
                    detallesCount={row.detalles?.length}
                />
            )
        },
        {
            key: 'valor',
            header: 'VALOR',
            sortable: true,
            align: 'right',
            width: 'w-24',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 font-mono text-sm font-bold',
            accessor: (row) => (
                <span className={row.valor < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                    {new Intl.NumberFormat('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }).format(row.valor)}
                </span>
            )
        },
        {
            key: 'usd',
            header: 'VALOR USD',
            sortable: true,
            align: 'right',
            width: 'w-20',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 font-mono text-sm font-bold',
            accessor: (row) => (
                <span className={row.usd && row.usd < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                    {row.usd ? (row.usd < 0 ? '-' : '') + `$${Math.abs(row.usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                </span>
            )
        },
        {
            key: 'trm',
            header: 'TRM',
            sortable: true,
            align: 'right',
            width: 'w-16',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 font-mono text-sm font-bold',
            accessor: (row) => (
                <span className="text-emerald-500">
                    {row.trm ? Math.abs(row.trm).toLocaleString('es-CO', { minimumFractionDigits: 0 }) : '-'}
                </span>
            )
        },
        {
            key: 'moneda',
            header: 'MONEDA',
            sortable: true,
            width: 'w-20',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 text-[13px] text-gray-500',
            accessor: (row) => row.moneda_display
        },
        {
            key: 'actions',
            header: 'ACCIÓN',
            align: 'center',
            width: 'w-20',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                <div className="flex items-center justify-center gap-1">
                    {onView && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onView(row)}
                            className="!p-1.5 text-blue-600 hover:text-blue-700"
                            title="Ver Detalles"
                        >
                            <Eye size={15} />
                        </Button>
                    )}
                    <Button
                        variant="ghost-warning"
                        size="sm"
                        onClick={() => onEdit(row)}
                        className="!p-1.5"
                        title="Editar Movimiento"
                    >
                        <Edit2 size={15} />
                    </Button>

                </div>
            )
        }
    ], [onEdit, onView, onDelete])




    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col h-[700px]">
            <div className="p-3 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <LayoutList className="text-gray-400" size={20} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Listado de Movimientos</h3>
                        <p className="text-xs text-gray-500">
                            Transacciones registradas en el sistema para los filtros seleccionados
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white border border-gray-200 text-gray-700 rounded-full text-xs font-bold shadow-sm">
                        {movimientos.length} registros (mostrando {Math.min(visibleLimit, movimientos.length)})
                    </span>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold shadow-sm">
                        Ingresos: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totales.ingresos)}
                    </span>
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full text-xs font-bold shadow-sm">
                        Egresos: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totales.egresos)}
                    </span>
                    <span className={`px-3 py-1 border rounded-full text-xs font-bold shadow-sm ${totales.saldo >= 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                        Saldo: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totales.saldo)}
                    </span>
                </div>
            </div>

            <DataTable
                containerRef={scrollContainerRef}
                onScroll={handleScroll}
                data={processedData}
                columns={columns}
                getRowKey={(row) => row.id}
                loading={loading}
                showActions={false}
                rounded={false}
                className="border-none h-full overflow-y-auto"
                emptyMessage="No se encontraron movimientos con los filtros actuales."
                rowPy="py-1" // Reduced padding
                stickyHeader={true} // Sticky header
                sortKey={sortKey} // Controlled sort
                sortDirection={sortDirection} // Controlled sort direction
                onSort={handleSort} // Controlled sort handler
            />

            <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest font-medium flex-shrink-0">
                Gestión de Movimientos • Sistema de Conciliación Bancaria • Mostrando {Math.min(visibleLimit, movimientos.length)} de {movimientos.length}
            </div>
        </div>
    )
}
