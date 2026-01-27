import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { CentroCosto } from '../types'
import { CentrosCostosTable } from '../components/organisms/tables/CentrosCostosTable'
import { CentroCostoModal } from '../components/organisms/modals/CentroCostoModal'
import { CsvExportButton } from '../components/molecules/CsvExportButton'
import { apiService } from '../services/api'

export const CentrosCostosPage = () => {
    const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<CentroCosto | null>(null)

    const [searchTerm, setSearchTerm] = useState('')

    const cargarCentrosCostos = () => {
        setLoading(true)
        apiService.centrosCostos.listar()
            .then(data => {
                setCentrosCostos(data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando centros de costos:", err)
                toast.error("Error al cargar centros de costos")
                setLoading(false)
            })
    }

    useEffect(() => {
        cargarCentrosCostos()
    }, [])

    // Filtrar centros de costos por nombre
    const centrosCostosFiltrados = centrosCostos.filter(centro => {
        if (!searchTerm) return true
        if (!centro.nombre) return false
        return centro.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (centro: CentroCosto) => {
        setItemEditando(centro)
        setModalOpen(true)
    }

    const handleDelete = (id: number) => {
        apiService.centrosCostos.eliminar(id)
            .then(() => {
                toast.success('Centro de Costo eliminado')
                cargarCentrosCostos()
            })
            .catch(err => {
                console.error(err)
                toast.error("Error al eliminar: " + err.message)
            })
    }

    const handleSave = (nombre: string) => {
        const promise = itemEditando
            ? apiService.centrosCostos.actualizar(itemEditando.id, nombre)
            : apiService.centrosCostos.crear(nombre)

        promise
            .then(() => {
                toast.success(itemEditando ? 'Centro de Costo actualizado' : 'Centro de Costo creado')
                setModalOpen(false)
                cargarCentrosCostos()
            })
            .catch(err => {
                toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'} el centro de costo: ${err.message}`)
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
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Centros de Costos</h1>
                    <p className="text-gray-500 text-sm mt-1">Categorías principales para clasificar gastos e ingresos</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={centrosCostosFiltrados} columns={csvColumns} filenamePrefix="centros_costos" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nuevo Centro de Costo
                    </button>
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar centro de costo por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {searchTerm ? (
                    <p className="text-sm text-gray-600 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        Mostrando {centrosCostosFiltrados.length} de {centrosCostos.length} centros de costos
                    </p>
                ) : null}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <CentrosCostosTable
                    data={centrosCostosFiltrados}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <CentroCostoModal
                isOpen={modalOpen}
                centroCosto={itemEditando}
                centrosCostos={centrosCostos}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
