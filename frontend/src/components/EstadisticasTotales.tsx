import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { CurrencyDisplay } from './atoms/CurrencyDisplay'

interface EstadisticasTotalesProps {
    ingresos: number
    egresos: number
    saldo: number
}

/**
 * Componente de estadísticas totales con ingresos, egresos y saldo
 * Ahora usa CurrencyDisplay para formateo consistente
 */
export const EstadisticasTotales = ({ ingresos, egresos, saldo }: EstadisticasTotalesProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Ingresos</p>
                    <CurrencyDisplay
                        value={ingresos}
                        className="text-2xl font-bold text-emerald-600"
                        colorize={false}
                    />
                </div>
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                    <TrendingUp size={24} />
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Egresos</p>
                    <CurrencyDisplay
                        value={egresos}
                        className="text-2xl font-bold text-rose-600"
                        colorize={false}
                    />
                </div>
                <div className="p-3 bg-rose-50 rounded-full text-rose-600">
                    <TrendingDown size={24} />
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Saldo Neto</p>
                    <CurrencyDisplay
                        value={saldo}
                        className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-600' : 'text-rose-600'}`}
                        colorize={false}
                    />
                </div>
                <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                    <Wallet size={24} />
                </div>
            </div>
        </div>
    )
}
