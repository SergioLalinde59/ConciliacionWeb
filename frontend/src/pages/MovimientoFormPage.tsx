import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ComboBox } from '../components/molecules/ComboBox'
import { CurrencyInput } from '../components/CurrencyInput'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { getTodayStr, isFutureDate } from '../utils/dateUtils'

export const MovimientoFormPage = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const isEdit = Boolean(id)

    const [formData, setFormData] = useState({
        fecha: '',
        descripcion: '',
        referencia: '',
        valor: '',
        usd: '',
        trm: '',
        moneda_id: '',
        cuenta_id: '',
        tercero_id: '',
        grupo_id: '',
        concepto_id: '',
        detalle: ''
    })

    // Datos Maestros desde Hook centralizado
    const { cuentas, monedas, terceros, grupos, conceptos, loading: catalogsLoading } = useCatalogo()
    const [loading, setLoading] = useState(false)

    // Filtrar conceptos por grupo seleccionado
    const conceptosFiltrados = formData.grupo_id
        ? conceptos.filter(c => c.grupo_id === parseInt(formData.grupo_id))
        : conceptos

    useEffect(() => {
        if (isEdit) {
            cargarMovimiento()
        } else {
            setFormData(prev => ({ ...prev, fecha: getTodayStr() }))
        }
    }, [id])

    // El hook useCatalogo ya se encarga de cargar los datos. 
    // Usamos un useEffect adicional para los valores por defecto cuando los catálogos estén listos.
    useEffect(() => {
        if (!catalogsLoading && !isEdit) {
            const efectivo = cuentas.find(c => c.nombre.toLowerCase().includes('efectivo'))
            const cop = monedas.find(m => m.nombre === 'COP' || m.nombre === 'Pesos' || m.nombre === 'Pesos Colombianos')

            setFormData(prev => ({
                ...prev,
                cuenta_id: efectivo ? efectivo.id.toString() : prev.cuenta_id,
                moneda_id: cop ? cop.id.toString() : prev.moneda_id
            }))
        }
    }, [catalogsLoading, isEdit, cuentas, monedas])



    const cargarMovimiento = async () => {
        try {
            const mov = await apiService.movimientos.obtenerPorId(parseInt(id!))
            setFormData({
                fecha: mov.fecha,
                descripcion: mov.descripcion,
                referencia: mov.referencia || '',
                valor: mov.valor.toString(),
                usd: mov.usd?.toString() || '',
                trm: mov.trm?.toString() || '',
                moneda_id: mov.moneda_id.toString(),
                cuenta_id: mov.cuenta_id.toString(),
                tercero_id: mov.tercero_id?.toString() || '',
                grupo_id: mov.grupo_id?.toString() || '',
                concepto_id: mov.concepto_id?.toString() || '',
                detalle: mov.detalle || ''
            })
        } catch (err) {
            console.error("Error cargando movimiento:", err)
        }
    }

    const handleFechaChange = (newFecha: string) => {
        if (isFutureDate(newFecha)) {
            toast.error('La fecha no puede ser mayor al día actual')
            setFormData({ ...formData, fecha: getTodayStr() })
        } else {
            setFormData({ ...formData, fecha: newFecha })
        }
    }

    const showUsdFields = useMemo(() => {
        // 1. Si ya tiene valor USD, mostrar
        if (formData.usd && parseFloat(formData.usd) > 0) return true

        // 2. Si la moneda seleccionada NO es pesos (asumiendo que detectamos Pesos)
        if (monedas.length > 0 && formData.moneda_id) {
            const cop = monedas.find(m =>
                m.nombre === 'COP' ||
                m.nombre === 'Pesos' ||
                m.nombre === 'Pesos Colombianos'
            )
            // Si encontramos COP y la moneda seleccionada ES DIFERENTE a COP -> Mostrar
            if (cop && formData.moneda_id !== cop.id.toString()) return true
        }

        // 3. Si la cuenta seleccionada tiene "dolar" o "usd" en el nombre (Heurística)
        if (cuentas.length > 0 && formData.cuenta_id) {
            const cuenta = cuentas.find(c => c.id.toString() === formData.cuenta_id)
            if (cuenta) {
                const nombre = cuenta.nombre.toLowerCase()
                if (nombre.includes('dolar') || nombre.includes('usd') || nombre.includes('foreign')) return true
            }
        }

        return false
    }, [formData.usd, formData.moneda_id, formData.cuenta_id, monedas, cuentas])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validar que la fecha no sea futura
        if (isFutureDate(formData.fecha)) {
            toast.error('La fecha no puede ser mayor al día actual')
            return
        }

        setLoading(true)

        // Recalcular valor final basado en USD * TRM si existen
        let valorFinal = parseFloat(formData.valor);
        if (formData.usd && formData.trm) {
            const usdVal = parseFloat(formData.usd);
            const trmVal = parseFloat(formData.trm);
            if (!isNaN(usdVal) && !isNaN(trmVal)) {
                valorFinal = Number((usdVal * trmVal).toFixed(2));
            }
        }

        const payload = {
            fecha: formData.fecha,
            descripcion: formData.descripcion,
            referencia: formData.referencia || '',
            valor: valorFinal,
            usd: formData.usd ? parseFloat(formData.usd) : null,
            trm: formData.trm ? parseFloat(formData.trm) : null,
            moneda_id: parseInt(formData.moneda_id),
            cuenta_id: parseInt(formData.cuenta_id),
            tercero_id: formData.tercero_id ? parseInt(formData.tercero_id) : null,
            grupo_id: formData.grupo_id ? parseInt(formData.grupo_id) : null,
            concepto_id: formData.concepto_id ? parseInt(formData.concepto_id) : null,
            detalle: formData.detalle || undefined
        }

        try {
            const promise = isEdit
                ? apiService.movimientos.actualizar(parseInt(id!), payload)
                : apiService.movimientos.crear(payload)

            await promise
            toast.success(isEdit ? 'Movimiento actualizado' : 'Movimiento creado')
            navigate('/movimientos')
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || 'Error al guardar el movimiento')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEdit ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    {isEdit ? 'Modifica los datos del movimiento' : 'Registra un nuevo movimiento financiero'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
                {/* Sección de Datos Básicos */}
                <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">ID:</label>
                        <input
                            type="text"
                            value={id || 'Nuevo'}
                            disabled
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-500"
                        />
                    </div>

                    <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha: *</label>
                        <input
                            type="date"
                            value={formData.fecha}
                            onChange={e => handleFechaChange(e.target.value)}
                            max={getTodayStr()}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <ComboBox
                        label="Cuenta"
                        value={formData.cuenta_id}
                        onChange={value => setFormData({ ...formData, cuenta_id: value })}
                        options={cuentas}
                        placeholder="Seleccione o busque..."
                        required
                    />

                    <ComboBox
                        label="Moneda"
                        value={formData.moneda_id}
                        onChange={value => setFormData({ ...formData, moneda_id: value })}
                        options={monedas}
                        placeholder="Seleccione o busque..."
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor: *</label>
                        <CurrencyInput
                            value={formData.valor}
                            onValueChange={val => {
                                setFormData({ ...formData, valor: val })
                            }}
                            onBlur={() => {
                                const val = parseFloat(formData.valor)
                                if (val === 0) {
                                    toast.error('El valor no puede ser 0')
                                    setFormData({ ...formData, valor: '' })
                                }
                            }}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold ${formData.valor && parseFloat(formData.valor) > 0
                                ? 'text-green-600'
                                : formData.valor && parseFloat(formData.valor) < 0
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}
                            required
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Campos condicionales para moneda extranjera */}
                {showUsdFields && (
                    <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div>
                            <label className="block text-sm font-medium text-blue-900 mb-1">Valor USD</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-blue-500">$</span>
                                <CurrencyInput
                                    value={formData.usd}
                                    onValueChange={newUsd => {
                                        let newValor = formData.valor
                                        if (newUsd && formData.trm) {
                                            const u = parseFloat(newUsd)
                                            const t = parseFloat(formData.trm)
                                            if (!isNaN(u) && !isNaN(t)) {
                                                newValor = (u * t).toFixed(2)
                                            }
                                        }
                                        setFormData(prev => ({ ...prev, usd: newUsd, valor: newValor }))
                                    }}
                                    className="w-full pl-7 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-blue-900 mb-1">TRM (Tasa de Cambio)</label>
                            <CurrencyInput
                                value={formData.trm}
                                onValueChange={newTrm => {
                                    let newValor = formData.valor
                                    if (formData.usd && newTrm) {
                                        const u = parseFloat(formData.usd)
                                        const t = parseFloat(newTrm)
                                        if (!isNaN(u) && !isNaN(t)) {
                                            newValor = (u * t).toFixed(2)
                                        }
                                    }
                                    setFormData(prev => ({ ...prev, trm: newTrm, valor: newValor }))
                                }}
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                )}

                {/* Separador Clasificación */}
                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Clasificación</h3>
                </div>

                <div>
                    <ComboBox
                        label="Tercero"
                        value={formData.tercero_id}
                        onChange={value => setFormData({ ...formData, tercero_id: value })}
                        options={terceros}
                        placeholder="Seleccione o busque..."
                        required
                    />
                    <Link
                        to="/maestros/terceros?crear=true"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline mt-1"
                    >
                        + Crear nuevo tercero
                    </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <ComboBox
                        label="Grupo"
                        value={formData.grupo_id}
                        onChange={value => {
                            // Al cambiar grupo, limpiar concepto si ya no es válido
                            const nuevoGrupoId = value ? parseInt(value) : null
                            const conceptoActual = formData.concepto_id ? parseInt(formData.concepto_id) : null

                            // Verificar si el concepto actual pertenece al nuevo grupo
                            const conceptoValido = conceptoActual && nuevoGrupoId
                                ? conceptos.some(c => c.id === conceptoActual && c.grupo_id === nuevoGrupoId)
                                : false

                            setFormData({
                                ...formData,
                                grupo_id: value,
                                concepto_id: conceptoValido ? formData.concepto_id : '' // Limpiar si no es válido
                            })
                        }}
                        options={grupos}
                        placeholder="Seleccione o busque..."
                        required
                    />

                    <ComboBox
                        label="Concepto"
                        value={formData.concepto_id}
                        onChange={value => setFormData({ ...formData, concepto_id: value })}
                        options={conceptosFiltrados}
                        placeholder={formData.grupo_id ? "Seleccione o busque..." : "Primero seleccione un grupo"}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Detalle/Notas:</label>
                    <textarea
                        value={formData.detalle}
                        onChange={e => setFormData({ ...formData, detalle: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Notas adicionales sobre este movimiento..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción:</label>
                    <input
                        type="text"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referencia:</label>
                    <input
                        type="text"
                        value={formData.referencia}
                        onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-center pt-4 border-t">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 min-w-[150px]"
                    >
                        💾 {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/movimientos')}
                        className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium min-w-[150px]"
                    >
                        ✕ Cancelar
                    </button>
                </div>
            </form>
        </div>
    )
}
