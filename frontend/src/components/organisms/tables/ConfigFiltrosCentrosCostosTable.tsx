import { useMemo } from 'react'
import { DataTable, type Column } from '../../molecules/DataTable'

interface ConfigFiltroCentroCosto {
    id: number
    centro_costo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

interface ConfigFiltrosCentrosCostosTableProps {
    configs: ConfigFiltroCentroCosto[]
    centrosCostos: { id: number, nombre: string }[]
    loading: boolean
    onEdit: (config: ConfigFiltroCentroCosto) => void
    onDelete: (id: number) => void
}

export const ConfigFiltrosCentrosCostosTable = ({ configs, centrosCostos, loading, onEdit, onDelete }: ConfigFiltrosCentrosCostosTableProps) => {
    const columns = useMemo<Column<ConfigFiltroCentroCosto>[]>(() => [
        {
            key: 'id',
            header: 'ID',
            width: 'w-24',
            sortable: true,
            cellClassName: 'font-medium text-gray-900'
        },
        {
            key: 'centro_costo_id',
            header: 'CENTRO DE COSTO',
            sortable: true,
            accessor: (row) => {
                const centro = centrosCostos.find(c => c.id === row.centro_costo_id)
                const nombre = centro ? centro.nombre : 'Desconocido'
                return <span className="font-medium">{row.centro_costo_id} - {nombre}</span>
            }
        },
        {
            key: 'etiqueta',
            header: 'ETIQUETA',
            sortable: true,
            cellClassName: 'text-gray-700'
        },
        {
            key: 'activo_por_defecto',
            header: 'ACTIVO POR DEFECTO',
            align: 'center',
            width: 'w-48',
            sortable: true,
            accessor: (row) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.activo_por_defecto
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                    }`}>
                    {row.activo_por_defecto ? 'Sí' : 'No'}
                </span>
            )
        }
    ], [centrosCostos])

    return (
        <DataTable
            data={configs}
            columns={columns}
            loading={loading}
            onEdit={onEdit}
            onDelete={(row) => onDelete(row.id)}
            getRowKey={(row) => row.id}
            deleteConfirmMessage={(row) => `¿Eliminar la configuración "${row.etiqueta}"?`}
            emptyMessage="No hay configuraciones de filtros disponibles"
            showActions={true}
            className="border-none shadow-none"
        />
    )
}
