
import { Filter, X } from 'lucide-react'
import { MatchEstado } from '../../types/Matching'

interface MatchingFiltersProps {
    selectedEstados: MatchEstado[]
    onEstadosChange: (estados: MatchEstado[]) => void
    minScore: number
    onMinScoreChange: (score: number) => void

    soloConfirmados: boolean
    onSoloConfirmadosChange: (value: boolean) => void
    onLimpiar: () => void
    className?: string
}

/**
 * Filtros para la vista de matching
 * 
 * Permite filtrar matches por estado, score mínimo, traslados y confirmación.
 */
export const MatchingFilters = ({
    selectedEstados,
    onEstadosChange,
    minScore,
    onMinScoreChange,
    soloConfirmados,
    onSoloConfirmadosChange,
    onLimpiar,
    className = ''
}: MatchingFiltersProps) => {
    const toggleEstado = (estado: MatchEstado) => {
        if (selectedEstados.includes(estado)) {
            onEstadosChange(selectedEstados.filter(e => e !== estado))
        } else {
            onEstadosChange([...selectedEstados, estado])
        }
    }

    const estadosOptions = [
        { value: MatchEstado.SIN_MATCH, label: 'Sin Match', color: 'gray' },
        { value: MatchEstado.PROBABLE, label: 'Probable', color: 'amber' },
        { value: MatchEstado.EXACTO, label: 'Exacto', color: 'emerald' }
    ]

    const hasActiveFilters = selectedEstados.length > 0 || minScore > 0 || soloConfirmados

    return (
        <div className={`bg-white rounded-xl border border-gray-200 p-3 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Filtros</h3>
                </div>
                {hasActiveFilters && (
                    <button
                        onClick={onLimpiar}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <X size={16} />
                        Limpiar
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {/* Line 1: Estado del Match + Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Estado del Match:
                    </label>
                    {estadosOptions.map(({ value, label, color }) => {
                        const isSelected = selectedEstados.includes(value)
                        return (
                            <button
                                key={value}
                                onClick={() => toggleEstado(value)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${isSelected
                                    ? `bg-${color}-100 text-${color}-700 border-2 border-${color}-300`
                                    : 'bg-gray-50 text-gray-600 border-2 border-transparent hover:border-gray-200'
                                    }`}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                {/* Line 2: Checkboxes + Score Slider */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Checkboxes */}


                    <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={soloConfirmados}
                            onChange={(e) => onSoloConfirmadosChange(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Solo confirmados por usuario</span>
                    </label>

                    {/* Score Slider */}
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                            Score: {(minScore * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={minScore}
                            onChange={(e) => onMinScoreChange(parseFloat(e.target.value))}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
