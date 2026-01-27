import { Edit2, LayoutList, Trash2 } from 'lucide-react'
import { Button } from '../atoms/Button'
import { DataTable } from '../molecules/DataTable'
import type { Column } from '../molecules/DataTable'
import { useMemo } from 'react'
import type { Movimiento } from '../../types'

interface MovimientosTableProps {
    movimientos: Movimiento[]
    loading: boolean
    onEdit: (mov: Movimiento) => void
    onDelete?: (mov: Movimiento) => void
    totales: {
        ingresos: number
        egresos: number
        saldo: number
    }
}

export const MovimientosTable = ({ movimientos, loading, onEdit, onDelete, totales }: MovimientosTableProps) => {

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
            width: 'w-30',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 text-[12px] text-gray-500',
            accessor: (row) => row.cuenta_display
        },
        {
            key: 'tercero',
            header: 'TERCERO',
            sortable: true,
            width: 'w-45',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5 text-[12px] text-gray-600',
            accessor: (row) => (
                <div className="max-w-[200px] truncate" title={row.tercero_display || ''}>
                    {row.tercero_display || <span className="text-gray-300 italic">No asignado</span>}
                </div>
            )
        },
        {
            key: 'clasificacion',
            header: 'CLASIFICACIÓN',
            sortable: true,
            width: 'w-30',
            headerClassName: '!py-2.5 !px-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest',
            cellClassName: '!py-0.5 !px-0.5',
            accessor: (row) => (
                row.centro_costo_display ? (
                    <div className="flex flex-col gap-0">
                        <span className="text-[13px] font-bold text-slate-700 leading-tight">{row.centro_costo_display}</span>
                        <span className="text-[12px] text-slate-400 italic font-medium leading-tight">{row.concepto_display}</span>
                    </div>
                ) : (
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-[12px] font-medium bg-amber-50 text-amber-700 border border-amber-100 italic leading-none">
                        Sin clasificar
                    </span>
                )
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
                    <Button
                        variant="ghost-warning"
                        size="sm"
                        onClick={() => onEdit(row)}
                        className="!p-1.5"
                        title="Editar Movimiento"
                    >
                        <Edit2 size={15} />
                    </Button>
                    <Button
                        variant="ghost-danger"
                        size="sm"
                        onClick={() => onDelete && onDelete(row)}
                        className="!p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        title="Borrar Movimiento"
                    >
                        <Trash2 size={15} />
                    </Button>
                </div>
            )
        }
    ], [onEdit, onDelete])




    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center">
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
                        {movimientos.length} registros
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
                data={movimientos}
                columns={columns}
                getRowKey={(row) => row.id}
                loading={loading}
                showActions={false}
                rounded={false}
                className="border-none"
                emptyMessage="No se encontraron movimientos con los filtros actuales."
            />

            <div className="p-3 bg-gray-50/50 border-t border-gray-100 text-[10px] text-gray-400 text-center uppercase tracking-widest font-medium">
                Gestión de Movimientos • Sistema de Conciliación Bancaria
            </div>
        </div>
    )
}
