import { DataTable, idColumn, nombreColumn, type Column } from './molecules/DataTable'
import type { Tercero } from '../types'

interface Props {
    terceros: Tercero[]
    loading: boolean
    onEdit: (tercero: Tercero) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de terceros usando el componente DataTable genérico
 * Simplificada después de 3NF - sin columnas descripcion/referencia
 */
export const TercerosTable = ({ terceros, loading, onEdit, onDelete }: Props) => {
    const columns: Column<Tercero>[] = [
        idColumn<Tercero>({ width: 'w-16' }),
        nombreColumn<Tercero>(),
    ]

    return (
        <DataTable
            data={terceros}
            columns={columns}
            loading={loading}
            loadingMessage="Cargando terceros..."
            emptyMessage="No hay terceros registrados."
            getRowKey={(t) => t.id}
            onEdit={onEdit}
            onDelete={(tercero) => onDelete(tercero.id)}
            deleteConfirmMessage="¿Eliminar este tercero?"
        />
    )
}
