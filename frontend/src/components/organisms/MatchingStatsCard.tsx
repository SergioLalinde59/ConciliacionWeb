import { TrendingUp, TrendingDown, CheckCircle, AlertCircle, XCircle, EyeOff } from 'lucide-react'
import { Card } from '../atoms/Card'
import type { MatchingEstadisticas } from '../../types/Matching'

interface MatchingStatsCardProps {
    estadisticas: MatchingEstadisticas
    className?: string
}

/**
 * Tarjeta con estadísticas del matching
 * 
 * Muestra un resumen visual de los resultados del matching incluyendo
 * totales, matches exactos, probables, sin match, traslados e ignorados.
 */
export const MatchingStatsCard = ({
    estadisticas,
    className = ''
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

    const totalProcesados = estadisticas.exactos + estadisticas.sin_match + estadisticas.ignorados

    return (
        <Card className={className}>
            <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">Estadísticas de Matching</h3>
                    <div className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full">
                        {totalMatches} de {estadisticas.total_extracto} vinculados
                    </div>
                </div>

                {/* Totales */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp size={16} className="text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">Extracto</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-900">
                            {estadisticas.total_extracto}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingDown size={16} className="text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">Sistema</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                            {estadisticas.total_sistema}
                        </p>
                    </div>
                </div>

                {/* Desglose de Estados - Horizontal Ribbon */}
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Desglose por Estado</h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Sin Match */}
                        <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-gray-400 rounded-full">
                                    <XCircle size={16} className="text-white" />
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Sin Match</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-gray-900">{estadisticas.sin_match}</p>
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                                    {porcentajeSinMatch}%
                                </span>
                            </div>
                        </div>

                        {/* Matches Probables */}
                        <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-xl hover:border-amber-300 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-amber-500 rounded-full">
                                    <AlertCircle size={16} className="text-white" />
                                </div>
                                <p className="text-xs text-amber-700 font-medium">Matches Probables</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-amber-900">{estadisticas.probables}</p>
                                <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                                    {porcentajeProbables}%
                                </span>
                            </div>
                        </div>

                        {/* Matches Exactos */}
                        <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:border-emerald-300 transition-colors">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="p-1.5 bg-emerald-500 rounded-full">
                                    <CheckCircle size={16} className="text-white" />
                                </div>
                                <p className="text-xs text-emerald-700 font-medium">Matches Exactos</p>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold text-emerald-900">{estadisticas.exactos}</p>
                                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 text-xs font-medium rounded-full">
                                    {porcentajeExactos}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Stats - Ignorados */}
                    {estadisticas.ignorados > 0 && (
                        <div className="flex gap-3 pt-1">
                            {estadisticas.ignorados > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg flex-1">
                                    <div className="p-1.5 bg-red-400 rounded">
                                        <EyeOff size={14} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-red-700 font-medium">Ignorados</p>
                                        <p className="text-base font-bold text-red-900">{estadisticas.ignorados}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Barra de progreso visual */}
                <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>Progreso de Revisión</span>
                        <span className="font-semibold">
                            {estadisticas.total_extracto > 0
                                ? ((totalProcesados / estadisticas.total_extracto) * 100).toFixed(0)
                                : '0'}%
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
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
                    <div className="flex items-center justify-between mt-2 text-xs">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                                <span className="text-gray-600">Sin Match</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-gray-600">Probables</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                <span className="text-gray-600">Exactos</span>
                            </div>
                            {estadisticas.ignorados > 0 && (
                                <div className="flex items-center gap-1">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <span className="text-gray-600">Ignorados</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}
