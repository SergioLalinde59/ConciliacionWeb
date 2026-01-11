import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { ReglaClasificacion, Tercero, Grupo, Concepto } from '../types'
import { Trash2, Plus, Zap, Edit, X } from 'lucide-react'
import { ComboBox } from '../components/molecules/ComboBox'
import { CsvExportButton } from '../components/CsvExportButton'

export const ReglasPage: React.FC = () => {
    const [reglas, setReglas] = useState<ReglaClasificacion[]>([])
    const [loading, setLoading] = useState(true)

    // Data catalogs
    const [terceros, setTerceros] = useState<Tercero[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [conceptos, setConceptos] = useState<Concepto[]>([])

    // Form state
    const [patron, setPatron] = useState('')
    const [selectedTerceroId, setSelectedTerceroId] = useState<number | null>(null)
    const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null)
    const [selectedConceptoId, setSelectedConceptoId] = useState<number | null>(null)
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [reglasData, catalogos] = await Promise.all([
                apiService.reglas.listar(),
                apiService.catalogos.obtenerTodos()
            ])
            setReglas(reglasData)
            setTerceros(catalogos.terceros)
            setGrupos(catalogos.grupos)
            setConceptos(catalogos.conceptos)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!patron.trim() || !selectedGrupoId || !selectedConceptoId) {
            alert('Complete al menos Patrón, Grupo y Concepto')
            return
        }

        try {
            const reglaData: ReglaClasificacion = {
                patron: patron.trim(),
                tercero_id: selectedTerceroId ?? undefined,
                grupo_id: selectedGrupoId ?? undefined,
                concepto_id: selectedConceptoId ?? undefined,
                tipo_match: 'contiene'
            }

            if (editingId) {
                const updated = await apiService.reglas.actualizar(editingId, reglaData)
                setReglas(reglas.map(r => r.id === editingId ? updated : r))
            } else {
                const created = await apiService.reglas.crear(reglaData)
                setReglas([created, ...reglas])
            }
            limpiarForm()
        } catch (error) {
            alert('Error guardando regla')
        }
    }

    const limpiarForm = () => {
        setPatron('')
        setSelectedTerceroId(null)
        setSelectedGrupoId(null)
        setSelectedConceptoId(null)
        setEditingId(null)
    }

    const handleEditar = (regla: ReglaClasificacion) => {
        setPatron(regla.patron || '')
        setSelectedTerceroId(regla.tercero_id || null)
        setSelectedGrupoId(regla.grupo_id || null)
        setSelectedConceptoId(regla.concepto_id || null)
        setEditingId(regla.id!)
    }

    const handleEliminar = async (id: number) => {
        if (!confirm('¿Eliminar esta regla?')) return
        try {
            await apiService.reglas.eliminar(id)
            setReglas(reglas.filter(r => r.id !== id))
        } catch (error) {
            alert('Error eliminando regla')
        }
    }

    // Helper para nombre
    const getNombre = (coleccion: any[], id: number | null | undefined) => {
        if (!id) return '-'
        const item = coleccion.find(item => item.id === id)
        return item ? `${item.id} - ${item.nombre}` : id
    }
    const getConceptoNombre = (id: number | null | undefined) => {
        if (!id) return '-'
        const c = conceptos.find(item => item.id === id)
        return c ? `${c.id} - ${c.nombre}` : id
    }

    // Filtrar conceptos por grupo seleccionado en el formulario
    const conceptosFiltrados = selectedGrupoId
        ? conceptos.filter(c => c.grupo_id === selectedGrupoId)
        : conceptos

    // Helper to get only the name (without ID prefix)
    const getSoloNombre = (coleccion: any[], id: number | null | undefined) => {
        if (!id) return ''
        const item = coleccion.find(item => item.id === id)
        return item ? item.nombre : ''
    }
    const getConceptoSoloNombre = (id: number | null | undefined) => {
        if (!id) return ''
        const c = conceptos.find(item => item.id === id)
        return c ? c.nombre : ''
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'patron' as const, label: 'Patrón' },
        { key: 'tercero_id', label: 'Tercero ID', accessor: (r: ReglaClasificacion) => r.tercero_id || '' },
        { key: 'tercero_nombre', label: 'Tercero', accessor: (r: ReglaClasificacion) => getSoloNombre(terceros, r.tercero_id) },
        { key: 'grupo_id', label: 'Grupo ID', accessor: (r: ReglaClasificacion) => r.grupo_id || '' },
        { key: 'grupo_nombre', label: 'Grupo', accessor: (r: ReglaClasificacion) => getSoloNombre(grupos, r.grupo_id) },
        { key: 'concepto_id', label: 'Concepto ID', accessor: (r: ReglaClasificacion) => r.concepto_id || '' },
        { key: 'concepto_nombre', label: 'Concepto', accessor: (r: ReglaClasificacion) => getConceptoSoloNombre(r.concepto_id) },
    ]

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Zap className="text-yellow-500" />
                    Reglas de Clasificación Automática
                </h1>
                <CsvExportButton data={reglas} columns={csvColumns} filenamePrefix="reglas" />
            </div>

            {/* Formulario de Creación/Edición */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
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
                <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Patrón (Texto Contenido)</label>
                        <input
                            type="text"
                            value={patron}
                            onChange={(e) => setPatron(e.target.value)}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: Netflix"
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tercero (Opcional)</label>
                        <ComboBox
                            options={terceros}
                            value={selectedTerceroId ? selectedTerceroId.toString() : ""}
                            onChange={(val) => setSelectedTerceroId(val ? parseInt(val) : null)}
                            placeholder="Buscar Tercero..."
                        />
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Grupo</label>
                        <ComboBox
                            options={grupos}
                            value={selectedGrupoId ? selectedGrupoId.toString() : ""}
                            onChange={(val) => {
                                const id = val ? parseInt(val) : null
                                setSelectedGrupoId(id)
                                setSelectedConceptoId(null) // Reset concepto al cambiar grupo
                            }}
                            placeholder="Seleccionar Grupo"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Concepto</label>
                        <ComboBox
                            options={conceptosFiltrados}
                            value={selectedConceptoId ? selectedConceptoId.toString() : ""}
                            onChange={(val) => setSelectedConceptoId(val ? parseInt(val) : null)}
                            placeholder="Concepto"
                        // disabled prop is not supported by ComboBox yet, so using key to reset or custom logic
                        />
                    </div>

                    <div className="md:col-span-1">
                        <button
                            type="submit"
                            className={`w-full text-white p-2.5 rounded-lg flex justify-center items-center ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                            title={editingId ? "Actualizar Regla" : "Crear Regla"}
                        >
                            {editingId ? <Edit size={20} /> : <Plus size={20} />}
                        </button>
                    </div>
                </form>
            </div>

            {/* Lista de Reglas */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-6 py-4">Patrón</th>
                            <th className="px-6 py-4">Tercero Asignado</th>
                            <th className="px-6 py-4">Grupo</th>
                            <th className="px-6 py-4">Concepto</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center">Cargando reglas...</td></tr>
                        ) : reglas.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">No hay reglas definidas</td></tr>
                        ) : (
                            reglas.map((regla) => (
                                <tr key={regla.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-800">"{regla.patron}"</td>
                                    <td className="px-6 py-3">{getNombre(terceros, regla.tercero_id)}</td>
                                    <td className="px-6 py-3">{getNombre(grupos, regla.grupo_id)}</td>
                                    <td className="px-6 py-3">{getConceptoNombre(regla.concepto_id)}</td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEditar(regla)}
                                                className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"
                                                title="Editar regla"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                onClick={() => regla.id && handleEliminar(regla.id)}
                                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                                title="Eliminar regla"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
