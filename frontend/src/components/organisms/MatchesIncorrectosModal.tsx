import { AlertTriangle, X } from 'lucide-react'
import { formatCurrency } from '../atoms/CurrencyDisplay'

interface CasoProblematico {
    sistema_id: number
    sistema_descripcion: string
    sistema_valor: number
    sistema_fecha: string
    num_vinculaciones: number
    extracto_ids: number[]
    extracto_descripciones: string[]
    extracto_valores: number[]
    extracto_fechas: string[]
}

interface MatchesIncorrectosModalProps {
    casos: CasoProblematico[]
    totalMovimientosSistema: number
    totalExtractos: number
    onClose: () => void
    onCorregir: () => Promise<void>
    isLoading?: boolean
}

export const MatchesIncorrectosModal = ({
    casos,
    totalMovimientosSistema,
    totalExtractos,
    onClose,
    onCorregir,
    isLoading = false
}: MatchesIncorrectosModalProps) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Matches Incorrectos Detectados (1 → Múltiples)
                            </h3>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {totalMovimientosSistema} movimiento{totalMovimientosSistema !== 1 ? 's' : ''} del sistema vinculado{totalMovimientosSistema !== 1 ? 's' : ''} a {totalExtractos} extractos
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                            <strong>ℹ️ El extracto es la fuente de verdad.</strong> Los siguientes movimientos del sistema están vinculados a MÚLTIPLES extractos.
                            Esto es incorrecto (debe ser 1-a-1). Al corregir, se desvinculará TODOS estos extractos para que puedas revisar manualmente.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {casos.map((caso, idx) => (
                            <div key={caso.sistema_id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Encabezado del caso */}
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-900">
                                            Caso {idx + 1}: Sistema ID {caso.sistema_id}
                                        </h4>
                                        <span className="text-sm text-gray-600">
                                            Vinculado a {caso.num_vinculaciones} extractos
                                        </span>
                                    </div>
                                </div>

                                {/* Detalles */}
                                <div className="p-4">
                                    {/* Movimiento del Sistema */}
                                    <div className="mb-4">
                                        <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                                            Movimiento del Sistema
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">
                                                        {caso.sistema_descripcion}
                                                    </p>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {new Date(caso.sistema_fecha).toLocaleDateString('es-CO')}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-semibold ${caso.sistema_valor < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {formatCurrency(caso.sistema_valor)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Extractos Vinculados */}
                                    <div>
                                        <div className="text-xs font-medium text-gray-500 uppercase mb-2">
                                            Extractos Vinculados (Incorrecto)
                                        </div>
                                        <div className="space-y-2">
                                            {caso.extracto_ids.map((extractoId, i) => (
                                                <div key={extractoId} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-medium text-gray-500">
                                                                    ID {extractoId}
                                                                </span>
                                                                <span className="text-xs text-gray-400">•</span>
                                                                <span className="text-xs text-gray-500">
                                                                    {new Date(caso.extracto_fechas[i]).toLocaleDateString('es-CO')}
                                                                </span>
                                                            </div>
                                                            <p className="font-medium text-gray-900 truncate">
                                                                {caso.extracto_descripciones[i]}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-semibold ${caso.extracto_valores[i] < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatCurrency(caso.extracto_valores[i])}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Resumen de acción */}
                    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Al corregir:</h4>
                        <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Se desvinculará {totalExtractos} extractos</li>
                            <li>• Quedarán marcados como "Faltantes en Sistema"</li>
                            <li>• Deberás crear los movimientos faltantes en el sistema</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            disabled={isLoading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onCorregir}
                            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Corrigiendo...' : 'Corregir Matches'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
