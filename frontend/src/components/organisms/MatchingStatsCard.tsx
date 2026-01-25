import { TrendingUp, TrendingDown, CheckCircle, AlertCircle, XCircle, EyeOff } from 'lucide-react'
import { Card } from '../atoms/Card'
import type { MatchingEstadisticas, DetailedStat } from '../../types/Matching'

interface MatchingStatsCardProps {
    estadisticas: MatchingEstadisticas
    className?: string
    unmatchedSystemRecordsCount?: number
}

/**
 * Tarjeta con estadísticas del matching.
 * 
 * Muestra un resumen visual de los resultados del matching.
 * Orden solicitado: Ingresos, Egresos, Total, Cantidad.
 */
export const MatchingStatsCard = ({
    estadisticas,
    className = '',
    unmatchedSystemRecordsCount = 0
}: MatchingStatsCardProps) => {

    // Helper para formateo de moneda
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value)
    }

    // Totales Generales
    const totalVinculados = estadisticas.ok.cantidad + estadisticas.probables.cantidad
    const totalRegistrosExtracto = estadisticas.total_extracto.cantidad

    // Helpers para porcentajes (no usados en el nuevo diseño de cards, pero pueden ser útiles para la barra de progreso)
    const calcPercent = (val: number, total: number) => {
        if (total === 0) return '0'
        return (val / total * 100).toFixed(1)
    }

    const porcentajeSinMatch = calcPercent(estadisticas.sin_match.cantidad, totalRegistrosExtracto)
    const porcentajeProbables = calcPercent(estadisticas.probables.cantidad, totalRegistrosExtracto)
    const porcentajeOk = calcPercent(estadisticas.ok.cantidad, totalRegistrosExtracto)


    // Sub-componente para renderizar la tabla de valores en orden específico
    const StatValuesGrid = ({
        stat,
        suffix = '',
        hideMainQuantity = false
    }: {
        stat: DetailedStat,
        suffix?: React.ReactNode,
        hideMainQuantity?: boolean
    }) => (
        <div className="flex flex-col gap-1 text-xs">
            {/* 1. Ingresos */}
            <div className="flex justify-between items-center">
                <span className="text-emerald-700 font-medium">Ingresos:</span>
                <span className="font-mono text-emerald-800">{formatCurrency(stat.ingresos)}</span>
            </div>

            {/* 2. Egresos */}
            <div className="flex justify-between items-center">
                <span className="text-red-700 font-medium">Egresos:</span>
                <span className="font-mono text-red-800">{formatCurrency(stat.egresos)}</span>
            </div>

            {/* 3. Total */}
            <div className="flex justify-between items-center border-t border-gray-200 pt-1 mt-0.5">
                <span className="text-gray-700 font-bold">Total:</span>
                <span className="font-mono font-bold text-gray-900">{formatCurrency(stat.total)}</span>
            </div>

            {/* 4. Cantidad */}
            <div className="flex justify-between items-center bg-gray-50 rounded px-1.5 py-1 mt-1">
                <span className="text-gray-600 font-medium">Cantidad:</span>
                <div className="flex items-center gap-1">
                    {!hideMainQuantity && <span className="font-bold text-gray-900 text-sm">{stat.cantidad}</span>}
                    {suffix}
                </div>
            </div>
        </div>
    )

    return (
        <Card className={className}>
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Estadísticas de Matching</h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                        {totalVinculados} de {totalRegistrosExtracto} vinculados
                    </div>
                </div>

                {/* 5 Cards Row - Grid Layout */}
                <div className="grid grid-cols-5 gap-3">
                    {/* 1. Extracto */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-100">
                            <div className="p-1.5 bg-emerald-100 rounded-full shrink-0">
                                <TrendingUp size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Extracto</span>
                        </div>
                        <StatValuesGrid stat={estadisticas.total_extracto} />
                    </div>

                    {/* 2. Sistema */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-blue-100">
                            <div className="p-1.5 bg-blue-100 rounded-full shrink-0">
                                <TrendingDown size={16} className="text-blue-600" />
                            </div>
                            <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Sistema</span>
                        </div>
                        <StatValuesGrid
                            stat={estadisticas.total_sistema}
                            suffix={unmatchedSystemRecordsCount > 0 ? (
                                <div className="flex items-baseline gap-0.5">
                                    <span className="font-bold text-gray-900 text-sm">
                                        {estadisticas.total_sistema.cantidad - unmatchedSystemRecordsCount}
                                    </span>
                                    <span className="text-[10px] text-blue-600 font-medium">
                                        +{unmatchedSystemRecordsCount} <span className="text-[8px] opacity-70">TRÁN.</span>
                                    </span>
                                </div>
                            ) : undefined}
                            hideMainQuantity={unmatchedSystemRecordsCount > 0}
                        />
                    </div>

                    {/* 3. Sin Match */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                            <div className="p-1.5 bg-gray-200 rounded-full shrink-0">
                                <XCircle size={16} className="text-gray-600" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sin Match</span>
                        </div>
                        <StatValuesGrid stat={estadisticas.sin_match} />
                    </div>

                    {/* 4. Matches Probables */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-amber-100">
                            <div className="p-1.5 bg-amber-100 rounded-full shrink-0">
                                <AlertCircle size={16} className="text-amber-600" />
                            </div>
                            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Probables</span>
                        </div>
                        <StatValuesGrid stat={estadisticas.probables} />
                    </div>

                    {/* 5. Matches OK */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col h-full">
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-100">
                            <div className="p-1.5 bg-emerald-100 rounded-full shrink-0">
                                <CheckCircle size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">OK</span>
                        </div>
                        <StatValuesGrid stat={estadisticas.ok} />
                    </div>
                </div>

                {/* Ignorados - Only show if > 0 */}
                {estadisticas.ignorados.cantidad > 0 && (
                    <div className="flex justify-end">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs text-red-700">
                            <EyeOff size={12} />
                            <span>{estadisticas.ignorados.cantidad} ignorados ({formatCurrency(estadisticas.ignorados.total)})</span>
                        </div>
                    </div>
                )}

                {/* Barra de progreso visual */}
                <div className="pt-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        {estadisticas.sin_match.cantidad > 0 && (
                            <div
                                className="bg-gray-400 h-full"
                                style={{ width: `${(estadisticas.sin_match.cantidad / totalRegistrosExtracto) * 100}%` }}
                                title={`${estadisticas.sin_match.cantidad} sin match (${porcentajeSinMatch}%)`}
                            />
                        )}
                        {estadisticas.probables.cantidad > 0 && (
                            <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(estadisticas.probables.cantidad / totalRegistrosExtracto) * 100}%` }}
                                title={`${estadisticas.probables.cantidad} probables (${porcentajeProbables}%)`}
                            />
                        )}
                        {estadisticas.ok.cantidad > 0 && (
                            <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${(estadisticas.ok.cantidad / totalRegistrosExtracto) * 100}%` }}
                                title={`${estadisticas.ok.cantidad} OK (${porcentajeOk}%)`}
                            />
                        )}
                        {estadisticas.ignorados.cantidad > 0 && (
                            <div
                                className="bg-red-400 h-full"
                                style={{ width: `${(estadisticas.ignorados.cantidad / totalRegistrosExtracto) * 100}%` }}
                                title={`${estadisticas.ignorados.cantidad} ignorados`}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}
