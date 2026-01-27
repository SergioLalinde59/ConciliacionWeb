import React, { useState, useEffect, useMemo } from 'react'
import { apiService } from '../services/api'
import type { CuentaExtractor, Cuenta } from '../types'
import { Plus, Edit, X, FileText } from 'lucide-react'
import { ComboBox } from '../components/molecules/ComboBox'
import { CsvExportButton } from '../components/molecules/CsvExportButton'
import { DataTable, type Column } from '../components/molecules/DataTable'

export const CuentaExtractoresPage: React.FC = () => {
    const [extractores, setExtractores] = useState<CuentaExtractor[]>([])
    const [loading, setLoading] = useState(true)

    // Catalogs
    const [cuentas, setCuentas] = useState<Cuenta[]>([])

    const cuentasFiltradasCombo = useMemo(() => {
        return cuentas.filter(c => c.permite_conciliar)
    }, [cuentas])

    // Filters
    const [filtroCuentaId, setFiltroCuentaId] = useState<number | null>(null)

    // Form state
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [tipo, setTipo] = useState<string>('MOVIMIENTOS')
    const [modulo, setModulo] = useState('')
    const [orden, setOrden] = useState<number>(1)
    const [activo, setActivo] = useState(true)
    const [editingId, setEditingId] = useState<number | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [extractoresData, catalogos] = await Promise.all([
                apiService.extractores.listar(),
                apiService.catalogos.obtenerTodos()
            ])
            setExtractores(extractoresData)
            setCuentas(catalogos.cuentas)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleGuardar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cuentaId || !modulo.trim()) {
            alert('Complete Cuenta y Módulo')
            return
        }

        try {
            const data: CuentaExtractor = {
                cuenta_id: cuentaId,
                tipo,
                modulo: modulo.trim(),
                orden,
                activo
            }

            if (editingId) {
                const updated = await apiService.extractores.actualizar(editingId, data)
                setExtractores(extractores.map(r => r.id === editingId ? updated : r))
            } else {
                const created = await apiService.extractores.crear(data)
                setExtractores([...extractores, created])
            }
            limpiarForm()
        } catch (error) {
            alert('Error guardando extractor')
            console.error(error)
        }
    }

    const limpiarForm = () => {
        setCuentaId(null)
        setTipo('MOVIMIENTOS')
        setModulo('')
        setOrden(1)
        setActivo(true)
        setEditingId(null)
    }

    const handleEditar = (item: CuentaExtractor) => {
        setCuentaId(item.cuenta_id)
        setTipo(item.tipo)
        setModulo(item.modulo)
        setOrden(item.orden)
        setActivo(item.activo)
        setEditingId(item.id!)
    }

    const handleEliminar = async (item: CuentaExtractor) => {
        if (!item.id) return
        try {
            await apiService.extractores.eliminar(item.id)
            setExtractores(extractores.filter(r => r.id !== item.id))
        } catch (error) {
            alert('Error eliminando extractor')
        }
    }

    // Helpers
    const getCuentaNombre = (id: number) => {
        const c = cuentas.find(item => item.id === id)
        return c ? c.nombre : id
    }

    // Filtered data
    const extractoresFiltrados = useMemo(() => {
        if (!filtroCuentaId) return extractores
        return extractores.filter(e => e.cuenta_id === filtroCuentaId)
    }, [extractores, filtroCuentaId])

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'cuenta_id' as const, label: 'Cuenta ID' },
        { key: 'cuenta_nombre', label: 'Cuenta', accessor: (r: CuentaExtractor) => getCuentaNombre(r.cuenta_id) },
        { key: 'tipo' as const, label: 'Tipo' },
        { key: 'modulo' as const, label: 'Módulo' },
        { key: 'orden' as const, label: 'Orden' },
        { key: 'activo' as const, label: 'Activo', accessor: (r: CuentaExtractor) => r.activo ? 'Sí' : 'No' },
    ]

    const columns: Column<CuentaExtractor>[] = [
        {
            key: 'cuenta_id',
            header: 'Cuenta',
            accessor: (row) => <span className="font-medium text-slate-800">{getCuentaNombre(row.cuenta_id)}</span>,
            sortable: true
        },
        { key: 'tipo', header: 'Tipo', sortable: true },
        {
            key: 'modulo',
            header: 'Módulo',
            accessor: (row) => <span className="font-mono text-xs">{row.modulo}</span>,
            sortable: true
        },
        { key: 'orden', header: 'Orden', sortable: true },
        {
            key: 'activo',
            header: 'Activo',
            accessor: (row) => (
                <span className={`px-2 py-1 rounded text-xs ${row.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {row.activo ? 'Activo' : 'Inactivo'}
                </span>
            ),
            sortable: true
        }
    ]

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-blue-500" />
                    Extractores PDF por Cuenta
                </h1>
                <CsvExportButton data={extractores} columns={csvColumns} filenamePrefix="extractores" />
            </div>

            {/* Formulario */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-slate-700">
                        {editingId ? 'Editar Extractor' : 'Nuevo Extractor'}
                    </h2>
                    {editingId && (
                        <button
                            onClick={limpiarForm}
                            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                            <X size={16} /> Cancelar
                        </button>
                    )}
                </div>
                <form onSubmit={handleGuardar} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Cuenta</label>
                        <ComboBox
                            options={cuentasFiltradasCombo}
                            value={cuentaId ? cuentaId.toString() : ""}
                            onChange={(val) => setCuentaId(val ? parseInt(val) : null)}
                            placeholder="Seleccionar Cuenta"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Tipo</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="MOVIMIENTOS">MOVIMIENTOS</option>
                            <option value="RESUMEN">RESUMEN</option>
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Módulo (Nombre Archivo)</label>
                        <input
                            type="text"
                            value={modulo}
                            onChange={(e) => setModulo(e.target.value)}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: ahorros_extracto"
                        />
                    </div>

                    <div className="md:col-span-1">
                        <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Orden</label>
                        <input
                            type="number"
                            value={orden}
                            onChange={(e) => setOrden(parseInt(e.target.value))}
                            className="w-full border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="md:col-span-1 flex items-center justify-center pb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={activo}
                                onChange={(e) => setActivo(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">Activo</span>
                        </label>
                    </div>

                    <div className="md:col-span-2">
                        <button
                            type="submit"
                            className={`w-full text-white p-2.5 rounded-lg flex justify-center items-center ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {editingId ? <Edit size={20} /> : <Plus size={20} />}
                            <span className="ml-2">{editingId ? 'Actualizar' : 'Guardar'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Filter Section */}
            <div className="mb-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="w-full md:w-1/3">
                    <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Filtrar por Cuenta</label>
                    <ComboBox
                        options={cuentasFiltradasCombo}
                        value={filtroCuentaId ? filtroCuentaId.toString() : ""}
                        onChange={(val) => setFiltroCuentaId(val ? parseInt(val) : null)}
                        placeholder="Todas las cuentas"
                    />
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <DataTable
                    data={extractoresFiltrados}
                    columns={columns}
                    loading={loading}
                    getRowKey={(row) => row.id!}
                    onEdit={handleEditar}
                    onDelete={handleEliminar}
                    deleteConfirmMessage="¿Eliminar este extractor?"
                />
            </div>
        </div>
    )
}
