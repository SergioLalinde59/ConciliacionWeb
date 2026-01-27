
import { ScoreIndicator } from '../atoms/ScoreIndicator'
import { Info } from 'lucide-react'

interface MatchScoreBreakdownProps {
    scoreFecha: number
    scoreValor: number
    scoreDescripcion: number
    scoreTotal: number
    className?: string
    showTooltips?: boolean
}

/**
 * Desglose visual de los scores de similitud de un match
 * 
 * Muestra los scores individuales (fecha, valor, descripción)
 * y el score total ponderado con indicadores visuales.
 */
export const MatchScoreBreakdown = ({
    scoreFecha,
    scoreValor,
    scoreDescripcion,
    scoreTotal,
    className = '',
    showTooltips = true
}: MatchScoreBreakdownProps) => {
    const tooltips = {
        fecha: 'Similitud basada en la cercanía de fechas entre movimientos',
        valor: 'Similitud basada en la diferencia de valores monetarios',
        descripcion: 'Similitud basada en el texto de las descripciones',
        total: 'Score ponderado combinando fecha, valor y descripción'
    }

    const TooltipIcon = ({ text }: { text: string }) => (
        <div className="group relative inline-block">
            <Info size={14} className="text-gray-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 w-48">
                <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            </div>
        </div>
    )

    return (
        <div className={`bg-gray-50 rounded-lg p-4 space-y-3 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-700">Scores de Similitud</h4>
                {showTooltips && <TooltipIcon text={tooltips.total} />}
            </div>

            {/* Score Total (destacado) */}
            <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                <ScoreIndicator
                    score={scoreTotal}
                    label="Score Total"
                    size="lg"
                    showPercentage={true}
                />
            </div>

            {/* Scores Individuales */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <ScoreIndicator
                            score={scoreFecha}
                            label="Fecha"
                            size="sm"
                            showPercentage={true}
                        />
                    </div>
                    {showTooltips && <TooltipIcon text={tooltips.fecha} />}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <ScoreIndicator
                            score={scoreValor}
                            label="Valor"
                            size="sm"
                            showPercentage={true}
                        />
                    </div>
                    {showTooltips && <TooltipIcon text={tooltips.valor} />}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1">
                        <ScoreIndicator
                            score={scoreDescripcion}
                            label="Descripción"
                            size="sm"
                            showPercentage={true}
                        />
                    </div>
                    {showTooltips && <TooltipIcon text={tooltips.descripcion} />}
                </div>
            </div>

            {/* Leyenda de colores */}
            <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span>≥95% Excelente</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span>≥70% Bueno</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span>\u003c70% Bajo</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
