import React from 'react'
import { CheckCircle, TrendingUp, TrendingDown, FileText } from 'lucide-react'

export interface LoadResult {
    archivo: string
    total_extraidos: number
    nuevos_insertados: number
    actualizados: number
    duplicados: number
    errores: number
    periodo: string
    total_ingresos: number
    total_egresos: number
    total_ingresos_usd: number
    total_egresos_usd: number
}

interface LoadResultSummaryProps {
    result: LoadResult
    tipoCuenta: string
    cuentaId: number | null
}

export const LoadResultSummary: React.FC<LoadResultSummaryProps> = ({ result, tipoCuenta, cuentaId }) => {
    const formatCurrency = (value: number, currency: 'COP' | 'USD') => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(value)
    }

    const hasCopStats = result.total_ingresos !== 0 || result.total_egresos !== 0
    const hasUsdStats = result.total_ingresos_usd !== 0 || result.total_egresos_usd !== 0

    return (
        <div className="space-y-8 py-2">

            {/* Header Section */}
            <div className="text-center space-y-2">
                <div className="flex justify-center mb-4">
                    <div className="bg-green-50 p-4 rounded-full ring-8 ring-green-50/50">
                        <CheckCircle className="h-10 w-10 text-green-600" strokeWidth={1.5} />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Carga Exitosa</h3>
                    <p className="text-sm text-gray-500 font-medium">{tipoCuenta} {cuentaId ? `(${cuentaId})` : ''}</p>
                    <p className="text-sm text-gray-400 mt-1">{result.periodo}</p>
                </div>
            </div>

            {/* Financial Stats Section */}
            {(hasCopStats || hasUsdStats) && (
                <div className="grid gap-4">
                    {hasCopStats && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Movimientos en Pesos (COP)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <TrendingUp size={12} /> Ingresos
                                    </p>
                                    <p className="text-lg font-bold text-green-600 tracking-tight">
                                        {formatCurrency(result.total_ingresos, 'COP')}
                                    </p>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <TrendingDown size={12} /> Egresos
                                    </p>
                                    <p className="text-lg font-bold text-red-600 tracking-tight">
                                        {formatCurrency(result.total_egresos, 'COP')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasUsdStats && (
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 text-center">Movimientos en Dólares (USD)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <TrendingUp size={12} /> Ingresos
                                    </p>
                                    <p className="text-lg font-bold text-green-600 tracking-tight">
                                        {formatCurrency(result.total_ingresos_usd, 'USD')}
                                    </p>
                                </div>
                                <div className="text-center border-l border-gray-100">
                                    <p className="text-xs text-gray-400 mb-1 flex items-center justify-center gap-1">
                                        <TrendingDown size={12} /> Egresos
                                    </p>
                                    <p className="text-lg font-bold text-red-600 tracking-tight">
                                        {formatCurrency(result.total_egresos_usd, 'USD')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Operational Metrics - Minimalist Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-gray-50 rounded-lg p-3">
                    <span className="block text-gray-400 mb-1">Cargados</span>
                    <span className="text-base font-semibold text-gray-700">{result.nuevos_insertados}</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                    <span className="block text-gray-400 mb-1">Duplicados</span>
                    <span className="text-base font-semibold text-gray-700">{result.duplicados}</span>
                </div>
                {result.errores > 0 ? (
                    <div className="bg-red-50 rounded-lg p-3">
                        <span className="block text-red-400 mb-1">Errores</span>
                        <span className="text-base font-semibold text-red-600">{result.errores}</span>
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-3">
                        <span className="block text-gray-400 mb-1">Errores</span>
                        <span className="text-base font-semibold text-gray-700">0</span>
                    </div>
                )}
            </div>

            {/* Totals */}
            <div className="text-center pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                    <FileText size={12} />
                    Total Leídos: {result.total_extraidos}
                </span>
            </div>

        </div>
    )
}
