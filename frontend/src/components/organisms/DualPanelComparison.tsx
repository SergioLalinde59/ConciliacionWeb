
import { Link2, X, EyeOff, ArrowRight } from 'lucide-react'
import { MovimientoExtractoCard } from '../molecules/MovimientoExtractoCard'
import { MovimientoSistemaCard } from '../molecules/MovimientoSistemaCard'
import { MatchScoreBreakdown } from '../molecules/MatchScoreBreakdown'
import { MatchStatusBadge } from '../atoms/MatchStatusBadge'
import type { MovimientoMatch } from '../../types/Matching'
import { MatchEstado } from '../../types/Matching'

interface DualPanelComparisonProps {
    match: MovimientoMatch
    onVincular?: () => void
    onDesvincular?: () => void
    onIgnorar?: () => void
    className?: string
    showActions?: boolean
    loading?: boolean
}

/**
 * Panel dual para comparar movimientos lado a lado
 * 
 * Muestra el movimiento del extracto a la izquierda, el movimiento del sistema
 * a la derecha (si existe), y en el centro el estado del match con scores
 * y botones de acción.
 */
export const DualPanelComparison = ({
    match,
    onVincular,
    onDesvincular,
    onIgnorar,
    className = '',
    showActions = true,
    loading = false
}: DualPanelComparisonProps) => {
    const hasSystemMovement = match.mov_sistema !== null
    const canDesvincular = hasSystemMovement && match.estado !== MatchEstado.SIN_MATCH
    const canIgnorar = match.estado !== MatchEstado.IGNORADO

    return (
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto,1fr] gap-4 p-6">
                {/* Panel Izquierdo - Movimiento Extracto */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-gray-700">Extracto Bancario</h3>
                    </div>
                    <MovimientoExtractoCard
                        movimiento={match.mov_extracto}
                    />
                </div>

                {/* Panel Central - Estado y Acciones */}
                <div className="flex flex-col items-center justify-center gap-4 lg:px-6 lg:border-x border-gray-200 min-w-[280px]">
                    {/* Estado */}
                    <div className="text-center space-y-3">
                        <MatchStatusBadge estado={match.estado} size="md" />



                        {match.confirmado_por_usuario && (
                            <div className="text-xs text-gray-500">
                                ✓ Confirmado por usuario
                            </div>
                        )}
                    </div>

                    {/* Scores */}
                    {hasSystemMovement && (
                        <MatchScoreBreakdown
                            scoreFecha={match.score_fecha}
                            scoreValor={match.score_valor}
                            scoreDescripcion={match.score_descripcion}
                            scoreTotal={match.score_total}
                            className="w-full"
                        />
                    )}

                    {/* Notas */}
                    {match.notas && (
                        <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs text-amber-800">
                                <span className="font-semibold">Nota:</span> {match.notas}
                            </p>
                        </div>
                    )}

                    {/* Acciones */}
                    {showActions && !loading && (
                        <div className="w-full space-y-2">
                            {!hasSystemMovement && onVincular && (
                                <button
                                    onClick={onVincular}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Link2 size={16} />
                                    Vincular Manualmente
                                </button>
                            )}

                            {canDesvincular && onDesvincular && (
                                <button
                                    onClick={onDesvincular}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors text-sm font-medium border border-red-200"
                                >
                                    <X size={16} />
                                    Desvincular
                                </button>
                            )}

                            {canIgnorar && onIgnorar && (
                                <button
                                    onClick={onIgnorar}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors text-sm font-medium border border-gray-200"
                                >
                                    <EyeOff size={16} />
                                    Ignorar
                                </button>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="w-full flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    )}
                </div>

                {/* Panel Derecho - Movimiento Sistema */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-8 w-1 bg-blue-500 rounded-full"></div>
                        <h3 className="text-sm font-semibold text-gray-700">Sistema</h3>
                    </div>
                    {hasSystemMovement ? (
                        <MovimientoSistemaCard
                            movimiento={match.mov_sistema!}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-lg">
                            <div className="text-center text-gray-400">
                                <ArrowRight size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Sin movimiento vinculado</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer con metadata */}
            {match.created_by && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        Creado por: <span className="font-medium">{match.created_by}</span>
                        {match.id && <span className="ml-4">ID: {match.id}</span>}
                    </p>
                </div>
            )}
        </div>
    )
}
