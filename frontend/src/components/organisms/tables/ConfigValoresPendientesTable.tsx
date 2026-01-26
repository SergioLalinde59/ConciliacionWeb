import { useMemo } from 'react'
import { DataTable, type Column } from '../../molecules/DataTable'

interface ConfigValorPendiente {
    id: number
    tipo: string
    valor_id: number
    descripcion: string
    activo: boolean
}

interface ConfigValoresPendientesTableProps {
    configs: ConfigValorPendiente[]
    loading: boolean
    onEdit: (config: ConfigValorPendiente) => void
    onDelete: (id: number) => void
}

export const ConfigValoresPendientesTable = ({ configs, loading, onEdit, onDelete }: ConfigValoresPendientesTableProps) => {
    const columns = useMemo<Column<ConfigValorPendiente>[]>(() => [
        {
            key: 'id',
            header: 'ID',
            width: 'w-24',
            sortable: true,
            cellClassName: 'font-medium text-gray-900'
        },
        {
            key: 'tipo',
            header: 'TIPO ENTIDAD',
            sortable: true,
            cellClassName: 'capitalize text-gray-700'
        },
        {
            key: 'valor_id',
            header: 'ID VALOR',
            sortable: true,
            cellClassName: 'font-mono text-gray-600'
        },
        {
            key: 'descripcion',
            header: 'DESCRIPCIÓN',
            sortable: true,
            cellClassName: 'text-gray-700'
        },
        {
            key: 'activo',
            header: 'ESTADO',
            align: 'center',
            width: 'w-32',
            sortable: true,
            accessor: (row) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.activo
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {row.activo ? 'Activo' : 'Inactivo'}
                </span>
            )
        }
    ], [])

    return (
        <DataTable
            data={configs}
            columns={columns}
            loading={loading}
            onEdit={onEdit}
            onDelete={(row) => onDelete(row.id)}
            getRowKey={(row) => row.id}
            deleteConfirmMessage={(row) => `¿Eliminar la configuración para ${row.tipo} ID ${row.valor_id}?`}
            emptyMessage="No hay configuraciones de valores pendientes"
            showActions={true}
            className="border-none shadow-none"
        />
    )
}
