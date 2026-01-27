
import { Calendar, FileText, DollarSign, User, Building2, Tag } from 'lucide-react'
import { CurrencyDisplay } from '../atoms/CurrencyDisplay'
import type { MovimientoSistema } from '../../types/Matching'

interface MovimientoSistemaCardProps {
    movimiento: MovimientoSistema
    className?: string
    compact?: boolean
}

/**
 * Tarjeta para mostrar un movimiento del sistema
 * 
 * Muestra la información completa del movimiento incluyendo fecha,
 * descripción, referencia, valor, tercero, centro de costo y concepto.
 */
export const MovimientoSistemaCard = ({
    movimiento,
    className = '',
    compact = false
}: MovimientoSistemaCardProps) => {
    const isNegative = movimiento.valor < 0
    const valorAbsoluto = Math.abs(movimiento.valor)

    return (
        <div className={`bg-white rounded-lg border border-blue-200 p-4 ${className}`}>
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
                    {isNegative ? 'Egreso' : 'Ingreso'}
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
                        colorize={false}
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

            {/* Clasificación */}
            {!compact && (
                <div className="mt-3 pt-3 border-t border-blue-100 space-y-2">
                    {movimiento.tercero_nombre && (
                        <div className="flex items-center gap-2 text-sm">
                            <User size={14} className="text-blue-500" />
                            <span className="text-gray-600">Tercero:</span>
                            <span className="font-medium text-gray-800">{movimiento.tercero_nombre}</span>
                        </div>
                    )}
                    {movimiento.centro_costo_nombre && (
                        <div className="flex items-center gap-2 text-sm">
                            <Building2 size={14} className="text-blue-500" />
                            <span className="text-gray-600">Centro:</span>
                            <span className="font-medium text-gray-800">{movimiento.centro_costo_nombre}</span>
                        </div>
                    )}
                    {movimiento.concepto_nombre && (
                        <div className="flex items-center gap-2 text-sm">
                            <Tag size={14} className="text-blue-500" />
                            <span className="text-gray-600">Concepto:</span>
                            <span className="font-medium text-gray-800">{movimiento.concepto_nombre}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ID Badge */}
            {!compact && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                        ID Sistema: {movimiento.id}
                    </span>
                </div>
            )}
        </div>
    )
}
