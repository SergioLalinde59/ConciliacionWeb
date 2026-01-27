import { DataTable, idColumn, nombreColumn, type Column } from '../../molecules/DataTable'
import type { CentroCosto } from '../../../types'

interface Props {
    data: CentroCosto[]
    loading?: boolean
    onEdit: (centroCosto: CentroCosto) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de centros de costos usando el componente DataTable genérico
 */
export const CentrosCostosTable = ({ data, loading, onEdit, onDelete }: Props) => {
    const columns: Column<CentroCosto>[] = [
        idColumn<CentroCosto>(),
        nombreColumn<CentroCosto>({ header: 'Centro de Costo' }),
    ]

    return (
        <DataTable
            data={data}
            columns={columns}
            loading={loading}
            emptyMessage="No hay centros de costos registrados."
            getRowKey={(c) => c.id}
            onEdit={onEdit}
            onDelete={(centroCosto) => onDelete(centroCosto.id)}
            deleteConfirmMessage="¿Estás seguro de eliminar este centro de costo?"
        />
    )
}
