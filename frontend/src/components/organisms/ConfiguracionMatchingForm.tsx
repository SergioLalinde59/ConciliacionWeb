import React, { useState } from 'react'
import { Save, X } from 'lucide-react'
import type { ConfiguracionMatching, ConfiguracionMatchingUpdate } from '../../types/Matching'

interface ConfiguracionMatchingFormProps {
    configuracion: ConfiguracionMatching
    onSave: (config: ConfiguracionMatchingUpdate) => Promise<void>
    onCancel: () => void
    className?: string
}

/**
 * Formulario para configurar el algoritmo de matching
 * 
 * Permite ajustar tolerancias, pesos, scores mínimos y palabras clave
 * para traslados. Incluye validaciones en tiempo real.
 */
export const ConfiguracionMatchingForm = ({
    configuracion,
    onSave,
    onCancel,
    className = ''
}: ConfiguracionMatchingFormProps) => {
    const [formData, setFormData] = useState<ConfiguracionMatchingUpdate>({
        tolerancia_valor: configuracion.tolerancia_valor,
        similitud_descripcion_minima: configuracion.similitud_descripcion_minima,
        peso_fecha: configuracion.peso_fecha,
        peso_valor: configuracion.peso_valor,
        peso_descripcion: configuracion.peso_descripcion,
        score_minimo_exacto: configuracion.score_minimo_exacto,
        score_minimo_probable: configuracion.score_minimo_probable
    })

    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const sumaPesos = formData.peso_fecha + formData.peso_valor + formData.peso_descripcion

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}

        if (Math.abs(sumaPesos - 1.0) > 0.01) {
            newErrors.pesos = 'Los pesos deben sumar 1.00'
        }

        if (formData.score_minimo_exacto < formData.score_minimo_probable) {
            newErrors.scores = 'El score exacto debe ser mayor o igual al probable'
        }

        if (formData.tolerancia_valor <= 0) {
            newErrors.tolerancia = 'La tolerancia debe ser positiva'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validate()) return

        setLoading(true)
        try {
            await onSave(formData)
        } finally {
            setLoading(false)
        }
    }



    return (
        <form onSubmit={handleSubmit} className={`bg-white rounded-xl p-6 space-y-6 ${className}`}>
            <h2 className="text-xl font-bold text-gray-900">Configuración del Algoritmo</h2>

            {/* Tolerancias */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Tolerancias</h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tolerancia de Valor (COP)
                    </label>
                    <input
                        type="number"
                        value={formData.tolerancia_valor}
                        onChange={(e) => setFormData({ ...formData, tolerancia_valor: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="10"
                    />
                    {errors.tolerancia && <p className="text-xs text-red-600 mt-1">{errors.tolerancia}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Similitud Mínima de Descripción
                    </label>
                    <input
                        type="number"
                        value={formData.similitud_descripcion_minima}
                        onChange={(e) => setFormData({ ...formData, similitud_descripcion_minima: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        max="1"
                        step="0.05"
                    />
                </div>
            </div>

            {/* Pesos */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Pesos (deben sumar 1.00)</h3>
                    <span className={`text-sm font-medium ${Math.abs(sumaPesos - 1.0) <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        Suma: {sumaPesos.toFixed(2)}
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Peso Fecha</label>
                        <input
                            type="number"
                            value={formData.peso_fecha}
                            onChange={(e) => setFormData({ ...formData, peso_fecha: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            max="1"
                            step="0.05"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Peso Valor</label>
                        <input
                            type="number"
                            value={formData.peso_valor}
                            onChange={(e) => setFormData({ ...formData, peso_valor: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            max="1"
                            step="0.05"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Peso Descripción</label>
                        <input
                            type="number"
                            value={formData.peso_descripcion}
                            onChange={(e) => setFormData({ ...formData, peso_descripcion: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            min="0"
                            max="1"
                            step="0.05"
                        />
                    </div>
                </div>
                {errors.pesos && <p className="text-xs text-red-600">{errors.pesos}</p>}
            </div>

            {/* Scores Mínimos */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Scores Mínimos</h3>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Score Mínimo OK</label>
                        <input
                            type="number"
                            value={formData.score_minimo_exacto}
                            onChange={(e) => setFormData({ ...formData, score_minimo_exacto: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            min="0"
                            max="1"
                            step="0.05"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Score Mínimo Probable</label>
                        <input
                            type="number"
                            value={formData.score_minimo_probable}
                            onChange={(e) => setFormData({ ...formData, score_minimo_probable: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            min="0"
                            max="1"
                            step="0.05"
                        />
                    </div>
                </div>
                {errors.scores && <p className="text-xs text-red-600">{errors.scores}</p>}
            </div>



            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Save size={18} />
                    {loading ? 'Guardando...' : 'Guardar Configuración'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                    <X size={18} />
                </button>
            </div>
        </form>
    )
}
