import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'
import type { Concepto, CentroCosto } from '../types'
import { ConceptosTable } from '../components/organisms/tables/ConceptosTable'
import { ConceptoModal } from '../components/organisms/modals/ConceptoModal'
import { ComboBox } from '../components/molecules/ComboBox'
import { CsvExportButton } from '../components/molecules/CsvExportButton'
import { apiService } from '../services/api'

export const ConceptosPage = () => {
    const [conceptos, setConceptos] = useState<Concepto[]>([])
    const [centrosCostos, setCentrosCostos] = useState<CentroCosto[]>([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [itemEditando, setItemEditando] = useState<Concepto | null>(null)
    const [centroCostoFiltro, setCentroCostoFiltro] = useState<string>('') // Filtro por centro de costo

    const cargarCentrosCostos = async () => {
        try {
            const data = await apiService.centrosCostos.listar()
            setCentrosCostos(data)
        } catch (err) {
            console.error("Error cargando centros de costos:", err)
            toast.error("Error al cargar centros de costos")
        }
    }

    const cargarConceptos = async (centroCostoId?: number) => {
        setLoading(true)
        try {
            // Si centroCostoId es 0 o undefined, pasamos undefined al servicio para que traiga todos
            const idParaServicio = (centroCostoId && centroCostoId !== 0) ? centroCostoId : undefined
            const data = await apiService.conceptos.listar(idParaServicio)
            setConceptos(data)
        } catch (err) {
            console.error("Error cargando conceptos:", err)
            toast.error("Error al cargar conceptos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        cargarCentrosCostos()
        setLoading(false) // Initial load done
    }, [])

    useEffect(() => {
        const id = centroCostoFiltro ? parseInt(centroCostoFiltro) : 0
        cargarConceptos(id)
    }, [centroCostoFiltro])

    // No client-side filtering needed anymore as we fetch filtered data
    const conceptosFiltrados = conceptos

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
                const id = centroCostoFiltro ? parseInt(centroCostoFiltro) : 0
                cargarConceptos(id)
            })
            .catch(err => {
                toast.error("Error al eliminar: " + err.message)
            })
    }

    const handleSave = (data: { nombre: string, centro_costo_id: number }) => {
        const payload = {
            concepto: data.nombre,
            centro_costo_id: data.centro_costo_id
        }

        const promise = itemEditando
            ? apiService.conceptos.actualizar(itemEditando.id, payload)
            : apiService.conceptos.crear(payload)

        promise
            .then(() => {
                toast.success(itemEditando ? 'Concepto actualizado' : 'Concepto creado')
                setModalOpen(false)
                const id = centroCostoFiltro ? parseInt(centroCostoFiltro) : 0
                cargarConceptos(id)
            })
            .catch(err => {
                toast.error(`Error al ${itemEditando ? 'actualizar' : 'crear'} el concepto: ${err.message}`)
            })
    }

    const csvColumns = [
        { key: 'id' as const, label: 'ID' },
        { key: 'nombre' as const, label: 'Nombre' },
        { key: 'centro_costo_id' as const, label: 'Centro Costo ID' },
        { key: 'centro_costo_nombre' as const, label: 'Centro Costo' },
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

            {/* Filtro por Centro de Costo */}
            <div className="mb-4 flex items-center gap-3">
                <div className="w-80">
                    <ComboBox
                        label=""
                        value={centroCostoFiltro}
                        onChange={value => setCentroCostoFiltro(value)}
                        options={[
                            { id: 0, nombre: 'Todos los centros de costos' },
                            ...centrosCostos
                        ]}
                        placeholder="Seleccione o busque centro de costo..."
                    />
                </div>
                {centroCostoFiltro && centroCostoFiltro !== '0' && (
                    <span className="text-sm text-gray-600">
                        Mostrando {conceptosFiltrados.length} de {conceptos.length} conceptos
                    </span>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <ConceptosTable
                    conceptos={conceptosFiltrados}
                    centrosCostos={centrosCostos}
                    loading={loading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>

            <ConceptoModal
                isOpen={modalOpen}
                concepto={itemEditando}
                centrosCostos={centrosCostos}
                conceptos={conceptos}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
            />
        </div>
    )
}
