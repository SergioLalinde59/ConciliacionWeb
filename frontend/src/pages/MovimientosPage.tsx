import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutList } from 'lucide-react'


import type { Movimiento } from '../types'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import { FiltrosReporte } from '../components/organisms/FiltrosReporte'
import { EstadisticasTotales } from '../components/organisms/EstadisticasTotales'
import { MovimientosTable } from '../components/organisms/MovimientosTable'
import { MovimientoModal } from '../components/organisms/modals/MovimientoModal'
import toast from 'react-hot-toast'


export const MovimientosPage = () => {
    const navigate = useNavigate()

    // Filtros
    // Filtros persistentes con useSessionStorage
    const [desde, setDesde] = useSessionStorage('filtro_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('filtro_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('filtro_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('filtro_terceroId', '')
    const [centroCostoId, setCentroCostoId] = useSessionStorage('filtro_centroCostoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('filtro_conceptoId', '')
    const [mostrarIngresos, setMostrarIngresos] = useSessionStorage('filtro_mostrarIngresos', true)
    const [mostrarEgresos, setMostrarEgresos] = useSessionStorage('filtro_mostrarEgresos', true)

    // Dynamic Exclusion Logic
    const [configuracionExclusion, setConfiguracionExclusion] = useState<Array<{ centro_costo_id: number; etiqueta: string; activo_por_defecto: boolean }>>([])
    // We use null initial value to detect if we need to set defaults from config
    const [centrosCostosExcluidos, setCentrosCostosExcluidos] = useSessionStorage<number[] | null>('filtro_centrosCostosExcluidos', null)

    // Centros de costos excluidos finales para la API
    const actualCentrosCostosExcluidos = useMemo(() => {
        return centrosCostosExcluidos || []
    }, [centrosCostosExcluidos])


    // Datos Maestros desde Hook centralizado
    const { cuentas, terceros, centrosCostos, conceptos } = useCatalogo()

    // Paginación ELIMINADA - mostrar todos los registros
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(true)
    const [totalesGlobales, setTotalesGlobales] = useState<{ ingresos: number; egresos: number; saldo: number } | null>(null)

    // Estado para borrado
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [movimientoToDelete, setMovimientoToDelete] = useState<Movimiento | null>(null)



    const totales = useMemo(() => {
        // Use global totals from server if available, otherwise calculate from current page
        if (totalesGlobales) {
            return totalesGlobales
        }

        // Fallback: calculate from current page (backward compatibility)
        let ingresos = 0
        let egresos = 0
        movimientos.forEach(m => {
            if (m.valor > 0) ingresos += m.valor
            else egresos += Math.abs(m.valor)
        })
        return {
            ingresos,
            egresos,
            saldo: ingresos - egresos
        }
    }, [movimientos, totalesGlobales])


    const cargarMovimientos = useCallback((f_desde?: string, f_hasta?: string) => {
        setLoading(true)

        // Determinar tipo_movimiento basado en los checkboxes
        let tipoMovimiento: string | undefined = undefined
        if (mostrarIngresos && !mostrarEgresos) {
            tipoMovimiento = 'ingresos'
        } else if (!mostrarIngresos && mostrarEgresos) {
            tipoMovimiento = 'egresos'
        }
        // Si ambos están marcados o ninguno, tipoMovimiento queda undefined (muestra todos)

        // Parse IDs to numbers or undefined (empty strings should be undefined)
        const parsedCuentaId = cuentaId && cuentaId !== '' ? parseInt(cuentaId) : undefined
        const parsedTerceroId = terceroId && terceroId !== '' ? parseInt(terceroId) : undefined
        const parsedCentroCostoId = centroCostoId && centroCostoId !== '' ? parseInt(centroCostoId) : undefined
        const parsedConceptoId = conceptoId && conceptoId !== '' ? parseInt(conceptoId) : undefined

        const filterParams = {
            desde: f_desde || desde,
            hasta: f_hasta || hasta,
            cuenta_id: parsedCuentaId,
            tercero_id: parsedTerceroId,
            centro_costo_id: parsedCentroCostoId,
            concepto_id: parsedConceptoId,
            centros_costos_excluidos: actualCentrosCostosExcluidos.length > 0 ? actualCentrosCostosExcluidos : undefined,

            tipo_movimiento: tipoMovimiento
            // Sin parámetros de paginación - cargar todos
        }

        apiService.movimientos.listar(filterParams)
            .then(response => {
                setMovimientos(response.items)  // Todos los registros
                // Store global totals from server if available
                if (response.totales) {
                    setTotalesGlobales(response.totales)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando movimientos:", err)
                setLoading(false)
            })

    }, [desde, hasta, cuentaId, terceroId, centroCostoId, conceptoId, mostrarIngresos, mostrarEgresos, actualCentrosCostosExcluidos])


    // Load on mount and whenever filters change
    useEffect(() => {
        cargarMovimientos()
    }, [cargarMovimientos])

    // ELIMINADO: useEffect para cambio de página

    // Load exclusion config and set defaults if needed
    useEffect(() => {
        apiService.movimientos.obtenerConfiguracionFiltrosExclusion()
            .then(data => {
                setConfiguracionExclusion(data)

                // If no user preference saved (null), use defaults from DB
                if (centrosCostosExcluidos === null) {
                    // Set all filters with activo_por_defecto=true as excluded
                    const defaults = data.filter((d: any) => d.activo_por_defecto).map((d: any) => d.centro_costo_id)
                    setCentrosCostosExcluidos(defaults)
                }
            })
            .catch(err => console.error("Error fetching filter config", err))
    }, [])

    // Note: Reload when centrosCostosExcluidos changes is handled by main useEffect via actualCentrosCostosExcluidos



    const handleLimpiar = () => {
        const mesActual = getMesActual()
        setDesde(mesActual.inicio)
        setHasta(mesActual.fin)
        setCuentaId('')
        setTerceroId('')
        setCentroCostoId('')
        setConceptoId('')
        // Reset all exclusion filters to defaults from config
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.centro_costo_id)
            setCentrosCostosExcluidos(defaults)
        } else {
            setCentrosCostosExcluidos([])
        }

        setMostrarIngresos(true)
        setMostrarEgresos(true)
    }

    const handleDeleteClick = (mov: Movimiento) => {
        setMovimientoToDelete(mov)
        setIsDeleteModalOpen(true)
    }

    const handleConfirmDelete = async () => {
        if (!movimientoToDelete) return

        try {
            await apiService.movimientos.eliminar(movimientoToDelete.id)
            toast.success('Movimiento eliminado correctamente')
            setIsDeleteModalOpen(false)
            setMovimientoToDelete(null)
            cargarMovimientos() // Recargar lista
        } catch (error: any) {
            console.error('Error eliminando movimiento:', error)
            toast.error(error.message || 'Error al eliminar el movimiento')
        }
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <LayoutList className="text-blue-600" size={24} />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Movimientos</h1>
                        <p className="text-gray-500 text-sm mt-1">Visualización y clasificación de transacciones</p>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/movimientos/nuevo')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors flex items-center gap-2 no-print"
                >
                    <span className="text-lg">+</span> Nuevo
                </button>
            </div>

            {/* Filtros usando componente reutilizable */}
            <FiltrosReporte
                desde={desde}
                hasta={hasta}
                onDesdeChange={setDesde}
                onHastaChange={setHasta}
                cuentaId={cuentaId}
                onCuentaChange={setCuentaId}
                cuentas={cuentas}
                terceroId={terceroId}
                onTerceroChange={setTerceroId}
                centroCostoId={centroCostoId}
                onCentroCostoChange={(val) => {
                    setCentroCostoId(val)
                    setConceptoId('')
                }}
                conceptoId={conceptoId}
                onConceptoChange={setConceptoId}
                terceros={terceros}
                centrosCostos={centrosCostos}
                conceptos={conceptos}
                showClasificacionFilters={true}

                mostrarIngresos={mostrarIngresos}
                onMostrarIngresosChange={setMostrarIngresos}
                mostrarEgresos={mostrarEgresos}
                onMostrarEgresosChange={setMostrarEgresos}
                showIngresosEgresos={true}
                configuracionExclusion={configuracionExclusion}
                centrosCostosExcluidos={actualCentrosCostosExcluidos}
                onCentrosCostosExcluidosChange={setCentrosCostosExcluidos}
                onLimpiar={handleLimpiar}
            />

            {/* Estadísticas Totales */}
            <EstadisticasTotales
                ingresos={totales.ingresos}
                egresos={totales.egresos}
                saldo={totales.saldo}
            />

            {/* Tabla de Resultados unificada */}
            <MovimientosTable
                movimientos={movimientos}
                loading={loading}
                onEdit={(mov) => navigate(`/movimientos/editar/${mov.id}`)}
                onDelete={handleDeleteClick}
                totales={totales}
            />

            {/* Modal de Borrado */}
            <MovimientoModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false)
                    setMovimientoToDelete(null)
                }}
                movimiento={movimientoToDelete}
                onSave={handleConfirmDelete}
                mode="delete"
            />


        </div>
    )
}

