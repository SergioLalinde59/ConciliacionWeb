import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { DashboardStats } from '../../../services/dashboard.service'
import { useMemo } from 'react'

interface Props {
    data: DashboardStats[]
    isLoading?: boolean
}

export const DashboardAccountChart = ({ data, isLoading }: Props) => {
    // Agrupar por cuenta
    const chartData = useMemo(() => {
        const grouped = data.reduce((acc, curr) => {
            const key = curr.cuenta_nombre
            if (!acc[key]) {
                acc[key] = {
                    name: key,
                    Ingresos: 0,
                    Egresos: 0,
                    Saldo: 0
                }
            }
            acc[key].Ingresos += curr.ingresos
            acc[key].Egresos += curr.egresos
            acc[key].Saldo += (curr.ingresos - curr.egresos)
            return acc
        }, {} as Record<string, any>)

        return Object.values(grouped).sort((a, b) => b.Egresos - a.Egresos)
    }, [data])

    if (isLoading) return <div className="h-64 flex items-center justify-center text-gray-400">Cargando gráfico...</div>
    if (chartData.length === 0) return <div className="h-64 flex items-center justify-center text-gray-400">No hay datos para mostrar</div>

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);

    return (
        <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value / 1000}k`}
                    />
                    <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value)), ""]}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
