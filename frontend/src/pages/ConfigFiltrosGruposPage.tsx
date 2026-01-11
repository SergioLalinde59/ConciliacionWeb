import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Filter } from 'lucide-react'
import { ConfigFiltrosGruposTable } from '../components/ConfigFiltrosGruposTable'
import { ConfigFiltroGrupoModal } from '../components/ConfigFiltroGrupoModal'
import { CsvExportButton } from '../components/CsvExportButton'
import { apiService } from '../services/api'

interface ConfigFiltroGrupo {
    id: number
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

export const ConfigFiltrosGruposPage = () => {
    const [configs, setConfigs] = useState<ConfigFiltroGrupo[]>([])
    const [grupos, setGrupos] = useState<{ id: number, nombre: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<ConfigFiltroGrupo | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const cargarDatos = async () => {
        setLoading(true)
        try {
            const [configsData, gruposData] = await Promise.all([
                apiService.configFiltrosGrupos.listar(),
                apiService.grupos.listar()
            ])
            setConfigs(configsData)
            setGrupos(gruposData)
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

    // Filtrar configs por etiqueta
    const configsFiltrados = configs.filter(config => {
        if (!searchTerm) return true
        return config.etiqueta.toLowerCase().includes(searchTerm.toLowerCase())
    })

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (config: ConfigFiltroGrupo) => {
        setItemEditando(config)
        setModalOpen(true)
    }

    const handleDelete = async (id: number) => {
        try {
            await apiService.configFiltrosGrupos.eliminar(id)
            toast.success('Configuración eliminada')
            cargarDatos()
        } catch (err: any) {
            console.error(err)
            toast.error('Error al eliminar: ' + (err.message || 'Error desconocido'))
        }
    }

    const handleSave = async (grupo_id: number, etiqueta: string, activo_por_defecto: boolean) => {
        try {
            const dto = { grupo_id, etiqueta, activo_por_defecto }

            if (itemEditando) {
                await apiService.configFiltrosGrupos.actualizar(itemEditando.id, dto)
                toast.success('Configuración actualizada')
            } else {
                await apiService.configFiltrosGrupos.crear(dto)
                toast.success('Configuración creada')
            }

            setModalOpen(false)
            cargarDatos()
        } catch (err: any) {
            console.error(err)
            toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'}: ${err.message || 'Error desconocido'}`)
        }
    }

    const getGrupoNombre = (grupoId: number) => {
        const grupo = grupos.find(g => g.id === grupoId)
        return grupo ? grupo.nombre : grupoId.toString()
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'grupo_id', label: 'Grupo ID', accessor: (c: ConfigFiltroGrupo) => c.grupo_id },
        { key: 'grupo_nombre', label: 'Grupo', accessor: (c: ConfigFiltroGrupo) => getGrupoNombre(c.grupo_id) },
        { key: 'etiqueta' as const, label: 'Etiqueta' },
        { key: 'activo_por_defecto' as const, label: 'Activo por Defecto' },
    ]

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Filter className="text-blue-600" size={28} />
                        <h1 className="text-2xl font-bold text-gray-900">Configuración de Filtros</h1>
                    </div>
                    <p className="text-gray-500 text-sm">
                        Gestiona las configuraciones de filtros de exclusión por grupos
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={configsFiltrados} columns={csvColumns} filenamePrefix="config_filtros" />
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
                    placeholder="Buscar por etiqueta..."
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
                <ConfigFiltrosGruposTable
                    configs={configsFiltrados}
                    grupos={grupos}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <ConfigFiltroGrupoModal
                isOpen={modalOpen}
                config={itemEditando}
                grupos={grupos}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
