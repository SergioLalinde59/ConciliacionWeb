import { useState, useEffect } from 'react'
import { X, Save, AlertCircle } from 'lucide-react'
import { Input } from '../../atoms/Input'
import { Select } from '../../atoms/Select'
import { Button } from '../../atoms/Button'
import { CurrencyInput } from '../../molecules/CurrencyInput'
import { catalogosService } from '../../../services/catalogs.service'
import { cuentasService } from '../../../services/api'
// MovimientoSistema import removed
import type { Cuenta } from '../../../types'

interface MovimientoModalProps {
    isOpen: boolean
    onClose: () => void
    movimiento?: any // Usamos any por flexibilidad temporal, luego tipar estricto
    onSave: (data: any) => Promise<void>
}

interface FormData {
    fecha: string
    descripcion: string
    referencia: string
    valor: string
    usd: string
    trm: string
    moneda_id: string
    cuenta_id: string
    tercero_id: string
    centro_costo_id: string
    concepto_id: string
}

export const MovimientoModal = ({ isOpen, onClose, movimiento, onSave }: MovimientoModalProps) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Catalogos
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [terceros, setTerceros] = useState<any[]>([])
    const [centrosCostos, setCentrosCostos] = useState<any[]>([])
    const [conceptos, setConceptos] = useState<any[]>([])

    const [formData, setFormData] = useState<FormData>({
        fecha: '',
        descripcion: '',
        referencia: '',
        valor: '',
        usd: '',
        trm: '',
        moneda_id: '1', // Default COP
        cuenta_id: '',
        tercero_id: '',
        centro_costo_id: '',
        concepto_id: ''
    })

    useEffect(() => {
        if (isOpen) {
            cargarMaestros()
            if (movimiento) {
                setFormData({
                    fecha: movimiento.fecha ? movimiento.fecha.split('T')[0] : '',
                    descripcion: movimiento.descripcion || '',
                    referencia: movimiento.referencia || '',
                    valor: movimiento.valor?.toString() || '',
                    usd: movimiento.usd?.toString() || '',
                    trm: movimiento.trm?.toString() || '',
                    moneda_id: movimiento.moneda_id?.toString() || '1',
                    cuenta_id: movimiento.cuenta_id?.toString() || '',
                    tercero_id: movimiento.tercero_id?.toString() || '',
                    centro_costo_id: movimiento.centro_costo_id?.toString() || '',
                    concepto_id: movimiento.concepto_id?.toString() || ''
                })
            } else {
                // Reset
                const today = new Date().toISOString().split('T')[0]
                setFormData({
                    fecha: today,
                    descripcion: '',
                    referencia: '',
                    valor: '',
                    usd: '',
                    trm: '',
                    moneda_id: '1',
                    cuenta_id: '',
                    tercero_id: '',
                    centro_costo_id: '',
                    concepto_id: ''
                })
            }
        }
    }, [isOpen, movimiento])

    const cargarMaestros = async () => {
        try {
            const [cuentasData, catalogosData] = await Promise.all([
                cuentasService.listar(),
                catalogosService.obtenerTodos()
            ])
            setCuentas(cuentasData)
            setTerceros(catalogosData.terceros || [])
            setCentrosCostos(catalogosData.centros_costos || [])
            setConceptos(catalogosData.conceptos || [])
        } catch (err) {
            console.error("Error cargando maestros:", err)
            setError("Error cargando listas desplegables")
        }
    }

    const handleCurrencyChange = (val: number | null, field: 'valor' | 'usd' | 'trm') => {
        setFormData(prev => ({
            ...prev,
            [field]: val === null ? '' : val.toString()
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const payload = {
                fecha: formData.fecha,
                descripcion: formData.descripcion,
                referencia: formData.referencia || null,
                valor: formData.valor ? parseFloat(formData.valor) : 0, // Valor required
                usd: formData.usd ? parseFloat(formData.usd) : null,
                trm: formData.trm ? parseFloat(formData.trm) : null,
                moneda_id: parseInt(formData.moneda_id),
                cuenta_id: parseInt(formData.cuenta_id),
                tercero_id: formData.tercero_id ? parseInt(formData.tercero_id) : null,
                centro_costo_id: formData.centro_costo_id ? parseInt(formData.centro_costo_id) : null,
                concepto_id: formData.concepto_id ? parseInt(formData.concepto_id) : null
            }

            await onSave(payload)
            onClose()
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al guardar")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">
                        {movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Fecha"
                            type="date"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            required
                        />
                        <Select
                            label="Cuenta"
                            value={formData.cuenta_id}
                            onChange={e => setFormData({ ...formData, cuenta_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione Cuenta...</option>
                            {cuentas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </Select>
                    </div>

                    <Input
                        label="Descripción"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                        placeholder="Descripción del movimiento"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Referencia"
                            value={formData.referencia}
                            onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                            placeholder="Opcional"
                        />
                        <CurrencyInput
                            label="Valor"
                            value={formData.valor ? parseFloat(formData.valor) : null}
                            onChange={(val) => handleCurrencyChange(val, 'valor')}
                            currency="COP"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CurrencyInput
                            label="USD (Opcional)"
                            value={formData.usd ? parseFloat(formData.usd) : null}
                            onChange={(val) => handleCurrencyChange(val, 'usd')}
                            currency="USD"
                        />
                        <CurrencyInput
                            label="TRM (Opcional)"
                            value={formData.trm ? parseFloat(formData.trm) : null}
                            onChange={(val) => handleCurrencyChange(val, 'trm')}
                            currency="TRM"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Clasificación Contable</h3>

                        <div className="space-y-4">
                            <Select
                                label="Tercero"
                                value={formData.tercero_id}
                                onChange={e => setFormData({ ...formData, tercero_id: e.target.value })}
                            >
                                <option value="">Seleccione Tercero...</option>
                                {terceros.map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre || t.razon_social || t.id}</option>
                                ))}
                            </Select>

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Centro de Costo"
                                    value={formData.centro_costo_id}
                                    onChange={e => setFormData({ ...formData, centro_costo_id: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    {centrosCostos.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </Select>

                                <Select
                                    label="Concepto"
                                    value={formData.concepto_id}
                                    onChange={e => setFormData({ ...formData, concepto_id: e.target.value })}
                                >
                                    <option value="">Seleccione...</option>
                                    {conceptos.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-6 mt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            isLoading={loading}
                            icon={Save}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Guardar Movimiento
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
