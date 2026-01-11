import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Tag } from 'lucide-react'
import type { Tercero } from '../types'
import { TercerosTable } from '../components/TercerosTable'
import { TerceroModal } from '../components/TerceroModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { API_BASE_URL } from '../config'

export const TercerosPage = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()

    const [terceros, setTerceros] = useState<Tercero[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Tercero | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    // Estado para mostrar el prompt de crear alias después de guardar
    const [terceroRecienCreado, setTerceroRecienCreado] = useState<Tercero | null>(null)
    const [showAliasPrompt, setShowAliasPrompt] = useState(false)

    const cargar = () => {
        setLoading(true)
        fetch(`${API_BASE_URL}/api/terceros`)
            .then(res => res.json())
            .then(data => { setTerceros(data); setLoading(false) })
            .catch(err => { console.error(err); setLoading(false) })
    }

    useEffect(() => { cargar() }, [])

    // Manejar parámetro ?crear=true de la URL
    useEffect(() => {
        if (searchParams.get('crear') === 'true') {
            setItemEditando(null)
            setModalOpen(true)
            // Limpiar el parámetro de la URL
            setSearchParams({})
        }
    }, [searchParams, setSearchParams])

    // Filtrar terceros por nombre
    const tercerosFiltrados = terceros.filter(tercero => {
        if (!searchTerm) return true
        if (!tercero.nombre) return false
        return tercero.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleCreate = () => { setItemEditando(null); setModalOpen(true) }
    const handleEdit = (item: Tercero) => { setItemEditando(item); setModalOpen(true) }
    const handleDelete = (id: number) => {
        fetch(`${API_BASE_URL}/api/terceros/${id}`, { method: 'DELETE' })
            .then(async res => {
                if (res.ok) {
                    toast.success('Tercero eliminado')
                    cargar()
                } else {
                    toast.error("Error al eliminar el tercero")
                }
            })
    }

    const handleSave = async (nombre: string) => {
        const method = itemEditando ? 'PUT' : 'POST'
        const url = itemEditando
            ? `${API_BASE_URL}/api/terceros/${itemEditando.id}`
            : `${API_BASE_URL}/api/terceros`

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tercero: nombre })
            })

            if (res.ok) {
                const nuevoTercero = await res.json()
                toast.success(itemEditando ? 'Tercero actualizado' : 'Tercero creado')
                setModalOpen(false)
                cargar()

                // Si es creación (no edición), mostrar prompt para crear alias
                if (!itemEditando && nuevoTercero) {
                    setTerceroRecienCreado(nuevoTercero)
                    setShowAliasPrompt(true)
                }
            } else {
                toast.error("Error al guardar el tercero")
            }
        } catch (err) {
            console.error(err)
            toast.error("Error al guardar el tercero")
        }
    }

    const handleCrearAlias = () => {
        if (terceroRecienCreado) {
            // Navegar a la página de alias con el tercero preseleccionado
            navigate(`/maestros/terceros-descripciones?tercero_id=${terceroRecienCreado.id}&crear=true`)
        }
        setShowAliasPrompt(false)
        setTerceroRecienCreado(null)
    }

    const handleSkipAlias = () => {
        setShowAliasPrompt(false)
        setTerceroRecienCreado(null)
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Terceros</h1>
                    <p className="text-gray-500 text-sm mt-1">Beneficiarios o pagadores de los movimientos</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={tercerosFiltrados} columns={csvColumns} filenamePrefix="terceros" />
                    <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm font-medium"><Plus size={18} /> Nuevo Tercero</button>
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm ? (
                    <p className="text-sm text-gray-600 mt-2">
                        Mostrando {tercerosFiltrados.length} de {terceros.length} terceros
                    </p>
                ) : null}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <TercerosTable terceros={tercerosFiltrados} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />
            </div>

            <TerceroModal isOpen={modalOpen} tercero={itemEditando} onClose={() => setModalOpen(false)} onSave={handleSave} />

            {/* Modal de confirmación para crear alias */}
            {showAliasPrompt && terceroRecienCreado && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-full">
                                <Tag className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">¿Crear Alias?</h3>
                        </div>

                        <p className="text-gray-600 mb-6">
                            El tercero <strong>"{terceroRecienCreado.nombre}"</strong> fue creado exitosamente.
                            ¿Deseas definir un alias ahora para facilitar la asignación automática?
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleSkipAlias}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                            >
                                Omitir
                            </button>
                            <button
                                onClick={handleCrearAlias}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                            >
                                <Tag size={16} /> Crear Alias
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
