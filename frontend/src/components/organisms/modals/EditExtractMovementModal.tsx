import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { Input } from '../../atoms/Input'
import { Button } from '../../atoms/Button'
import { CurrencyInput } from '../../molecules/CurrencyInput'
import type { ExtractDetailRow } from '../ExtractDetailsTable'

interface EditExtractMovementModalProps {
    isOpen: boolean
    onClose: () => void
    movimiento?: ExtractDetailRow
    onSave: (data: ExtractDetailRow) => void
}

export const EditExtractMovementModal = ({ isOpen, onClose, movimiento, onSave }: EditExtractMovementModalProps) => {
    const [formData, setFormData] = useState<Partial<ExtractDetailRow>>({})
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && movimiento) {
            setFormData({ ...movimiento })
        } else {
            setFormData({})
        }
        setError(null)
    }, [isOpen, movimiento])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.fecha || !formData.valor) {
            setError("Fecha y Valor son requeridos")
            return
        }

        // Return full object merged
        onSave({ ...movimiento, ...formData } as ExtractDetailRow)
        onClose()
    }

    if (!isOpen || !movimiento) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Edit2 size={18} className="text-blue-600" />
                        Editar Movimiento Extracto
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-100">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <Input
                            label="Fecha"
                            type="date"
                            value={formData.fecha || ''}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            required
                            className="text-sm"
                        />

                        <Input
                            label="Descripción"
                            value={formData.descripcion || ''}
                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                            required
                            placeholder="Descripción del movimiento"
                            className="text-sm"
                        />

                        <Input
                            label="Referencia"
                            value={formData.referencia || ''}
                            onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                            placeholder="Opcional"
                            className="text-sm"
                        />

                        <CurrencyInput
                            label="Valor (COP)"
                            value={formData.valor !== undefined ? Number(formData.valor) : null}
                            onChange={(val) => setFormData({ ...formData, valor: val || 0 })}
                            currency="COP"
                            required
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                            size="sm"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            icon={Save}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            size="sm"
                        >
                            Guardar Cambios
                        </Button>
                    </div>
                </form>

                <div className="px-5 py-3 bg-gray-50 text-xs text-gray-400 border-t border-gray-100 italic text-center">
                    Original PDF: {movimiento.raw_text || 'No disponible'}
                </div>
            </div>
        </div>
    )
}

import { Edit2 } from 'lucide-react'
