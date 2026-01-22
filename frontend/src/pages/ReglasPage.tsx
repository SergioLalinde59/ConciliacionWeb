import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { ReglaClasificacion, Tercero, CentroCosto, Concepto, Cuenta } from '../types'
import { Plus, Zap, Edit, X } from 'lucide-react'
import { ComboBox } from '../components/molecules/ComboBox'
import { CsvExportButton } from '../components/molecules/CsvExportButton'
import { DataTable } from '../components/molecules/DataTable'
import type { Column } from '../components/molecules/DataTable'

export const ReglasPage: React.FC = () => {
    const [reglas, setReglas] = useState<ReglaClasificacion[]>([])
    const [loading, setLoading] = useState(true)

    // Data catalogs
    const [terceros, setTerceros] = useState<Tercero[]>([])
    const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([])
    const [conceptos, setConceptos] = useState<Concepto[]>([])
    const [cuentas, setCuentas] = useState<Cuenta[]>([])

    // Form state
    const [patron, setPatron] = useState('')
    const [selectedCuentaId, setSelectedCuentaId] = useState<number | null>(null)
    const [selectedTerceroId, setSelectedTerceroId] = useState<number | null>(null)
    const [selectedCentroCostoId, setSelectedCentroCostoId] = useState<number | null>(null)
    const [selectedConceptoId, setSelectedConceptoId] = useState<number | null>(null)
    const [descripcion, setDescripcion] = useState('')
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
            setCentrosCostos(catalogos.centros_costos)
            setConceptos(catalogos.conceptos)
            setCuentas(catalogos.cuentas)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCentroCostoId || !selectedConceptoId) {
            alert('Complete Centro de Clasificación y Concepto')
            return
        }

        // Validación para Nueva Regla: Tercero es requerido para obtener el patrón
        if (!editingId && !selectedTerceroId) {
            alert('Para crear una nueva regla, debe seleccionar un Tercero (el nombre del tercero será el patrón)')
            return
        }

        // Determinar patrón: 
        // - Si es edición, mantenemos el que estaba (estado 'patron') 
        // - Si es nuevo, usamos el nombre del tercero seleccionado
        let finalPatron = patron
        if (!editingId && selectedTerceroId) {
            const t = terceros.find(x => x.id === selectedTerceroId)
            if (t) finalPatron = t.nombre
        }

        if (!finalPatron.trim()) {
            alert('No se pudo determinar el patrón del tercero')
            return
        }

        try {
            const reglaData: ReglaClasificacion = {
                patron: finalPatron.trim(),
                patron_descripcion: descripcion.trim() || undefined,
                tercero_id: selectedTerceroId ?? undefined,
                centro_costo_id: selectedCentroCostoId ?? undefined,
                concepto_id: selectedConceptoId ?? undefined,
                cuenta_id: selectedCuentaId ?? undefined,
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
        setSelectedCuentaId(null)
        setSelectedTerceroId(null)
        setSelectedCentroCostoId(null)
        setSelectedConceptoId(null)
        setDescripcion('')
        setEditingId(null)
    }

    const handleEditar = (regla: ReglaClasificacion) => {
        setPatron(regla.patron || '')
        setSelectedCuentaId(regla.cuenta_id || null)
        setSelectedTerceroId(regla.tercero_id || null)
        setSelectedCentroCostoId(regla.centro_costo_id || null)
        setSelectedConceptoId(regla.concepto_id || null)
        setDescripcion(regla.patron_descripcion || '')
        setEditingId(regla.id!)
    }

    const handleEliminar = async (regla: ReglaClasificacion) => {
        const id = regla.id
        if (!id) return
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
        return item ? `${item.id} - ${item.nombre}` : id.toString()
    }
    const getConceptoNombre = (id: number | null | undefined) => {
        if (!id) return '-'
        const c = conceptos.find(item => item.id === id)
        return c ? `${c.id} - ${c.nombre}` : id.toString()
    }

    // Filtrar conceptos por centro de costo seleccionado en el formulario
    const conceptosFiltrados = selectedCentroCostoId
        ? conceptos.filter(c => c.centro_costo_id === selectedCentroCostoId)
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

    // Opciones para ComboBox de Cuentas (convertir a formato label/value o usar directamente si ComboBox lo soporta)
    // El ComboBox actual parece requerir options con {id, nombre} estándar.
    const cuentasOptions = cuentas.map(c => ({ id: c.id, nombre: c.nombre }))

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'patron' as const, label: 'Patrón' },
        { key: 'cuenta_id', label: 'Cuenta ID', accessor: (r: ReglaClasificacion) => r.cuenta_id || '' },
        { key: 'cuenta_nombre', label: 'Cuenta', accessor: (r: ReglaClasificacion) => getSoloNombre(cuentas, r.cuenta_id) },
        { key: 'tercero_id', label: 'Tercero ID', accessor: (r: ReglaClasificacion) => r.tercero_id || '' },
        { key: 'tercero_nombre', label: 'Tercero', accessor: (r: ReglaClasificacion) => getSoloNombre(terceros, r.tercero_id) },
        { key: 'centro_costo_id', label: 'Centro Costo ID', accessor: (r: ReglaClasificacion) => r.centro_costo_id || '' },
        { key: 'centro_costo_nombre', label: 'Centro Costo', accessor: (r: ReglaClasificacion) => getSoloNombre(centrosCostos, r.centro_costo_id) },
        { key: 'concepto_id', label: 'Concepto ID', accessor: (r: ReglaClasificacion) => r.concepto_id || '' },
        { key: 'concepto_nombre', label: 'Concepto', accessor: (r: ReglaClasificacion) => getConceptoSoloNombre(r.concepto_id) },
    ]

    const columns: Column<ReglaClasificacion>[] = [
        {
            key: 'cuenta_id',
            header: 'Cuenta (Opcional)',
            sortable: true,
            accessor: (r) => r.cuenta_id ? <span className="font-medium text-blue-600">{getNombre(cuentas, r.cuenta_id)}</span> : <span className="text-slate-400 italic text-xs">Global</span>
        },
        {
            key: 'patron',
            header: 'Patrón',
            sortable: true,
            accessor: (r) => <span className="font-medium text-slate-800">"{r.patron}"</span>
        },
        {
            key: 'patron_descripcion',
            header: 'Descripción',
            sortable: true,
            accessor: (r) => r.patron_descripcion || <span className="text-slate-400 italic text-xs">Sin descripción</span>
        },
        {
            key: 'tercero_id',
            header: 'Tercero Asignado',
            sortable: true,
            accessor: (r) => getNombre(terceros, r.tercero_id),
            // Custom sort function could be added here if needed, but string comparison of the result works well enough usually
            // or we can sort by the underlying ID using 'tercero_id' which is default. 
            // To sort by name properly we'd need to augment the data or use a custom comparator in DataTable, 
            // but for now ID-based sort or simple string sort of the accessor result (if DataTable supports it) is fine.
            // DataTable sorts by the value of the key efficiently. 
        },
        {
            key: 'centro_costo_id',
            header: 'Centro Costo',
            sortable: true,
            accessor: (r) => getNombre(centrosCostos, r.centro_costo_id)
        },
        {
            key: 'concepto_id',
            header: 'Concepto',
            sortable: true,
            accessor: (r) => getConceptoNombre(r.concepto_id)
        }
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
                <form onSubmit={handleGuardar} className="space-y-4">
                    {/* Fila 1: Cuenta (Opcional) */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Cuenta (Opcional - Prioridad Alta)</label>
                        <ComboBox
                            options={cuentasOptions}
                            value={selectedCuentaId ? selectedCuentaId.toString() : ""}
                            onChange={(val) => setSelectedCuentaId(val ? parseInt(val) : null)}
                            placeholder="Todas las Cuentas (Global)"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Si selecciona una cuenta, esta regla tendrá prioridad sobre las reglas globales.</p>
                    </div>

                    {/* Fila 2: Tercero, Centro Costo, Concepto */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tercero (Requerido)</label>
                            <ComboBox
                                options={terceros}
                                value={selectedTerceroId ? selectedTerceroId.toString() : ""}
                                onChange={(val) => setSelectedTerceroId(val ? parseInt(val) : null)}
                                placeholder="Buscar Tercero..."
                            />
                        </div>

                        <div className="">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Centro de Costo</label>
                            <ComboBox
                                options={centrosCostos}
                                value={selectedCentroCostoId ? selectedCentroCostoId.toString() : ""}
                                onChange={(val) => {
                                    const id = val ? parseInt(val) : null
                                    setSelectedCentroCostoId(id)
                                    setSelectedConceptoId(null) // Reset concepto al cambiar centro de costo
                                }}
                                placeholder="Seleccionar Centro Costo"
                            />
                        </div>

                        <div className="">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Concepto</label>
                            <ComboBox
                                options={conceptosFiltrados}
                                value={selectedConceptoId ? selectedConceptoId.toString() : ""}
                                onChange={(val) => setSelectedConceptoId(val ? parseInt(val) : null)}
                                placeholder="Concepto"
                            // disabled prop is not supported by ComboBox yet, so using key to reset or custom logic
                            />
                        </div>
                    </div>

                    {/* Fila 3: Descripción */}
                    <div>
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Descripción (Opcional)</label>
                        <input
                            type="text"
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Descripción adicional de la regla"
                        />
                    </div>

                    {/* Fila 4: Patrón (Read-only) + Botón */}
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Patrón Generado (Automático)</label>
                            <div className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono text-sm h-[42px] flex items-center overflow-hidden">
                                {editingId ? patron : (
                                    selectedTerceroId ?
                                        (terceros.find(t => t.id === selectedTerceroId)?.nombre || '-')
                                        : <span className="text-slate-400 italic">Seleccione un Tercero para generar el patrón</span>
                                )}
                            </div>
                        </div>
                        <div className="md:w-auto">
                            <button
                                type="submit"
                                className={`w-full md:w-auto px-6 text-white p-2.5 rounded-lg flex justify-center items-center gap-2 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                                title={editingId ? "Actualizar Regla" : "Crear Regla"}
                            >
                                {editingId ? <><Edit size={20} /> Actualizar</> : <><Plus size={20} /> Crear Regla</>}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Lista de Reglas */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={reglas}
                    columns={columns}
                    loading={loading}
                    getRowKey={(r) => r.id || Math.random()}
                    onEdit={handleEditar}
                    onDelete={handleEliminar}
                    deleteConfirmMessage="¿Seguro que deseas eliminar esta regla?"
                    emptyMessage="No hay reglas definidas"
                />
            </div>
        </div>
    )
}
