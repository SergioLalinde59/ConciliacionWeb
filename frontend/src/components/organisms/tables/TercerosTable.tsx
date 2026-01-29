import { DataTable, type Column } from '../../molecules/DataTable'
import { EntityDisplay } from '../../molecules/entities/EntityDisplay'
import type { Tercero } from '../../../types'

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
        {
            key: 'tercero',
            header: 'TERCERO',
            sortable: true,
            sortKey: 'nombre', // Sort by name by default
            accessor: (row) => (
                <EntityDisplay
                    id={row.id}
                    nombre={row.nombre}
                />
            )
        }
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
