import { useState, useEffect } from 'react'
import { X, Save, AlertCircle, Trash2, Plus } from 'lucide-react'
import { Input } from '../../atoms/Input'
import { Select } from '../../atoms/Select'
import { Button } from '../../atoms/Button'
import { CurrencyInput } from '../../molecules/CurrencyInput'
import { CurrencyDisplay } from '../../atoms/CurrencyDisplay'
import { EditableCurrencyCell } from '../../molecules/EditableCurrencyCell'
import { EntitySelector } from '../../molecules/entities/EntitySelector'
import { catalogosService } from '../../../services/catalogs.service'
import { cuentasService } from '../../../services/api'
import type { Cuenta, MovimientoDetalle } from '../../../types'

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
}

export const MovimientoModal = ({ isOpen, onClose, movimiento, onSave, mode = 'create' }: MovimientoModalProps) => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Catalogos
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [terceros, setTerceros] = useState<any[]>([])
    const [centrosCostos, setCentrosCostos] = useState<any[]>([])
    const [conceptos, setConceptos] = useState<any[]>([])

    // Form State
    const [formData, setFormData] = useState<FormData>({
        fecha: '',
        descripcion: '',
        referencia: '',
        valor: '',
        usd: '',
        trm: '',
        moneda_id: '1', // Default COP
        cuenta_id: '',
        tercero_id: ''
    })

    // Details (always active)
    const [detalles, setDetalles] = useState<MovimientoDetalle[]>([])

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
                    tercero_id: movimiento.tercero_id?.toString() || ''
                })

                if (movimiento.detalles && movimiento.detalles.length > 0) {
                    setDetalles(movimiento.detalles)
                } else {
                    // Initialize with 2 empty rows
                    setDetalles([
                        { valor: 0, tercero_id: null, centro_costo_id: null, concepto_id: null },
                        { valor: 0, tercero_id: null, centro_costo_id: null, concepto_id: null }
                    ])
                }

            } else {
                // Reset for new movement
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
                    tercero_id: ''
                })
                // Initialize with 2 empty rows
                setDetalles([
                    { valor: 0, tercero_id: null, centro_costo_id: null, concepto_id: null },
                    { valor: 0, tercero_id: null, centro_costo_id: null, concepto_id: null }
                ])
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

    // Sync first row's tercero_id with header
    useEffect(() => {
        if (detalles.length > 0 && formData.tercero_id) {
            const terceroIdNum = formData.tercero_id ? parseInt(formData.tercero_id) : null
            if (detalles[0].tercero_id !== terceroIdNum) {
                setDetalles(prev => {
                    const newDetalles = [...prev]
                    newDetalles[0] = { ...newDetalles[0], tercero_id: terceroIdNum }
                    return newDetalles
                })
            }
        }
    }, [formData.tercero_id])

    const handleCurrencyChange = (val: number | null, field: 'valor' | 'usd' | 'trm') => {
        if (isReadOnly) return

        const newFormData = { ...formData }
        newFormData[field] = val === null ? '' : val.toString()

        // USD × TRM auto-calculation
        if (field === 'usd' || field === 'trm') {
            const usd = field === 'usd' ? val : (formData.usd ? parseFloat(formData.usd) : 0)
            const trm = field === 'trm' ? val : (formData.trm ? parseFloat(formData.trm) : 0)

            // If both USD and TRM are non-zero, calculate Valor
            if (usd && trm && usd !== 0 && trm !== 0) {
                const calculatedValor = usd * trm
                newFormData.valor = calculatedValor.toString()
            }
        }

        setFormData(newFormData)
    }

    // --- Detail Management ---

    const handleAddDetail = () => {
        setDetalles(prev => [
            ...prev,
            { valor: 0, tercero_id: null, centro_costo_id: null, concepto_id: null }
        ])
    }

    const handleRemoveDetail = (index: number) => {
        setDetalles(prev => prev.filter((_, i) => i !== index))
    }

    const handleDetailChange = (index: number, field: keyof MovimientoDetalle, value: any) => {
        setDetalles(prev => {
            const newDetalles = [...prev]
            newDetalles[index] = { ...newDetalles[index], [field]: value }

            // Clear concept if CC changes
            if (field === 'centro_costo_id') {
                newDetalles[index].concepto_id = null
            }

            // Auto-calculate Row 2 when Row 1 valor changes (only if exactly 2 rows)
            if (index === 0 && field === 'valor' && newDetalles.length === 2) {
                const totalMovimiento = parseFloat(formData.valor || '0')
                const row1Valor = typeof value === 'number' ? value : parseFloat(value || '0')
                newDetalles[1].valor = totalMovimiento - row1Valor
            }

            return newDetalles
        })
    }



    // Validation
    const totalMovimiento = formData.valor ? parseFloat(formData.valor) : 0
    const totalDetalles = detalles.reduce((sum, d) => sum + (d.valor || 0), 0)
    const diferencia = totalMovimiento - totalDetalles
    const isBalanced = Math.abs(diferencia) < 0.01

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (mode === 'delete') {
                await onSave(movimiento)
            } else {
                // Always validate balance for table-based classification
                if (!isBalanced) {
                    throw new Error(`El valor de los detalles ($${totalDetalles.toLocaleString()}) no coincide con el total del movimiento ($${totalMovimiento.toLocaleString()})`)
                }

                const payload = {
                    fecha: formData.fecha,
                    descripcion: formData.descripcion,
                    referencia: formData.referencia || null,
                    valor: totalMovimiento,
                    usd: formData.usd ? parseFloat(formData.usd) : null,
                    trm: formData.trm ? parseFloat(formData.trm) : null,
                    moneda_id: parseInt(formData.moneda_id),
                    cuenta_id: parseInt(formData.cuenta_id),
                    tercero_id: formData.tercero_id ? parseInt(formData.tercero_id) : null,
                    detalles: detalles
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
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto ${mode === 'delete' ? 'border-2 border-red-500' : ''} transition-all duration-300">
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

                    {/* Card 1: Movement Header */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                        {/* Line 1: ID (if editing), Fecha, Cuenta */}
                        <div className="grid grid-cols-3 gap-4">
                            {movimiento && (
                                <Input
                                    label="ID"
                                    value={movimiento.id || ''}
                                    disabled
                                />
                            )}
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

                        {/* Line 2: Valor, USD, TRM */}
                        <div className="grid grid-cols-3 gap-4">
                            <CurrencyInput
                                label="Valor Total"
                                value={formData.valor ? parseFloat(formData.valor) : null}
                                onChange={(val) => handleCurrencyChange(val, 'valor')}
                                currency="COP"
                                required
                                disabled={isReadOnly}
                            />
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

                        {/* Line 3: Descripción, Referencia */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Descripción"
                                value={formData.descripcion}
                                onChange={e => !isReadOnly && setFormData({ ...formData, descripcion: e.target.value })}
                                required
                                placeholder="Descripción del movimiento"
                                disabled={isReadOnly}
                            />
                            <Input
                                label="Referencia"
                                value={formData.referencia}
                                onChange={e => !isReadOnly && setFormData({ ...formData, referencia: e.target.value })}
                                placeholder="Opcional"
                                disabled={isReadOnly}
                            />
                        </div>
                    </div>

                    {/* Card 2: Classification */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-700">Clasificación Contable</h3>

                        {/* Classification Table */}
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-3 py-2 w-8">#</th>
                                        <th className="px-3 py-2">Tercero</th>
                                        <th className="px-3 py-2">Centro Costo</th>
                                        <th className="px-3 py-2">Concepto</th>
                                        <th className="px-3 py-2 w-32 text-right">Valor</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {detalles.map((detalle, index) => (
                                        <tr key={index} className="bg-white">
                                            <td className="px-3 py-2 text-center text-gray-400 font-mono text-xs">
                                                {index + 1}
                                            </td>
                                            <td className="px-3 py-2">
                                                <EntitySelector
                                                    value={detalle.tercero_id || ''}
                                                    onChange={(val) => handleDetailChange(index, 'tercero_id', val ? parseInt(val) : null)}
                                                    options={terceros}
                                                    placeholder={index === 0 ? '(Encabezado)' : 'Seleccione...'}
                                                    disabled={index === 0 || isReadOnly}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EntitySelector
                                                    value={detalle.centro_costo_id || ''}
                                                    onChange={(val) => handleDetailChange(index, 'centro_costo_id', val ? parseInt(val) : null)}
                                                    options={centrosCostos}
                                                    placeholder="Seleccione..."
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EntitySelector
                                                    value={detalle.concepto_id || ''}
                                                    onChange={(val) => handleDetailChange(index, 'concepto_id', val ? parseInt(val) : null)}
                                                    options={conceptos.filter(c => !detalle.centro_costo_id || Number(c.centro_costo_id) === Number(detalle.centro_costo_id))}
                                                    placeholder="Seleccione..."
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                            <td className="px-3 py-2">
                                                <EditableCurrencyCell
                                                    value={detalle.valor}
                                                    onChange={(val) => {
                                                        const num = parseFloat(val);
                                                        handleDetailChange(index, 'valor', isNaN(num) ? 0 : num);
                                                    }}
                                                    disabled={isReadOnly}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDetail(index)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                    disabled={isReadOnly || detalles.length <= 1}
                                                    title="Eliminar fila"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="bg-gray-50 border-t border-gray-200">
                                        <td colSpan={6} className="px-3 py-2 text-center">
                                            <button
                                                type="button"
                                                onClick={handleAddDetail}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center justify-center gap-1 mx-auto"
                                                disabled={isReadOnly}
                                            >
                                                <Plus size={14} /> Agregar Detalle
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                                <tfoot className="border-t-2 border-gray-200 bg-gray-100 font-bold text-sm">
                                    <tr>
                                        <td colSpan={4} className="px-3 py-2 text-right text-gray-600">Total Asignado:</td>
                                        <td className="px-3 py-2 text-right font-mono">
                                            <CurrencyDisplay
                                                value={totalDetalles}
                                                currency="COP"
                                                colorize={true}
                                            />
                                        </td>
                                        <td></td>
                                    </tr>
                                    {!isBalanced && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-1 text-right text-gray-500 text-xs italic font-normal">Diferencia:</td>
                                            <td className="px-3 py-1 text-right text-xs font-mono font-bold">
                                                <CurrencyDisplay
                                                    value={totalMovimiento - totalDetalles}
                                                    currency="COP"
                                                    colorize={true}
                                                />
                                            </td>
                                            <td></td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
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
                            disabled={!isBalanced}
                        >
                            {submitLabel}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
