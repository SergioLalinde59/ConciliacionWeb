import { useMemo } from 'react'
import { DataTable, type Column } from '../../molecules/DataTable'
import type { Concepto, CentroCosto } from '../../../types'

interface Props {
    conceptos: Concepto[]
    centrosCostos: CentroCosto[]
    loading: boolean
    onEdit: (concepto: Concepto) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de conceptos usando el componente DataTable genérico
 */
export const ConceptosTable = ({ conceptos, centrosCostos, loading, onEdit, onDelete }: Props) => {
    // Ordenar conceptos por centro_costo_id y luego por nombre
    const conceptosOrdenados = useMemo(() =>
        [...conceptos].sort((a, b) => {
            if (a.centro_costo_id !== b.centro_costo_id) {
                return (a.centro_costo_id || 0) - (b.centro_costo_id || 0)
            }
            return a.nombre.localeCompare(b.nombre)
        }),
        [conceptos]
    )

    const columns: Column<Concepto>[] = [
        {
            key: 'centro_costo_id',
            header: 'Centro Costo ID',
            width: 'w-24',
            sortable: true,
            accessor: (c) => <span className="font-mono text-gray-600">#{c.centro_costo_id}</span>,
        },
        {
            key: 'centro_costo_nombre' as keyof Concepto, // Virtual key
            header: 'Centro de Costo',
            sortable: true,
            accessor: (c) => {
                const centro = centrosCostos.find(CC => CC.id === c.centro_costo_id)
                return <span className="text-gray-700">{centro?.nombre || '-'}</span>
            }
        },
        {
            key: 'id',
            header: 'Concepto ID',
            width: 'w-28',
            sortable: true,
            accessor: (c) => <span className="font-mono text-gray-600">#{c.id}</span>,
        },
        {
            key: 'nombre',
            header: 'Concepto',
            sortable: true,
            accessor: (c) => <span className="font-medium text-gray-900">{c.nombre}</span>,
        },
    ]

    return (
        <DataTable
            data={conceptosOrdenados}
            columns={columns}
            loading={loading}
            loadingMessage="Cargando conceptos..."
            emptyMessage="No hay conceptos registrados."
            getRowKey={(c) => c.id}
            onEdit={onEdit}
            onDelete={(concepto) => onDelete(concepto.id)}
            deleteConfirmMessage="¿Estás seguro de eliminar este concepto?"
        />
    )
}

