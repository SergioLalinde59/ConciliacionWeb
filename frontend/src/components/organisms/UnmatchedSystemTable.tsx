import { Edit2, Trash2, AlertCircle } from 'lucide-react'
import { DataTable } from '../molecules/DataTable'
import type { Column } from '../molecules/DataTable'
import { useMemo } from 'react'

interface UnmatchedSystemTableProps {
    records: any[] // Usamos any o un tipo compatible que tenga las props necesarias
    onEdit: (mov: any) => void
    onDelete: (id: number) => void
}

export const UnmatchedSystemTable = ({ records, onEdit, onDelete }: UnmatchedSystemTableProps) => {
    if (!records || records.length === 0) return null

    const columns: Column<any>[] = useMemo(() => [
        {
            key: 'fecha',
            header: 'FECHA',
            sortable: true,
            width: 'w-32',
            cellClassName: '!py-0.5',
            accessor: (row) => <span className="font-medium text-gray-900">{row.fecha}</span>
        },
        {
            key: 'tercero_nombre',
            header: 'TERCERO',
            sortable: true,
            cellClassName: '!py-0.5',
            accessor: (row) => row.tercero_nombre ? <span className="text-sm text-gray-700">{row.tercero_nombre}</span> : null
        },
        {
            key: 'descripcion',
            header: 'DESCRIPCIÓN',
            sortable: true,
            cellClassName: '!py-0.5',
            accessor: (row) => <span className="text-sm text-gray-900">{row.descripcion}</span>
        },
        {
            key: 'referencia',
            header: 'REFERENCIA',
            sortable: true,
            width: 'w-32',
            cellClassName: '!py-0.5',
            accessor: (row) => <span className="text-gray-500">{row.referencia || '-'}</span>
        },
        {
            key: 'valor',
            header: 'VALOR',
            sortable: true,
            align: 'right',
            width: 'w-40',
            cellClassName: '!py-0.5',
            accessor: (row) => {
                const colorClass = row.valor > 0 ? 'text-green-600' : row.valor < 0 ? 'text-red-600' : 'text-blue-600'
                return (
                    <span className={`font-medium ${colorClass}`}>
                        {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP'
                        }).format(row.valor)}
                    </span>
                )
            }
        },
        {
            key: 'actions',
            header: 'ACCIONES',
            align: 'center',
            width: 'w-24',
            cellClassName: '!py-0.5',
            accessor: (row) => (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => onEdit(row)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modificar"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button
                        onClick={() => onDelete(row.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar (Es un error)"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ], [onEdit, onDelete])

    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-3 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <AlertCircle className="text-blue-600" size={20} />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Registros en Tránsito / Sin Match</h3>
                        <p className="text-xs text-blue-700">
                            Estos registros están en contabilidad pero no en el extracto (Partidas pendientes o Errores)
                        </p>
                    </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                    {records.length} registros
                </span>
            </div>

            <DataTable
                data={records}
                columns={columns}
                getRowKey={(row) => row.id}
                showActions={false} // We are handling actions in a custom column
                rounded={false}
                className="border-none"
            />

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 text-center">
                Si el registro es correcto (partida en tránsito), déjalo aquí. El sistema lo cruzará el próximo mes. Solo borra si es un error.
            </div>
        </div>
    )
}
