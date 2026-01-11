import { useMemo } from 'react'
import { DataTable, type Column } from './molecules/DataTable'
import type { Concepto, Grupo } from '../types'

interface Props {
    conceptos: Concepto[]
    grupos: Grupo[]
    loading: boolean
    onEdit: (concepto: Concepto) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de conceptos usando el componente DataTable genérico
 */
export const ConceptosTable = ({ conceptos, grupos, loading, onEdit, onDelete }: Props) => {
    // Ordenar conceptos por grupo_id y luego por nombre
    const conceptosOrdenados = useMemo(() =>
        [...conceptos].sort((a, b) => {
            if (a.grupo_id !== b.grupo_id) {
                return (a.grupo_id || 0) - (b.grupo_id || 0)
            }
            return a.nombre.localeCompare(b.nombre)
        }),
        [conceptos]
    )

    const columns: Column<Concepto>[] = [
        {
            key: 'grupo_id',
            header: 'Grupo ID',
            width: 'w-20',
            sortable: true,
            accessor: (c) => <span className="font-mono text-gray-600">#{c.grupo_id}</span>,
        },
        {
            key: 'grupo_nombre' as keyof Concepto, // Virtual key
            header: 'Grupo',
            sortable: true,
            accessor: (c) => {
                const grupo = grupos.find(g => g.id === c.grupo_id)
                return <span className="text-gray-700">{grupo?.nombre || '-'}</span>
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

