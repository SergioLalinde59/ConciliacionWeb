import { useMemo } from 'react'
import { Edit2, CheckCircle2, Repeat } from 'lucide-react'
import { Button } from '../atoms/Button'
import type { Column } from '../molecules/DataTable'
import { DataTable } from '../molecules/DataTable'

export interface ExtractDetailRow {
    // Unique ID needed? We can use index or generate one
    id?: number | string
    fecha: string
    descripcion: string
    referencia?: string
    valor: number
    moneda?: string
    // Datos crudos
    raw_text?: string
    usd?: number
    es_duplicado?: boolean
    numero_linea?: number
}

interface ExtractDetailsTableProps {
    records: ExtractDetailRow[]
    onEdit?: (record: ExtractDetailRow, index: number) => void
    isGrouped?: boolean
}

export const ExtractDetailsTable = ({ records, onEdit }: ExtractDetailsTableProps) => {
    // Grouping logic removed as per user request
    const displayData = useMemo(() => {
        return records.map((r, index) => ({
            ...r,
            valor: Number(r.valor),
            estado_label: r.es_duplicado ? 'Duplicado' : 'A Cargar',
            originalIndex: index
        }))
    }, [records])

    if (!records || records.length === 0) return (
        <div className="p-8 text-center text-gray-500">
            No hay registros para mostrar.
        </div>
    )

    const columns: Column<any>[] = useMemo(() => {
        const baseCols: Column<any>[] = [
            {
                key: 'estado_label',
                header: 'ESTADO',
                sortable: true,
                sortKey: 'estado_label',
                width: 'w-16',
                align: 'center',
                cellClassName: '!py-0.5',
                accessor: (row) => row.es_duplicado ? (
                    <div title="Duplicado - Ya existe en el sistema" className="flex justify-center">
                        <Repeat size={16} className="text-orange-500" />
                    </div>
                ) : (
                    <div title="Nuevo - Se cargará al sistema" className="flex justify-center">
                        <CheckCircle2 size={16} className="text-green-500" />
                    </div>
                )
            },
            {
                key: 'fecha',
                header: 'FECHA',
                sortable: true,
                width: 'w-24',
                cellClassName: '!py-0.5 text-xs',
                accessor: (row) => <span className="font-medium text-gray-900">{row.fecha}</span>
            },
            {
                key: 'descripcion',
                header: 'DESCRIPCIÓN',
                sortable: true,
                cellClassName: '!py-0.5 text-xs',
                accessor: (row) => (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-800 break-words" title={row.descripcion}>{row.descripcion}</span>
                        {row.referencia && <span className="text-[10px] text-gray-500">Ref: {row.referencia}</span>}
                    </div>
                )
            },
            {
                key: 'valor',
                header: 'VALOR (COP)',
                sortable: true,
                align: 'right',
                width: 'w-32',
                cellClassName: '!py-0.5 text-xs',
                accessor: (row) => {
                    const val = Number(row.valor)
                    const colorClass = val > 0 ? 'text-green-700' : 'text-red-700'
                    return (
                        <span className={`font-mono font-bold ${colorClass}`}>
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)}
                        </span>
                    )
                }
            },
            {
                key: 'raw_text',
                header: 'ORIGINAL',
                sortable: true,
                width: 'w-64',
                cellClassName: '!py-0.5 text-xs',
                accessor: (row) => (
                    <div className="font-mono text-xs text-gray-900 break-words leading-tight" title={row.raw_text}>
                        {row.raw_text || '-'}
                    </div>
                )
            },
            {
                key: 'actions',
                header: 'ACCIÓN',
                align: 'center',
                width: 'w-16',
                cellClassName: '!py-0.5',
                accessor: (row) => onEdit && (
                    <Button
                        variant="ghost-warning"
                        size="sm"
                        onClick={() => onEdit(row, row.originalIndex)}
                        className="!p-1"
                        title="Modificar movimiento"
                    >
                        <Edit2 size={14} />
                    </Button>
                )
            }
        ]
        return baseCols
    }, [onEdit])

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-2 border-b border-gray-100 bg-gray-50 flex items-center">
                <h3 className="text-sm font-bold text-gray-800 ml-2">Movimientos</h3>
            </div>

            <DataTable
                data={displayData}
                columns={columns}
                getRowKey={(row, index) => `${row.descripcion || row.fecha}-${index}`}
                showActions={false}
                rounded={false}
                className="border-none"
            />
        </div>
    )
}

