import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, AlertCircle } from 'lucide-react'
import { ConfigValoresPendientesTable } from '../components/organisms/tables/ConfigValoresPendientesTable'
import { ConfigValorPendienteModal } from '../components/organisms/modals/ConfigValorPendienteModal'
import { CsvExportButton } from '../components/molecules/CsvExportButton'
import { apiService } from '../services/api'

interface ConfigValorPendiente {
    id: number
    tipo: string
    valor_id: number
    descripcion: string
    activo: boolean
}

export const ConfigValoresPendientesPage = () => {
    const [configs, setConfigs] = useState<ConfigValorPendiente[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<ConfigValorPendiente | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const cargarDatos = async () => {
        setLoading(true)
        try {
            const data = await apiService.configValoresPendientes.listar()
            setConfigs(data)
        } catch (err) {
            console.error('Error cargando datos:', err)
            toast.error('Error al cargar configuraciones')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Filtrar configs por descripción o tipo
    const configsFiltrados = configs.filter(config => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            config.descripcion.toLowerCase().includes(term) ||
            config.tipo.toLowerCase().includes(term) ||
            config.valor_id.toString().includes(term)
        )
    })

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (config: ConfigValorPendiente) => {
        setItemEditando(config)
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            await apiService.configValoresPendientes.eliminar(id)
            toast.success('Configuración eliminada')
            cargarDatos()
        } catch (err: any) {
            console.error(err)
            toast.error('Error al eliminar: ' + (err.message || 'Error desconocido'))
        }
    }

    const handleSave = async (tipo: string, valor_id: number, descripcion: string, activo: boolean) => {
        try {
            const dto = { tipo, valor_id, descripcion, activo }

            if (itemEditando) {
                await apiService.configValoresPendientes.actualizar(itemEditando.id, dto)
                toast.success('Configuración actualizada')
            } else {
                await apiService.configValoresPendientes.crear(dto)
                toast.success('Configuración creada')
            }

            setModalOpen(false)
            cargarDatos()
        } catch (err: any) {
            console.error(err)
            toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'}: ${err.message || 'Error desconocido'}`)
        }
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'tipo' as const, label: 'Tipo Entidad' },
        { key: 'valor_id' as const, label: 'ID Valor' },
        { key: 'descripcion' as const, label: 'Descripción' },
        { key: 'activo' as const, label: 'Activo' },
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <AlertCircle className="text-blue-600" size={28} />
                        <h1 className="text-2xl font-bold text-gray-900">Configuración de Valores Pendientes</h1>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Gestiona los valores que deben ser ignorados o tratados como pendientes según su tipo
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={configsFiltrados} columns={csvColumns} filenamePrefix="config_valores_pendientes" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nueva Configuración
                    </button>
                </div>
            </div>

            {/* Filtro de búsqueda */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Buscar por tipo, ID o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                {searchTerm && (
                    <p className="text-sm text-gray-600 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        Mostrando {configsFiltrados.length} de {configs.length} configuraciones
                    </p>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <ConfigValoresPendientesTable
                    configs={configsFiltrados}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <ConfigValorPendienteModal
                isOpen={modalOpen}
                config={itemEditando}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
