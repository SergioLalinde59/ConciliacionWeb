import { useMemo } from 'react'
import type { FC } from 'react'
import { CurrencyDisplay } from '../../atoms/CurrencyDisplay'
import { Hash } from 'lucide-react'
import type { DashboardStats } from '../../../services/dashboard.service'
import { DataTable } from '../../molecules/DataTable'
import type { Column } from '../../molecules/DataTable'

interface Props {
    stats: DashboardStats[]
    loading: boolean
}

interface AccountSummary {
    cuenta_nombre: string
    registros: number
    ingresos: number
    egresos: number
    saldo: number
}

export const DashboardAccountStats: FC<Props> = ({ stats, loading }) => {

    // Aggregation logic
    const accountStats = useMemo(() => {
        const aggregated = stats.reduce((acc, curr) => {
            const key = curr.cuenta_nombre || 'Sin Cuenta'

            if (!acc[key]) {
                acc[key] = {
                    cuenta_nombre: key,
                    registros: 0,
                    ingresos: 0,
                    egresos: 0,
                    saldo: 0
                }
            }

            acc[key].registros += curr.conteo
            acc[key].ingresos += curr.ingresos
            acc[key].egresos += curr.egresos
            acc[key].saldo += (curr.ingresos - curr.egresos)

            return acc
        }, {} as Record<string, AccountSummary>)

        return Object.values(aggregated).sort((a, b) => b.registros - a.registros)
    }, [stats])

    const columns: Column<AccountSummary>[] = [
        {
            key: 'cuenta_nombre',
            header: 'Cuenta',
            sortable: true,
            accessor: (row) => <span className="font-semibold text-gray-700">{row.cuenta_nombre}</span>
        },
        {
            key: 'registros',
            header: 'Reg.',
            sortable: true,
            align: 'center',
            width: 'w-20',
            accessor: (row) => (
                <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600" title="Registros Pendientes">
                    <Hash size={12} />
                    <span>{row.registros}</span>
                </div>
            )
        },
        {
            key: 'ingresos',
            header: 'Ingresos',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <CurrencyDisplay value={row.ingresos} className="text-green-600 font-medium" />
                </div>
            )
        },
        {
            key: 'egresos',
            header: 'Egresos',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <CurrencyDisplay value={row.egresos} className="text-red-600 font-medium" />
                </div>
            )
        },
        {
            key: 'saldo',
            header: 'Neto',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <CurrencyDisplay
                    value={row.saldo}
                    className={`font-bold ${row.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`}
                />
            )
        }
    ]

    return (
        <DataTable
            data={accountStats}
            columns={columns}
            loading={loading}
            emptyMessage="No hay datos para mostrar"
            getRowKey={(row) => row.cuenta_nombre}
            showActions={false}
            defaultSortKey="registros"
            defaultSortDirection="desc"
            className="pb-2"
        />
    )
}
