import { useState, useEffect } from 'react'
import type { Movimiento, ItemCatalogo, ClasificacionManual } from '../types'
import { CurrencyDisplay } from './atoms/CurrencyDisplay'

interface Props {
    isOpen: boolean
    movimiento: Movimiento | null
    terceros: ItemCatalogo[]
    grupos: ItemCatalogo[]
    conceptos: ItemCatalogo[]
    onClose: () => void
    onSave: (datos: ClasificacionManual) => void
}

export const ClassificationModal = ({
    isOpen, movimiento, terceros, grupos, conceptos, onClose, onSave
}: Props) => {
    const [formValues, setFormValues] = useState<ClasificacionManual>({
        tercero_id: 0,
        grupo_id: 0,
        concepto_id: 0
    })

    // Reiniciar form al abrir modal
    useEffect(() => {
        if (isOpen) {
            setFormValues({
                tercero_id: 0,
                grupo_id: 0,
                concepto_id: 0
            })
        }
    }, [isOpen, movimiento])

    if (!isOpen || !movimiento) return null

    // Filtrar conceptos
    const conceptosFiltrados = formValues.grupo_id
        ? conceptos.filter(c => c.grupo_id === Number(formValues.grupo_id))
        : []

    const handleSubmit = () => {
        if (!formValues.tercero_id || !formValues.grupo_id || !formValues.concepto_id) {
            alert("Por favor seleccione todos los campos")
            return
        }
        onSave(formValues)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in-up">
                <h3 className="text-xl font-bold mb-4 text-gray-800">Clasificar Movimiento</h3>

                <div className="mb-6 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="font-medium text-blue-900">{movimiento.descripcion}</p>
                    <div className="flex justify-between mt-2">
                        <span className="text-blue-700">{movimiento.fecha}</span>
                        <CurrencyDisplay value={Number(movimiento.valor)} className="font-mono font-bold" />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tercero</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            value={formValues.tercero_id}
                            onChange={e => setFormValues({ ...formValues, tercero_id: Number(e.target.value) })}
                        >
                            <option value={0}>Seleccione un tercero...</option>
                            {terceros.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Grupo</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            value={formValues.grupo_id}
                            onChange={e => setFormValues({ ...formValues, grupo_id: Number(e.target.value), concepto_id: 0 })}
                        >
                            <option value={0}>Seleccione un grupo...</option>
                            {grupos.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Concepto</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                            value={formValues.concepto_id}
                            onChange={e => setFormValues({ ...formValues, concepto_id: Number(e.target.value) })}
                            disabled={formValues.grupo_id === 0}
                        >
                            <option value={0}>Seleccione un concepto...</option>
                            {conceptosFiltrados.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-3 border-t pt-4 border-gray-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm hover:shadow transition-all transform hover:-translate-y-0.5"
                    >
                        Guardar Clasificación
                    </button>
                </div>
            </div>
        </div>
    )
}
