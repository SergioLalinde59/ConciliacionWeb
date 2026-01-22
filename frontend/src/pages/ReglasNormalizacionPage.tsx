import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import type { MatchingAlias } from '../types/Matching'
import { Plus, RefreshCw, Edit, X } from 'lucide-react'
import { DataTable } from '../components/molecules/DataTable'
import type { Column } from '../components/molecules/DataTable'
import { ComboBox } from '../components/molecules/ComboBox'

export const ReglasNormalizacionPage: React.FC = () => {
    const [aliases, setAliases] = useState<MatchingAlias[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [selectedCuentaId, setSelectedCuentaId] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)

    // Form state
    const [patron, setPatron] = useState('')
    const [reemplazo, setReemplazo] = useState('')
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        loadCuentas()
    }, [])

    useEffect(() => {
        if (selectedCuentaId) {
            loadAliases(selectedCuentaId)
        } else {
            setAliases([])
        }
    }, [selectedCuentaId])

    const loadCuentas = async () => {
        try {
            const data = await apiService.cuentas.listar()
            setCuentas(data)
            if (data.length > 0) {
                setSelectedCuentaId(data[0].id)
            }
        } catch (error) {
            console.error('Error cargando cuentas:', error)
        }
    }

    const loadAliases = async (cuentaId: number) => {
        setLoading(true)
        try {
            const data = await apiService.matching.obtenerAliases(cuentaId)
            setAliases(data)
        } catch (error) {
            console.error('Error cargando aliases:', error)
            alert('Error cargando reglas de normalización')
        } finally {
            setLoading(false)
        }
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCuentaId) {
            alert('Seleccione una cuenta')
            return
        }
        if (!patron.trim() || !reemplazo.trim()) {
            alert('Complete todos los campos')
            return
        }

        try {
            if (editingId) {
                const updated = await apiService.matching.actualizarAlias(editingId, {
                    patron: patron.trim(),
                    reemplazo: reemplazo.trim()
                })
                setAliases(aliases.map(a => a.id === editingId ? updated : a))
            } else {
                const created = await apiService.matching.crearAlias({
                    cuenta_id: selectedCuentaId,
                    patron: patron.trim(),
                    reemplazo: reemplazo.trim()
                })
                setAliases([created, ...aliases])
            }
            limpiarForm()
        } catch (error) {
            console.error(error)
            alert('Error guardando la regla. Verifique que no exista un duplicado.')
        }
    }

    const handleEditar = (alias: MatchingAlias) => {
        setPatron(alias.patron)
        setReemplazo(alias.reemplazo)
        setEditingId(alias.id)
    }

    const handleEliminar = async (alias: MatchingAlias) => {
        if (!confirm('¿Está seguro de eliminar esta regla?')) return
        try {
            await apiService.matching.eliminarAlias(alias.id)
            setAliases(aliases.filter(a => a.id !== alias.id))
        } catch (error) {
            console.error(error)
            alert('Error eliminando la regla')
        }
    }

    const limpiarForm = () => {
        setPatron('')
        setReemplazo('')
        setEditingId(null)
    }

    const columns: Column<MatchingAlias>[] = [
        {
            key: 'patron',
            header: 'En Extracto (Patrón)',
            sortable: true,
            accessor: (row) => <span className="font-medium text-slate-800">"{row.patron}"</span>
        },
        {
            key: 'reemplazo',
            header: 'Normalizado (Reemplazo)',
            sortable: true,
            accessor: (row) => <span className="text-blue-700 font-medium">{row.reemplazo}</span>
        },
        {
            key: 'created_at',
            header: 'Creado',
            sortable: true,
            accessor: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'
        }
    ]

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <RefreshCw className="text-blue-600" />
                    Reglas de Normalización (Alias)
                </h1>


            </div>

            {/* Formulario (Estilo Stackizado igual que ReglasPage) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">

                {/* Selección de Cuenta */}
                <div className="mb-6">
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Cuenta Bancaria</label>
                    <div className="w-full md:w-1/2">
                        <ComboBox
                            options={cuentas.map(c => ({ id: c.id, nombre: c.nombre }))}
                            value={selectedCuentaId ? selectedCuentaId.toString() : ""}
                            onChange={(val) => {
                                setSelectedCuentaId(val ? parseInt(val) : null)
                                limpiarForm()
                            }}
                            placeholder="Seleccionar Cuenta..."
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-slate-700">
                        {editingId ? 'Editar Regla' : 'Nueva Regla'}
                    </h2>
                    {editingId && (
                        <button
                            onClick={limpiarForm}
                            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                            <X size={16} /> Cancelar Edición
                        </button>
                    )}
                </div>

                <form onSubmit={handleGuardar} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                Texto en Extracto (Patrón)
                            </label>
                            <input
                                type="text"
                                value={patron}
                                onChange={(e) => setPatron(e.target.value)}
                                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                                placeholder="Ej: ADICION SUCURSAL"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                                Texto Normalizado (Reemplazo)
                            </label>
                            <input
                                type="text"
                                value={reemplazo}
                                onChange={(e) => setReemplazo(e.target.value)}
                                className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
                                placeholder="Ej: TRASLADO"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className={`px-6 py-2.5 rounded-lg text-white font-medium flex items-center gap-2 transition-colors ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            disabled={!selectedCuentaId}
                        >
                            {editingId ? <><Edit size={20} /> Actualizar</> : <><Plus size={20} /> Crear Regla</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Tabla */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={aliases}
                    columns={columns}
                    loading={loading}
                    getRowKey={(row) => row.id}
                    onEdit={handleEditar}
                    onDelete={handleEliminar}
                    emptyMessage={selectedCuentaId ? "No hay reglas definidas para esta cuenta" : "Seleccione una cuenta"}
                    deleteConfirmMessage="¿Eliminar esta regla de normalización?"
                />
            </div>
        </div>
    )
}
