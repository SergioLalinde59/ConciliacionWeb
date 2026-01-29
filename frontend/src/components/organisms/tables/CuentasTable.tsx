import { CheckCircle, XCircle } from 'lucide-react'
import { DataTable, type Column } from '../../molecules/DataTable'
import { EntityDisplay } from '../../molecules/entities/EntityDisplay'
import type { Cuenta } from '../../../types'

interface Props {
    cuentas: Cuenta[]
    loading: boolean
    onEdit: (cuenta: Cuenta) => void
    onDelete: (id: number) => void
}

/**
 * Tabla de cuentas usando el componente DataTable genérico
 */
export const CuentasTable = ({ cuentas, loading, onEdit, onDelete }: Props) => {
    const columns: Column<Cuenta>[] = [
        {
            key: 'cuenta',
            header: 'CUENTA',
            sortable: true,
            sortKey: 'nombre',
            accessor: (row) => (
                <EntityDisplay
                    id={row.id}
                    nombre={row.nombre}
                />
            )
        },
        {
            key: 'permite_carga',
            header: 'Permite Carga',
            align: 'center',
            width: 'w-32',
            accessor: (row) => (
                row.permite_carga
                    ? <CheckCircle size={18} className="text-green-500 mx-auto" />
                    : <XCircle size={18} className="text-gray-300 mx-auto" />
            )
        },
        {
            key: 'permite_conciliar',
            header: 'Permite Conciliar',
            align: 'center',
            width: 'w-32',
            accessor: (row) => (
                row.permite_conciliar
                    ? <CheckCircle size={18} className="text-green-500 mx-auto" />
                    : <XCircle size={18} className="text-gray-300 mx-auto" />
            )
        }
    ]

    return (
        <DataTable
            data={cuentas}
            columns={columns}
            loading={loading}
            loadingMessage="Cargando cuentas..."
            emptyMessage="No hay cuentas registradas."
            getRowKey={(c) => c.id}
            onEdit={onEdit}
            onDelete={(cuenta) => onDelete(cuenta.id)}
            deleteConfirmMessage="¿Estás seguro de eliminar esta cuenta?"
        />
    )
}
