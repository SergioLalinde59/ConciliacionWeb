import React, { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { DataTable } from './molecules/DataTable'
import type { Column } from './molecules/DataTable'
import type { Movimiento } from '../types'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import { apiService } from '../services/api'

interface ModalClasificarSimilaresProps {
    isOpen: boolean
    onClose: () => void
    movimientoReferencia: Movimiento
    clasificacion: {
        tercero_id: number
        centro_costo_id: number
        concepto_id: number
        tercero_display: string
        centro_costo_display: string
        concepto_display: string
    }
    onConfirm: () => void
}

export const ModalClasificarSimilares: React.FC<ModalClasificarSimilaresProps> = ({
    isOpen,
    onClose,
    movimientoReferencia,
    clasificacion,
    onConfirm
}) => {
    const [loading, setLoading] = useState(false)
    const [movimientosSimilares, setMovimientosSimilares] = useState<Array<Movimiento & { similitud: number }>>([])
    const [clasificando, setClasificando] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

    useEffect(() => {
        if (isOpen && movimientoReferencia) {
            cargarSimilares()
        }
    }, [isOpen, movimientoReferencia])

    // Cuando cargan los movimientos, seleccionar todos por defecto
    useEffect(() => {
        if (movimientosSimilares.length > 0) {
            setSelectedIds(new Set(movimientosSimilares.map(m => m.id)))
        } else {
            setSelectedIds(new Set())
        }
    }, [movimientosSimilares])

    const cargarSimilares = async () => {
        setLoading(true)
        try {
            const response = await apiService.clasificacion.previewSimilares(movimientoReferencia.id)
            setMovimientosSimilares(response.movimientos)
        } catch (error) {
            console.error('Error cargando similares:', error)
            alert('Error al cargar movimientos similares')
        } finally {
            setLoading(false)
        }
    }

    const handleConfirmar = async () => {
        if (selectedIds.size === 0) return

        setClasificando(true)
        try {
            const movimientoIds = Array.from(selectedIds)

            await apiService.clasificacion.clasificarLote({
                movimiento_ids: movimientoIds,
                tercero_id: clasificacion.tercero_id,
                centro_costo_id: clasificacion.centro_costo_id,
                concepto_id: clasificacion.concepto_id
            })

            // alert(`✅ ${movimientoIds.length} movimientos clasificados correctamente`)
            onConfirm()
            onClose()
        } catch (error) {
            console.error('Error clasificando:', error)
            alert('Error al clasificar movimientos')
        } finally {
            setClasificando(false)
        }
    }

    const handleToggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedIds(newSelected)
    }

    const handleToggleSelectAll = () => {
        if (selectedIds.size === movimientosSimilares.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(movimientosSimilares.map(m => m.id)))
        }
    }

    const columns: Column<Movimiento & { similitud: number }>[] = [
        {
            key: 'fecha',
            header: 'Fecha',
            sortable: true,
            width: 'w-24'
        },
        {
            key: 'cuenta_display',
            header: 'Cuenta',
            sortable: true,
            accessor: (row) => <span className="text-blue-600 font-medium">{row.cuenta_display}</span>
        },
        {
            key: 'descripcion',
            header: 'Descripción',
            sortable: true,
            accessor: (row) => <div className="max-w-md truncate" title={row.descripcion}>{row.descripcion}</div>
        },
        {
            key: 'valor',
            header: 'Valor',
            sortable: true,
            align: 'right',
            accessor: (row) => <CurrencyDisplay value={row.valor} />
        },
        {
            key: 'seleccionar',
            header: 'Clasificar',
            width: 'w-24',
            align: 'center',
            sortable: false,
            // Header personalizado para select all
            headerClassName: 'text-center',
            accessor: (row) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => handleToggleSelect(row.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                </div>
            )
        },
        {
            key: 'similitud',
            header: 'Similitud',
            sortable: true,
            align: 'center',
            width: 'w-24',
            accessor: (row) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {row.similitud}%
                </span>
            )
        }
    ]

    // Custom header group for the select all checkbox which is a bit tricky with standard DataTable.
    // Instead, we can use the header render capability if we modify DataTable or just use a custom header component in the column definition?
    // The current DataTable definition supports a string header.
    // Let's modify the columns definition to include the header content directly if we want a checkbox in the header.
    // But wait, the `header` property in `Column` is `string`. Let's check `DataTable.tsx`.
    // Checking `DataTable.tsx`... 
    // `header: string` in interface Column.
    // So I can't put a component there without modifying `DataTable`.
    // However, the `DataTable` render: `{column.header}`.

    // To solve this without modifying `DataTable` types too much or risking breaking other things:
    // I can put the "Select All" logic outside or just leave the header as "Clasificar" text as requested?
    // User request: "Agregar un checkbox que permita cuales movimientos clasificar. Esta columna debe estar despues del valor."
    // It doesn't explicitly say "Select All" checkbox in header, but it's standard UX.
    // Let's stick to the text "Clasificar" for now in the header, or try to hack it.
    // Actually, `DataTable.ts` -> `header: string` is explicit.
    // But `headerGroups` allows `title: React.ReactNode`.
    // Maybe I can just use the text "Clasificar" for the column header for now, and rely on the "confirm" button to show how many are selected. 
    // Or I can update `DataTable` to accept `ReactNode` for header.
    // Let's check `DataTable.tsx` again.
    // Line 12: `header: string`.

    // DECISION: I will upgrade `DataTable.tsx` to allow `header: React.ReactNode` first to enable the "Select All" checkbox in the header, 
    // OR just use "Clasificar" text.
    // Given the "User rules" about being "Helpful" and "Premium Designs", a Select All checkbox is better.
    // But I should avoid "surprising" refactors.
    // Let's modify `DataTable.tsx` first quickly to allow `ReactNode`.
    // Wait, I am in the middle of writing `ModalClasificarSimilares`.
    // I will write `ModalClasificarSimilares` assuming `header` can be `ReactNode` (or `any` cast), 
    // and THEN update `DataTable` in the next step? No, that's risky.
    // I'll stick to `header: 'Clasificar'` text for now to follow the interface, and add a "Seleccionar Todos" button near the table or just let users click one by one?
    // No, "Seleccionar Todos" is important.
    // Actually, looking at the `DataTable` code: `header: string` is used in sorting too?
    // `column.header` is just rendered.

    // PLAN UPDATE: I will update `DataTable.tsx` to allow `header: React.ReactNode` in a separate tool call if needed. 
    // BUT for `ModalClasificarSimilares`, let's just use a string for now to be safe and compatible.
    // I'll use "Clasificar" as the header title.

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Clasificar Movimientos Similares</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Referencia: {movimientoReferencia.descripcion}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Clasificación a Aplicar */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                            <Check className="h-5 w-5" />
                            Clasificación que se Aplicará
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <span className="text-blue-700 font-medium">Tercero:</span>
                                <p className="text-blue-900">{clasificacion.tercero_display}</p>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Centro de Costo:</span>
                                <p className="text-blue-900">{clasificacion.centro_costo_display}</p>
                            </div>
                            <div>
                                <span className="text-blue-700 font-medium">Concepto:</span>
                                <p className="text-blue-900">{clasificacion.concepto_display}</p>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Movimientos */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h3 className="font-semibold text-gray-800">
                                Movimientos a Clasificar ({movimientosSimilares.length})
                            </h3>
                            {movimientosSimilares.length > 0 && (
                                <button
                                    onClick={handleToggleSelectAll}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    {selectedIds.size === movimientosSimilares.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                </button>
                            )}
                        </div>
                        <span className="text-sm text-gray-500">
                            Similitud ≥ 70%
                        </span>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <DataTable
                            data={movimientosSimilares}
                            columns={columns}
                            loading={loading}
                            emptyMessage="No se encontraron movimientos pendientes similares"
                            getRowKey={(row) => row.id}
                            showActions={false}
                            defaultSortKey="similitud"
                            defaultSortDirection="desc"
                            className="max-h-[500px]" // Limit height if needed
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        disabled={clasificando}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirmar}
                        disabled={loading || selectedIds.size === 0 || clasificando}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {clasificando ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Clasificando...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Confirmar selección ({selectedIds.size})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
