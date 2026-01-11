import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Concepto, Grupo } from '../types'
import { ConceptosTable } from '../components/ConceptosTable'
import { ConceptoModal } from '../components/ConceptoModal'
import { ComboBox } from '../components/molecules/ComboBox'
import { CsvExportButton } from '../components/CsvExportButton'
import { apiService } from '../services/api'

export const ConceptosPage = () => {
    const [conceptos, setConceptos] = useState<Concepto[]>([])
    const [grupos, setGrupos] = useState<Grupo[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Concepto | null>(null)
    const [grupoFiltro, setGrupoFiltro] = useState<string>('') // Filtro por grupo

    const cargarDatos = async () => {
        setLoading(true)
        try {
            const [dataConceptos, dataGrupos] = await Promise.all([
                apiService.conceptos.listar(),
                apiService.grupos.listar()
            ])
            setConceptos(dataConceptos)
            setGrupos(dataGrupos)
        } catch (err) {
            console.error("Error cargando datos:", err)
            toast.error("Error al cargar datos maestros")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarDatos()
    }, [])

    // Filtrar conceptos por grupo
    const conceptosFiltrados = conceptos.filter(concepto => {
        if (!grupoFiltro || grupoFiltro === '0') return true // Si no hay filtro o es '0', mostrar todos
        return concepto.grupo_id === parseInt(grupoFiltro)
    })

    const handleCreate = () => {
        setItemEditando(null)
        setModalOpen(true)
    }

    const handleEdit = (concepto: Concepto) => {
        setItemEditando(concepto)
        setModalOpen(true)
    }

    const handleDelete = (id: number) => {
        apiService.conceptos.eliminar(id)
            .then(() => {
                toast.success('Concepto eliminado')
                cargarDatos()
            })
            .catch(err => {
                toast.error("Error al eliminar: " + err.message)
            })
    }

    const handleSave = (data: { nombre: string, grupo_id: number }) => {
        const payload = {
            concepto: data.nombre,
            grupoid_fk: data.grupo_id
        }

        const promise = itemEditando
            ? apiService.conceptos.actualizar(itemEditando.id, payload)
            : apiService.conceptos.crear(payload)

        promise
            .then(() => {
                toast.success(itemEditando ? 'Concepto actualizado' : 'Concepto creado')
                setModalOpen(false)
                cargarDatos()
            })
            .catch(err => {
                toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'} el concepto: ${err.message}`)
            })
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
        { key: 'grupo_id' as const, label: 'Grupo ID' },
        { key: 'grupo_nombre' as const, label: 'Grupo' },
    ]

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Conceptos</h1>
                    <p className="text-gray-500 text-sm mt-1">Detalle específico de los gastos o ingresos</p>
                </div>
                <div className="flex items-center gap-2">
                    <CsvExportButton data={conceptosFiltrados} columns={csvColumns} filenamePrefix="conceptos" />
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                    >
                        <Plus size={18} />
                        Nuevo Concepto
                    </button>
                </div>
            </div>

            {/* Filtro por Grupo */}
            <div className="mb-4 flex items-center gap-3">
                <div className="w-80">
                    <ComboBox
                        label=""
                        value={grupoFiltro}
                        onChange={value => setGrupoFiltro(value)}
                        options={[
                            { id: 0, nombre: 'Todos los grupos' },
                            ...grupos
                        ]}
                        placeholder="Seleccione o busque grupo..."
                    />
                </div>
                {grupoFiltro && grupoFiltro !== '0' && (
                    <span className="text-sm text-gray-600">
                        Mostrando {conceptosFiltrados.length} de {conceptos.length} conceptos
                    </span>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <ConceptosTable
                    conceptos={conceptosFiltrados}
                    grupos={grupos}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <ConceptoModal
                isOpen={modalOpen}
                concepto={itemEditando}
                grupos={grupos}
                conceptos={conceptos}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
