
import { Calendar, FileText, DollarSign } from 'lucide-react'
import { CurrencyDisplay } from '../atoms/CurrencyDisplay'
import type { MovimientoExtracto } from '../../types/Matching'

interface MovimientoExtractoCardProps {
    movimiento: MovimientoExtracto
    className?: string
    compact?: boolean
}

/**
 * Tarjeta para mostrar un movimiento del extracto bancario
 * 
 * Muestra la información clave del movimiento incluyendo fecha,
 * descripción, referencia, valor en COP y USD/TRM si aplica.
 */
export const MovimientoExtractoCard = ({
    movimiento,
    className = '',
    compact = false
}: MovimientoExtractoCardProps) => {
    const isNegative = movimiento.valor < 0
    const valorAbsoluto = Math.abs(movimiento.valor)

    return (
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{new Date(movimiento.fecha).toLocaleDateString('es-CO')}</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs font-medium ${isNegative
                    ? 'bg-red-50 text-red-700 border border-red-100'
                    : 'bg-green-50 text-green-700 border border-green-100'
                    }`}>
                    {isNegative ? 'Salida' : 'Entrada'}
                </div>
            </div>

            {/* Descripción */}
            <div className="mb-3">
                <p className={`text-gray-800 font-medium ${compact ? 'text-sm' : 'text-base'} line-clamp-2`}>
                    {movimiento.descripcion}
                </p>
                {movimiento.referencia && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <FileText size={12} />
                        <span>Ref: {movimiento.referencia}</span>
                    </div>
                )}
            </div>

            {/* Valores */}
            <div className="space-y-2">
                {/* Valor COP */}
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valor COP:</span>
                    <CurrencyDisplay
                        value={valorAbsoluto}
                        className={`font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}
                    />
                </div>

                {/* USD y TRM si existen */}
                {(movimiento.usd !== null || movimiento.trm !== null) && (
                    <div className="pt-2 border-t border-gray-100 space-y-1">
                        {movimiento.usd !== null && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600 flex items-center gap-1">
                                    <DollarSign size={14} />
                                    USD:
                                </span>
                                <span className="font-semibold text-gray-700">
                                    ${Math.abs(movimiento.usd).toFixed(2)}
                                </span>
                            </div>
                        )}
                        {movimiento.trm !== null && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">TRM:</span>
                                <span className="font-medium text-gray-700">
                                    ${movimiento.trm.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ID Badge (solo si no es compact) */}
            {!compact && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                        ID Extracto: {movimiento.id}
                    </span>
                </div>
            )}
        </div>
    )
}
