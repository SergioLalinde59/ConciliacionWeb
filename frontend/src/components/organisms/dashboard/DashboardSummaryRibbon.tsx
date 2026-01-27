import type { FC } from 'react'
import { CurrencyDisplay } from '../../atoms/CurrencyDisplay'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface Props {
    ingresos: number
    egresos: number
    saldo: number
}

export const DashboardSummaryRibbon: FC<Props> = ({ ingresos, egresos, saldo }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Ingresos</h3>
                    <CurrencyDisplay value={ingresos} className="text-3xl font-bold text-green-600" />
                </div>
                <div className="bg-green-50 p-3 rounded-full">
                    <TrendingUp className="text-green-600" size={24} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Egresos</h3>
                    <CurrencyDisplay value={egresos} className="text-3xl font-bold text-red-600" />
                </div>
                <div className="bg-red-50 p-3 rounded-full">
                    <TrendingDown className="text-red-600" size={24} />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Saldo Neto</h3>
                    <CurrencyDisplay value={saldo} className={`text-3xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
                </div>
                <div className="bg-blue-50 p-3 rounded-full">
                    <Wallet className="text-blue-600" size={24} />
                </div>
            </div>
        </div>
    )
}
