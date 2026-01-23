import { DataTable, createColumn } from '../../molecules/DataTable'
import type { Column } from '../../molecules/DataTable'
import { CurrencyDisplay } from '../../atoms/CurrencyDisplay'
import type { DashboardStats } from '../../../services/dashboard.service'

interface Props {
    stats: DashboardStats[]
    loading: boolean
}

export const DashboardStatsTable = ({ stats, loading }: Props) => {
    // Definición de columnas
    const columns: Column<DashboardStats>[] = [
        createColumn({
            key: 'periodo',
            header: 'Periodo',
            sortable: true
        }),
        createColumn({
            key: 'cuenta_nombre',
            header: 'Cuenta',
            sortable: true
        }),
        createColumn({
            key: 'centro_costo_nombre',
            header: 'Centro de Costos',
            sortable: true
        }),
        createColumn({
            key: 'conteo',
            header: 'Nro. Registros',
            sortable: true,
            accessor: (row) => <span className="font-medium">{row.conteo}</span>
        }),
        createColumn({
            key: 'ingresos',
            header: 'Ingresos',
            accessor: (row) => <CurrencyDisplay value={row.ingresos} className="font-medium" />,
            sortable: true,
            align: 'right'
        }),
        createColumn({
            key: 'egresos',
            header: 'Egresos',
            accessor: (row) => <CurrencyDisplay value={row.egresos} className="font-medium" />,
            sortable: true,
            align: 'right'
        }),
        createColumn({
            key: 'balance',
            header: 'Balance',
            accessor: (row) => {
                const balance = row.ingresos - row.egresos
                return (
                    <CurrencyDisplay
                        value={balance}
                        className="font-bold"
                    />
                )
            },
            align: 'right'
        })
    ]

    return (
        <DataTable
            data={stats}
            columns={columns}
            loading={loading}
            emptyMessage="No hay estadísticas disponibles para el periodo seleccionado."
            defaultSortKey="periodo"
            defaultSortDirection="desc"
            getRowKey={(row) => `${row.periodo}-${row.cuenta_id}-${row.centro_costo_id}`}
            showActions={false}
        />
    )
}
