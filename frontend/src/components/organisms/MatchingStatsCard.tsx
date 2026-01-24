import { TrendingUp, TrendingDown, CheckCircle, AlertCircle, XCircle, EyeOff } from 'lucide-react'
import { Card } from '../atoms/Card'
import type { MatchingEstadisticas } from '../../types/Matching'

interface MatchingStatsCardProps {
    estadisticas: MatchingEstadisticas
    className?: string
    unmatchedSystemRecordsCount?: number
}

/**
 * Tarjeta con estadísticas del matching
 * 
 * Muestra un resumen visual de los resultados del matching incluyendo
 * totales, matches exactos, probables, sin match, traslados e ignorados.
 */
export const MatchingStatsCard = ({
    estadisticas,
    className = '',
    unmatchedSystemRecordsCount = 0
}: MatchingStatsCardProps) => {
    const totalMatches = estadisticas.exactos + estadisticas.probables
    const porcentajeExactos = estadisticas.total_extracto > 0
        ? (estadisticas.exactos / estadisticas.total_extracto * 100).toFixed(1)
        : '0'
    const porcentajeProbables = estadisticas.total_extracto > 0
        ? (estadisticas.probables / estadisticas.total_extracto * 100).toFixed(1)
        : '0'
    const porcentajeSinMatch = estadisticas.total_extracto > 0
        ? (estadisticas.sin_match / estadisticas.total_extracto * 100).toFixed(1)
        : '0'

    return (
        <Card className={className}>
            <div className="space-y-2">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Estadísticas de Matching</h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                        {totalMatches} de {estadisticas.total_extracto} vinculados
                    </div>
                </div>

                {/* 5 Cards Row */}
                <div className="grid grid-cols-5 gap-2">
                    {/* 1. Extracto */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-emerald-100 rounded-full">
                                <TrendingUp size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-emerald-700">Extracto</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-900">
                            {estadisticas.total_extracto}
                        </p>
                    </div>

                    {/* 2. Sistema */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-blue-100 rounded-full">
                                <TrendingDown size={16} className="text-blue-600" />
                            </div>
                            <span className="text-xs font-medium text-blue-700">Sistema</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <p className="text-2xl font-bold text-blue-900 leading-none">
                                {estadisticas.total_sistema - unmatchedSystemRecordsCount}
                            </p>
                            {unmatchedSystemRecordsCount > 0 && (
                                <span className="text-[10px] text-blue-600 font-medium mt-1">
                                    + {unmatchedSystemRecordsCount} en tránsito
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 3. Sin Match */}
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-gray-200 rounded-full">
                                <XCircle size={16} className="text-gray-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">Sin Match</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-gray-900">{estadisticas.sin_match}</p>
                            <span className="text-xs text-gray-500 font-medium">
                                {porcentajeSinMatch}%
                            </span>
                        </div>
                    </div>

                    {/* 4. Matches Probables */}
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-amber-100 rounded-full">
                                <AlertCircle size={16} className="text-amber-600" />
                            </div>
                            <span className="text-xs font-medium text-amber-700">Probables</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-amber-900">{estadisticas.probables}</p>
                            <span className="text-xs text-amber-600 font-medium">
                                {porcentajeProbables}%
                            </span>
                        </div>
                    </div>

                    {/* 5. Matches Exactos */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-emerald-100 rounded-full">
                                <CheckCircle size={16} className="text-emerald-600" />
                            </div>
                            <span className="text-xs font-medium text-emerald-700">Exactos</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-emerald-900">{estadisticas.exactos}</p>
                            <span className="text-xs text-emerald-600 font-medium">
                                {porcentajeExactos}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Ignorados - Only show if > 0 */}
                {estadisticas.ignorados > 0 && (
                    <div className="flex justify-end">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-100 rounded-full text-xs text-red-700">
                            <EyeOff size={12} />
                            <span>{estadisticas.ignorados} ignorados</span>
                        </div>
                    </div>
                )}

                {/* Barra de progreso visual */}
                <div className="pt-2">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        {estadisticas.sin_match > 0 && (
                            <div
                                className="bg-gray-400 h-full"
                                style={{ width: `${(estadisticas.sin_match / estadisticas.total_extracto) * 100}%` }}
                                title={`${estadisticas.sin_match} sin match`}
                            />
                        )}
                        {estadisticas.probables > 0 && (
                            <div
                                className="bg-amber-500 h-full"
                                style={{ width: `${(estadisticas.probables / estadisticas.total_extracto) * 100}%` }}
                                title={`${estadisticas.probables} probables`}
                            />
                        )}
                        {estadisticas.exactos > 0 && (
                            <div
                                className="bg-emerald-500 h-full"
                                style={{ width: `${(estadisticas.exactos / estadisticas.total_extracto) * 100}%` }}
                                title={`${estadisticas.exactos} exactos`}
                            />
                        )}
                        {estadisticas.ignorados > 0 && (
                            <div
                                className="bg-red-400 h-full"
                                style={{ width: `${(estadisticas.ignorados / estadisticas.total_extracto) * 100}%` }}
                                title={`${estadisticas.ignorados} ignorados`}
                            />
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}
