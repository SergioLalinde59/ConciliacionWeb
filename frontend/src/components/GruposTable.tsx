import { DataTable, idColumn, nombreColumn, type Column } from './molecules/DataTable'
import type { Grupo } from '../types'

interface Props {
    grupos: Grupo[]
    loading: boolean
    onEdit: (grupo: Grupo) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de grupos usando el componente DataTable genérico
 */
export const GruposTable = ({ grupos, loading, onEdit, onDelete }: Props) => {
    const columns: Column<Grupo>[] = [
        idColumn<Grupo>(),
        nombreColumn<Grupo>({ header: 'Nombre del Grupo' }),
    ]

    return (
        <DataTable
            data={grupos}
            columns={columns}
            loading={loading}
            loadingMessage="Cargando grupos..."
            emptyMessage="No hay grupos registrados."
            getRowKey={(g) => g.id}
            onEdit={onEdit}
            onDelete={(grupo) => onDelete(grupo.id)}
            deleteConfirmMessage="¿Estás seguro de eliminar este grupo?"
        />
    )
}
