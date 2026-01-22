
import { useState, useEffect, useMemo, useCallback } from 'react'
import { DashboardSummaryRibbon } from '../components/organisms/dashboard/DashboardSummaryRibbon'
import { DashboardAccountChart } from '../components/organisms/dashboard/DashboardAccountChart'
import { DashboardAccountStats } from '../components/organisms/dashboard/DashboardAccountStats'
import { CostCenterDetailsModal } from '../components/organisms/dashboard/CostCenterDetailsModal'
import { ReportFilters } from '../components/organisms/dashboard/ReportFilters'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { getAnioYTD } from '../utils/dateUtils'
import type { DashboardStats } from '../services/dashboard.service'
import type { ConfigFiltroExclusion } from '../types/filters'

import { Button } from '../components/atoms/Button'
import { RefreshCw } from 'lucide-react'

export const DashboardPage = () => {

    const [stats, setStats] = useState<DashboardStats[]>([])
    const [loadingStats, setLoadingStats] = useState(true)
    const [configFiltrosExclusion, setConfigFiltrosExclusion] = useState<ConfigFiltroExclusion[]>([])

    // ---- ESTADO DE FILTROS ----
    const [fechaInicio, setFechaInicio] = useState(getAnioYTD().inicio)
    const [fechaFin, setFechaFin] = useState(getAnioYTD().fin)

    // Selectores
    const [cuentaId, setCuentaId] = useState('')
    const [terceroId, setTerceroId] = useState('')
    const [centroCostoId, setCentroCostoId] = useState('')
    const [conceptoId, setConceptoId] = useState('')

    // Toggles

    const [mostrarIngresos, setMostrarIngresos] = useState(true)
    const [mostrarEgresos, setMostrarEgresos] = useState(true)
    // Inicialmente excluimos IDs típicos (ej: 0 o nulos si se quiere) o vacío
    const [centrosCostosExcluidos, setCentrosCostosExcluidos] = useState<number[]>([])

    // ---- CATÁLOGOS ----
    const { terceros, centrosCostos, conceptos, cuentas } = useCatalogo()

    // ---- ESTADO MODALES ----
    const [detailsModalOpen, setDetailsModalOpen] = useState(false)


    // Cargadores de Datos


    const cargarEstadisticas = useCallback(() => {
        setLoadingStats(true)
        apiService.dashboard.obtenerEstadisticas(fechaInicio, fechaFin)
            .then(data => {
                setStats(data)
                setLoadingStats(false)
            })
            .catch(err => {
                console.error("Error cargando estadísticas:", err)
                setLoadingStats(false)
            })
    }, [fechaInicio, fechaFin])

    const cargarConfigExclusion = useCallback(() => {
        apiService.movimientos.obtenerConfiguracionFiltrosExclusion()
            .then(configs => {
                setConfigFiltrosExclusion(configs)
                // Set default exclusions
                const defaultExcluidos = configs
                    .filter(c => c.activo_por_defecto)
                    .map(c => c.centro_costo_id)
                setCentrosCostosExcluidos(prev => {
                    // Combine with any existing manual selection if needed, 
                    // but on initial load usually we just want defaults.
                    // If prev is empty, use defaults.
                    return prev.length === 0 ? defaultExcluidos : prev
                })
            })
            .catch(console.error)
    }, [])

    // Efectos Iniciales
    // Efectos Iniciales
    useEffect(() => {
        cargarConfigExclusion()
    }, [cargarConfigExclusion])

    useEffect(() => {
        cargarEstadisticas()
    }, [cargarEstadisticas])


    // ---- FILTRADO DE ESTADÍSTICAS (Charts & Ribbon) ----
    const filteredStats = useMemo(() => {
        return stats.filter(stat => {
            // 1. Filtro Cuenta
            if (cuentaId && stat.cuenta_id.toString() !== cuentaId) return false

            // 2. Filtro Centro Costo
            if (centroCostoId && stat.centro_costo_id?.toString() !== centroCostoId) return false

            // 3. Exclusiones por Centro de Costo (Checkboxes dinámicos)
            if (stat.centro_costo_id && centrosCostosExcluidos.includes(stat.centro_costo_id)) return false

            // 4. Ingresos / Egresos Visibilidad
            // Se maneja a nivel de cálculo de valor, no de filtrado de registro, 
            // a menos que ingreso y egreso sean 0 (que pasaría si ocultamos ambos)

            return true
        })
    }, [stats, cuentaId, centroCostoId, centrosCostosExcluidos])

    // Totales calculados sobre la data filtrada
    const totales = useMemo(() => {
        return filteredStats.reduce((acc, curr) => {
            // Aplicar visibilidad de Ingresos/Egresos
            const ingresos = mostrarIngresos ? curr.ingresos : 0
            const egresos = mostrarEgresos ? curr.egresos : 0

            return {
                ingresos: acc.ingresos + ingresos,
                egresos: acc.egresos + egresos,
                saldo: acc.saldo + (ingresos - egresos)
            }
        }, { ingresos: 0, egresos: 0, saldo: 0 })
    }, [filteredStats, mostrarIngresos, mostrarEgresos])

    // Data para Gráficos
    const chartData = useMemo(() => {
        // Mapeamos filteredStats pero aplicando la máscara de visibilidad de ingresos/egresos
        return filteredStats.map(stat => ({
            ...stat,
            ingresos: mostrarIngresos ? stat.ingresos : 0,
            egresos: mostrarEgresos ? stat.egresos : 0
        }))
    }, [filteredStats, mostrarIngresos, mostrarEgresos])





    // Handlers
    const handleResetFilters = () => {
        setFechaInicio(getAnioYTD().inicio)
        setFechaFin(getAnioYTD().fin)
        setCuentaId('')
        setTerceroId('')
        setCentroCostoId('')
        setConceptoId('')

        setMostrarIngresos(true)
        setMostrarEgresos(true)
        setCentrosCostosExcluidos([])
    }



    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard Financiero</h1>
                    <p className="text-gray-500">Resumen ejecutivo y gestión operativa</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => { cargarEstadisticas(); }}>
                        <RefreshCw size={16} className="mr-2" />
                        Actualizar
                    </Button>
                </div>
            </header>

            {/* SECCIÓN SUPERIOR: FILTROS UNIFICADOS */}
            <ReportFilters
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
                onFechaInicioChange={setFechaInicio}
                onFechaFinChange={setFechaFin}

                terceroId={terceroId}
                onTerceroChange={setTerceroId}
                centroCostoId={centroCostoId}
                onCentroCostoChange={setCentroCostoId}
                conceptoId={conceptoId}
                onConceptoChange={setConceptoId}

                cuentaId={cuentaId}
                onCuentaChange={setCuentaId}



                mostrarIngresos={mostrarIngresos}
                onMostrarIngresosChange={setMostrarIngresos}
                mostrarEgresos={mostrarEgresos}
                onMostrarEgresosChange={setMostrarEgresos}

                configuracionExclusion={configFiltrosExclusion}
                centrosCostosExcluidos={centrosCostosExcluidos}
                onCentrosCostosExcluidosChange={setCentrosCostosExcluidos}

                cuentas={cuentas}
                terceros={terceros}
                centrosCostos={centrosCostos}
                conceptos={conceptos}

                onReset={handleResetFilters}
            />

            {/* SECCIÓN 1: RIBBON Y GRÁFICOS (Stats) */}
            <div className="space-y-6">
                <DashboardSummaryRibbon
                    ingresos={totales.ingresos}
                    egresos={totales.egresos}
                    saldo={totales.saldo}
                />

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-gray-800">Comportamiento por Cuenta</h2>
                        {/* <Button variant="secondary" size="sm" onClick={() => setDetailsModalOpen(true)}>
                            <List size={16} className="mr-2" />
                            Ver Detalle por Centro de Costos
                        </Button> */}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="min-h-[300px]">
                            <DashboardAccountChart data={chartData} isLoading={loadingStats} />
                        </div>
                        <div className="border-l border-gray-100 pl-8 hidden lg:block overflow-y-auto max-h-[400px]">
                            <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase">Resumen por Cuenta</h3>
                            <DashboardAccountStats stats={filteredStats} loading={loadingStats} />
                        </div>
                    </div>
                    {/* Mobile fallback for table */}
                    <div className="mt-8 lg:hidden">
                        <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase">Resumen por Cuenta</h3>
                        <DashboardAccountStats stats={filteredStats} loading={loadingStats} />
                    </div>
                </div>
            </div>



            {/* MODALES */}
            <CostCenterDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                uniqueStats={chartData}
            />


        </div>
    )
}
