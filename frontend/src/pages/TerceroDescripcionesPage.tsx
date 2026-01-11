
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import { ComboBox } from '../components/molecules/ComboBox'
import { Button } from '../components/atoms/Button'
import { Input } from '../components/atoms/Input'
import { Modal } from '../components/molecules/Modal'
import { DataTable, type Column } from '../components/molecules/DataTable'
import { CsvExportButton } from '../components/CsvExportButton'
import { apiService } from '../services/api'
import type { Tercero, TerceroDescripcion } from '../types'

interface TerceroDescripcionDTO extends TerceroDescripcion {
    tercero_nombre?: string // Para mostrar en la tabla
}

export const TerceroDescripcionesPage = () => {
    const [descripciones, setDescripciones] = useState<TerceroDescripcionDTO[]>([])
    const [terceros, setTerceros] = useState<Tercero[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [referenciaFilter, setReferenciaFilter] = useState('')
    const [descripcionFilter, setDescripcionFilter] = useState('')

    // Modal State
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<TerceroDescripcionDTO | null>(null)

    // Form State (Simplificado para usar state directo en modal o inputs controlados aquí)
    const [formDescripcion, setFormDescripcion] = useState('')
    const [formReferencia, setFormReferencia] = useState('')
    const [formTerceroId, setFormTerceroId] = useState<number | ''>('')



    const cargar = async () => {
        setLoading(true)
        try {
            // Cargar Maestros de Terceros
            const tercerosData = await apiService.getTerceros()
            setTerceros(tercerosData)

            // Cargar Descripciones
            const descData = await apiService.getTerceroDescripciones()

            // Enriquecer con nombre del tercero
            const enrichedData = descData.map((d: any) => ({
                ...d,
                tercero_nombre: `${d.terceroid} - ${tercerosData.find(t => t.id === d.terceroid)?.nombre || 'Desconocido'}`
            }))

            setDescripciones(enrichedData)
        } catch (error) {
            console.error('Error cargando datos:', error)
            toast.error('Error cargando alias')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargar()
    }, [])

    // Manejar parámetros de URL para abrir modal con tercero preseleccionado
    const [searchParams, setSearchParams] = useSearchParams()
    useEffect(() => {
        if (searchParams.get('crear') === 'true' && terceros.length > 0) {
            const terceroId = searchParams.get('tercero_id')
            setItemEditando(null)
            setFormDescripcion('')
            setFormReferencia('')
            setFormTerceroId(terceroId ? parseInt(terceroId) : '')
            setModalOpen(true)
            // Limpiar parámetros de la URL
            setSearchParams({})
        }
    }, [searchParams, setSearchParams, terceros])

    const handleCreate = () => {
        setItemEditando(null)
        setFormDescripcion('')
        setFormReferencia('')
        setFormTerceroId('')
        setModalOpen(true)
    }

    const handleEdit = (item: TerceroDescripcionDTO) => {
        setItemEditando(item)
        setFormDescripcion(item.descripcion || '')
        setFormReferencia(item.referencia || '')
        setFormTerceroId(item.terceroid)
        setFormTerceroId(item.terceroid)
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Seguro que deseas eliminar este alias?')) return;

        try {
            await apiService.deleteTerceroDescripcion(id)
            toast.success('Alias eliminado')
            cargar()
        } catch (error) {
            toast.error('Error eliminando alias')
        }
    }

    const handleSave = async () => {
        if (!formTerceroId) {
            toast.error('Tercero es obligatorio')
            return
        }

        try {
            const payload = {
                terceroid: Number(formTerceroId),
                descripcion: formDescripcion,
                referencia: formReferencia
            }

            if (itemEditando) {
                await apiService.updateTerceroDescripcion(itemEditando.id, payload)
                toast.success('Alias actualizado')
            } else {
                await apiService.createTerceroDescripcion(payload)
                toast.success('Alias creado')
            }

            setModalOpen(false)
            cargar()
        } catch (error) {
            console.error('Error guardando:', error)
            toast.error('Error al guardar el alias')
        }
    }

    // Filtrado
    const filteredData = descripciones.filter(item => {
        const matchesSearch = !searchTerm ||
            (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.tercero_nombre && item.tercero_nombre.toLowerCase().includes(searchTerm.toLowerCase()))

        const matchesReferencia = !referenciaFilter ||
            (item.referencia && item.referencia.toLowerCase().includes(referenciaFilter.toLowerCase()))

        const matchesDescripcion = !descripcionFilter ||
            (item.descripcion && item.descripcion.toLowerCase().includes(descripcionFilter.toLowerCase()))

        return matchesSearch && matchesReferencia && matchesDescripcion
    })

    const columns: Column<TerceroDescripcionDTO>[] = [
        {
            key: 'id',
            header: 'ID',
            accessor: (item) => <span className="text-gray-500">#{item.id}</span>
        },
        {
            key: 'tercero_nombre',
            header: 'Tercero Maestro',
            accessor: (item) => <span className="font-semibold text-slate-700">{item.tercero_nombre}</span>
        },
        {
            key: 'descripcion',
            header: 'Descripción',
            accessor: (item) => <span className="font-mono font-medium text-blue-600">{item.descripcion || '-'}</span>
        },
        {
            key: 'referencia',
            header: 'Referencia',
            accessor: (item) => <span className="text-xs text-gray-500 font-mono">{item.referencia || '-'}</span>
        }
    ]

    // Helper to get tercero name only (without ID prefix)
    const getTerceroSoloNombre = (item: TerceroDescripcionDTO) => {
        const tercero = terceros.find(t => t.id === item.terceroid)
        return tercero ? tercero.nombre : ''
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'terceroid', label: 'Tercero ID', accessor: (item: TerceroDescripcionDTO) => item.terceroid },
        { key: 'tercero_nombre', label: 'Tercero', accessor: getTerceroSoloNombre },
        { key: 'descripcion' as const, label: 'Descripción' },
        { key: 'referencia' as const, label: 'Referencia' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Alias de Terceros</h1>
                    <p className="text-gray-500 text-sm mt-1">Administra las variantes de nombres para la asignación automática</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={filteredData} columns={csvColumns} filenamePrefix="alias_terceros" />
                    <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium">
                        <Plus size={18} /> Nuevo Alias
                    </button>
                </div>
            </div>

            {/* Filtros de búsqueda */}
            <div className="mb-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Filtrar por alias o tercero..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtrar por descripción..."
                            value={descripcionFilter}
                            onChange={(e) => setDescripcionFilter(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${descripcionFilter
                                ? (filteredData.length > 0 ? 'border-green-500 bg-green-50' : 'border-orange-400 bg-orange-50')
                                : 'border-gray-300'
                                }`}
                        />
                        {descripcionFilter && (
                            <button
                                onClick={() => setDescripcionFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
                                title="Limpiar filtro"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {descripcionFilter && (
                        <p className={`text-sm mt-1 font-medium ${filteredData.length > 0 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                            {filteredData.length > 0
                                ? `✓ "${descripcionFilter}" encontrada (${filteredData.length} coincidencia${filteredData.length > 1 ? 's' : ''})`
                                : `No se encontró "${descripcionFilter}"`
                            }
                        </p>
                    )}
                </div>
                <div className="flex-1">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Filtrar por referencia (validar si existe)..."
                            value={referenciaFilter}
                            onChange={(e) => setReferenciaFilter(e.target.value)}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${referenciaFilter
                                ? (filteredData.length > 0 ? 'border-green-500 bg-green-50' : 'border-orange-400 bg-orange-50')
                                : 'border-gray-300'
                                }`}
                        />
                        {referenciaFilter && (
                            <button
                                onClick={() => setReferenciaFilter('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
                                title="Limpiar filtro"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    {referenciaFilter && (
                        <p className={`text-sm mt-1 font-medium ${filteredData.length > 0 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                            {filteredData.length > 0
                                ? `⚠️ La referencia "${referenciaFilter}" ya existe (${filteredData.length} coincidencia${filteredData.length > 1 ? 's' : ''})`
                                : `✓ La referencia "${referenciaFilter}" no existe aún`
                            }
                        </p>
                    )}
                </div>
            </div>
            {(searchTerm || referenciaFilter || descripcionFilter) && (
                <p className="text-sm text-gray-600 mb-4">
                    Mostrando {filteredData.length} de {descripciones.length} alias
                </p>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <DataTable
                    data={filteredData}
                    columns={columns}
                    loading={loading}
                    emptyMessage="No hay alias registrados."
                    onEdit={handleEdit}
                    onDelete={(item) => handleDelete(item.id)}
                    getRowKey={(item) => item.id}
                />
            </div>

            {/* Modal Crear/Editar */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={itemEditando ? 'Editar Alias' : 'Nuevo Alias'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={!formTerceroId}>Guardar</Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="space-y-1.5">
                        <ComboBox
                            label="Tercero Maestro"
                            options={terceros}
                            value={formTerceroId.toString()}
                            onChange={(val) => setFormTerceroId(val ? parseInt(val) : '')}
                            placeholder="Seleccionar tercero..."
                            required
                        />
                        <p className="text-[10px] text-slate-400 italic mt-0.5">El tercero real al que se asignará.</p>
                    </div>

                    <Input
                        label="Descripción"
                        value={formDescripcion}
                        onChange={(e) => setFormDescripcion(e.target.value)}
                        placeholder="Descripción del tercero"
                        autoFocus
                    />

                    <Input
                        label="Referencia"
                        value={formReferencia}
                        onChange={(e) => setFormReferencia(e.target.value)}
                        placeholder="Opcional"
                    />
                </form>
            </Modal>
        </div>
    )
}
