import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Grupo } from '../types'
import { GruposTable } from '../components/GruposTable'
import { GrupoModal } from '../components/GrupoModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { apiService } from '../services/api'

export const GruposPage = () => {
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Grupo | null>(null)

    const [searchTerm, setSearchTerm] = useState('')

    const cargarGrupos = () => {
        setLoading(true)
        apiService.grupos.listar()
            .then(data => {
                setGrupos(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando grupos:", err)
                toast.error("Error al cargar grupos")
                setLoading(false)
            })
    }

    useEffect(() => {
        cargarGrupos()
    }, [])

    // Filtrar grupos por nombre
    const gruposFiltrados = grupos.filter(grupo => {
        if (!searchTerm) return true
        if (!grupo.nombre) return false
        return grupo.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (grupo: Grupo) => {
        setItemEditando(grupo)
        setModalOpen(true)
    }

    const handleDelete = (id: number) => {
        apiService.grupos.eliminar(id)
            .then(() => {
                toast.success('Grupo eliminado')
                cargarGrupos()
            })
            .catch(err => {
                console.error(err)
                toast.error("Error al eliminar: " + err.message)
            })
    }

    const handleSave = (nombre: string) => {
        const promise = itemEditando
            ? apiService.grupos.actualizar(itemEditando.id, nombre)
            : apiService.grupos.crear(nombre)

        promise
            .then(() => {
                toast.success(itemEditando ? 'Grupo actualizado' : 'Grupo creado')
                setModalOpen(false)
                cargarGrupos()
            })
            .catch(err => {
                toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'} el grupo: ${err.message}`)
            })
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Grupos</h1>
                    <p className="text-gray-500 text-sm mt-1">Categorías principales para clasificar gastos e ingresos</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={gruposFiltrados} columns={csvColumns} filenamePrefix="grupos" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nuevo Grupo
                    </button>
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar grupo por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {searchTerm ? (
                    <p className="text-sm text-gray-600 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        Mostrando {gruposFiltrados.length} de {grupos.length} grupos
                    </p>
                ) : null}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <GruposTable
                    grupos={gruposFiltrados}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <GrupoModal
                isOpen={modalOpen}
                grupo={itemEditando}
                grupos={grupos}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
