import { Edit2, Trash2 } from 'lucide-react'

interface ConfigFiltroGrupo {
    id: number
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

interface ConfigFiltrosGruposTableProps {
    configs: ConfigFiltroGrupo[]
    grupos: { id: number, nombre: string }[]
    loading: boolean
    onEdit: (config: ConfigFiltroGrupo) => void
    onDelete: (id: number) => void
}

export const ConfigFiltrosGruposTable = ({ configs, grupos, loading, onEdit, onDelete }: ConfigFiltrosGruposTableProps) => {
    const getGrupoNombre = (grupoId: number) => {
        const grupo = grupos.find(g => g.id === grupoId)
        return grupo ? grupo.nombre : `ID ${grupoId}`
    }

    if (loading) {
        return (
            <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Cargando configuraciones...</p>
            </div>
        )
    }

    if (configs.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500">
                <p className="text-lg">No hay configuraciones de filtros</p>
                <p className="text-sm mt-1">Crea una nueva configuración para comenzar</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Grupo</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Etiqueta</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Activo por Defecto</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {configs.map((config) => (
                        <tr key={config.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {config.id}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {getGrupoNombre(config.grupo_id)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {config.etiqueta}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                {config.activo_por_defecto ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Sí
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        No
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <button
                                        onClick={() => onEdit(config)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`¿Eliminar la configuración "${config.etiqueta}"?`)) {
                                                onDelete(config.id)
                                            }
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
