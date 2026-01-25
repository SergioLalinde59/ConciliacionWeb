import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, Trash2 } from 'lucide-react'
import { Input } from '../../atoms/Input'
import { Select } from '../../atoms/Select'
import { Button } from '../../atoms/Button'
import { CurrencyInput } from '../../molecules/CurrencyInput'
import { catalogosService } from '../../../services/catalogs.service'
import { cuentasService } from '../../../services/api'
import type { Cuenta } from '../../../types'

interface MovimientoModalProps {
    isOpen: boolean
    onClose: () => void
    movimiento?: any
    onSave: (data: any) => Promise<void>
    mode?: 'create' | 'edit' | 'delete'
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

export const MovimientoModal = ({ isOpen, onClose, movimiento, onSave, mode = 'create' }: MovimientoModalProps) => {
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

    const isReadOnly = mode === 'delete'
    const title = mode === 'delete' ? 'Borrar Movimiento' : (movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento')
    const submitLabel = mode === 'delete' ? 'Confirmar Borrado' : 'Guardar Movimiento'
    const submitIcon = mode === 'delete' ? Trash2 : Save

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
        if (isReadOnly) return
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
            if (mode === 'delete') {
                await onSave(movimiento) // Pass full object or ID for delete
            } else {
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
            }
            onClose()
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al procesar")
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto ${mode === 'delete' ? 'border-2 border-red-500' : ''}`}>
                <div className={`flex justify-between items-center p-6 border-b ${mode === 'delete' ? 'bg-red-50 border-red-100' : 'border-gray-100'}`}>
                    <h2 className={`text-xl font-bold ${mode === 'delete' ? 'text-red-700' : 'text-gray-900'}`}>
                        {title}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {mode === 'delete' && (
                        <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3 text-sm mb-4 border border-red-200">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">¿Estás seguro de que deseas eliminar este movimiento?</p>
                                <p>Esta acción no se puede deshacer.</p>
                            </div>
                        </div>
                    )}

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
                            onChange={e => !isReadOnly && setFormData({ ...formData, fecha: e.target.value })}
                            required
                            disabled={isReadOnly}
                        />
                        <Select
                            label="Cuenta"
                            value={formData.cuenta_id}
                            onChange={e => !isReadOnly && setFormData({ ...formData, cuenta_id: e.target.value })}
                            required
                            disabled={isReadOnly}
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
                        onChange={e => !isReadOnly && setFormData({ ...formData, descripcion: e.target.value })}
                        required
                        placeholder="Descripción del movimiento"
                        disabled={isReadOnly}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Referencia"
                            value={formData.referencia}
                            onChange={e => !isReadOnly && setFormData({ ...formData, referencia: e.target.value })}
                            placeholder="Opcional"
                            disabled={isReadOnly}
                        />
                        <CurrencyInput
                            label="Valor"
                            value={formData.valor ? parseFloat(formData.valor) : null}
                            onChange={(val) => handleCurrencyChange(val, 'valor')}
                            currency="COP"
                            required
                            disabled={isReadOnly}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <CurrencyInput
                            label="USD (Opcional)"
                            value={formData.usd ? parseFloat(formData.usd) : null}
                            onChange={(val) => handleCurrencyChange(val, 'usd')}
                            currency="USD"
                            disabled={isReadOnly}
                        />
                        <CurrencyInput
                            label="TRM (Opcional)"
                            value={formData.trm ? parseFloat(formData.trm) : null}
                            onChange={(val) => handleCurrencyChange(val, 'trm')}
                            currency="TRM"
                            disabled={isReadOnly}
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100 mt-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Clasificación Contable</h3>

                        <div className="space-y-4">
                            <Select
                                label="Tercero"
                                value={formData.tercero_id}
                                onChange={e => !isReadOnly && setFormData({ ...formData, tercero_id: e.target.value })}
                                disabled={isReadOnly}
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
                                    onChange={e => !isReadOnly && setFormData({ ...formData, centro_costo_id: e.target.value })}
                                    disabled={isReadOnly}
                                >
                                    <option value="">Seleccione...</option>
                                    {centrosCostos.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </Select>

                                <Select
                                    label="Concepto"
                                    value={formData.concepto_id}
                                    onChange={e => !isReadOnly && setFormData({ ...formData, concepto_id: e.target.value })}
                                    disabled={isReadOnly}
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
                            icon={submitIcon}
                            className={`flex-1 text-white ${mode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
