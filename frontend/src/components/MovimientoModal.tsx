import { useState, useEffect } from 'react'
import { Save, X } from 'lucide-react'
import { Button } from './atoms/Button'
import { Input } from './atoms/Input'
import { Select } from './atoms/Select'
import type { Movimiento, Cuenta, Moneda, Tercero, Grupo, Concepto } from '../types'
import { API_BASE_URL } from '../config'

interface MovimientoModalProps {
    isOpen: boolean
    movimiento: Movimiento | null
    onClose: () => void
    onSave: () => void
}

export const MovimientoModal = ({ isOpen, movimiento, onClose, onSave }: MovimientoModalProps) => {
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
        concepto_id: ''
    })

    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [monedas, setMonedas] = useState<Moneda[]>([])
    const [terceros, setTerceros] = useState<Tercero[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [conceptos, setConceptos] = useState<Concepto[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) {
            cargarMaestros()
            if (movimiento) {
                setFormData({
                    fecha: movimiento.fecha,
                    descripcion: movimiento.descripcion,
                    referencia: movimiento.referencia || '',
                    valor: movimiento.valor.toString(),
                    usd: movimiento.usd?.toString() || '',
                    trm: movimiento.trm?.toString() || '',
                    moneda_id: movimiento.moneda_id.toString(),
                    cuenta_id: movimiento.cuenta_id.toString(),
                    tercero_id: movimiento.tercero_id?.toString() || '',
                    grupo_id: movimiento.grupo_id?.toString() || '',
                    concepto_id: movimiento.concepto_id?.toString() || ''
                })
            } else {
                // Resetear para nuevo
                const today = new Date().toISOString().split('T')[0]
                setFormData({
                    fecha: today,
                    descripcion: '',
                    referencia: '',
                    valor: '',
                    usd: '',
                    trm: '',
                    moneda_id: '',
                    cuenta_id: '',
                    tercero_id: '',
                    grupo_id: '',
                    concepto_id: ''
                })
            }
        }
    }, [isOpen, movimiento])

    const cargarMaestros = async () => {
        try {
            const [cuentasRes, monedasRes, tercerosRes, gruposRes, conceptosRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/cuentas`),
                fetch(`${API_BASE_URL}/api/monedas`),
                fetch(`${API_BASE_URL}/api/terceros`),
                fetch(`${API_BASE_URL}/api/grupos`),
                fetch(`${API_BASE_URL}/api/conceptos`)
            ])

            setCuentas(await cuentasRes.json())
            setMonedas(await monedasRes.json())
            setTerceros(await tercerosRes.json())
            setGrupos(await gruposRes.json())
            setConceptos(await conceptosRes.json())
        } catch (err) {
            console.error("Error cargando maestros:", err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const payload = {
            fecha: formData.fecha,
            descripcion: formData.descripcion,
            referencia: formData.referencia || '',
            valor: parseFloat(formData.valor),
            usd: formData.usd ? parseFloat(formData.usd) : null,
            trm: formData.trm ? parseFloat(formData.trm) : null,
            moneda_id: parseInt(formData.moneda_id),
            cuenta_id: parseInt(formData.cuenta_id),
            tercero_id: formData.tercero_id ? parseInt(formData.tercero_id) : null,
            grupo_id: formData.grupo_id ? parseInt(formData.grupo_id) : null,
            concepto_id: formData.concepto_id ? parseInt(formData.concepto_id) : null
        }

        try {
            const url = movimiento
                ? `${API_BASE_URL}/api/movimientos/${movimiento.id}`
                : `${API_BASE_URL}/api/movimientos`

            const method = movimiento ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                onSave()
                onClose()
            } else {
                const error = await res.json()
                alert('Error: ' + (error.detail || 'Error desconocido'))
            }
        } catch (err) {
            console.error(err)
            alert('Error de conexión')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {movimiento ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Fecha *"
                            type="date"
                            value={formData.fecha}
                            onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                            required
                        />

                        <Input
                            label="Valor *"
                            type="number"
                            step="0.01"
                            value={formData.valor}
                            onChange={e => setFormData({ ...formData, valor: e.target.value })}
                            required
                            placeholder="0.00"
                        />
                    </div>

                    <Input
                        label="Descripción *"
                        type="text"
                        value={formData.descripcion}
                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                        required
                    />

                    <Input
                        label="Referencia"
                        type="text"
                        value={formData.referencia}
                        onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Cuenta *"
                            value={formData.cuenta_id}
                            onChange={e => setFormData({ ...formData, cuenta_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione...</option>
                            {cuentas.map(c => (
                                <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>
                            ))}
                        </Select>

                        <Select
                            label="Moneda *"
                            value={formData.moneda_id}
                            onChange={e => setFormData({ ...formData, moneda_id: e.target.value })}
                            required
                        >
                            <option value="">Seleccione...</option>
                            {monedas.map(m => (
                                <option key={m.id} value={m.id}>{m.id} - {m.nombre}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="USD"
                            type="number"
                            step="0.01"
                            value={formData.usd}
                            onChange={e => setFormData({ ...formData, usd: e.target.value })}
                            placeholder="0.00"
                        />

                        <Input
                            label="TRM"
                            type="number"
                            step="0.01"
                            value={formData.trm}
                            onChange={e => setFormData({ ...formData, trm: e.target.value })}
                            placeholder="0.00"
                        />
                    </div>

                    <Select
                        label="Tercero"
                        value={formData.tercero_id}
                        onChange={e => setFormData({ ...formData, tercero_id: e.target.value })}
                    >
                        <option value="">Seleccione...</option>
                        {terceros.map(t => (
                            <option key={t.id} value={t.id}>{t.id} - {t.nombre}</option>
                        ))}
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Grupo"
                            value={formData.grupo_id}
                            onChange={e => setFormData({ ...formData, grupo_id: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            {grupos.map(g => (
                                <option key={g.id} value={g.id}>{g.id} - {g.nombre}</option>
                            ))}
                        </Select>

                        <Select
                            label="Concepto"
                            value={formData.concepto_id}
                            onChange={e => setFormData({ ...formData, concepto_id: e.target.value })}
                        >
                            <option value="">Seleccione...</option>
                            {conceptos.map(c => (
                                <option key={c.id} value={c.id}>{c.id} - {c.nombre}</option>
                            ))}
                        </Select>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            isLoading={loading}
                            icon={Save}
                            className="flex-1"
                        >
                            Guardar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
