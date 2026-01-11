import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart2, X, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { EstadisticasTotales } from '../components/EstadisticasTotales'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import { FiltrosReporte } from '../components/FiltrosReporte'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import type { ConfigFiltroExclusion } from '../types/filters'
import { useReporteClasificacion, useConfiguracionExclusion } from '../hooks/useReportes'


interface ItemReporte {
    nombre: string
    ingresos: number
    egresos: number
    saldo: number
    // Campos opcionales para drilldown
    tercero_id?: number
    grupo_id?: number
}

export const ReporteClasificacionesPage = () => {
    // Filtros
    const [desde, setDesde] = useSessionStorage('rep_filtro_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('rep_filtro_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('rep_filtro_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('rep_filtro_terceroId', '')
    const [grupoId, setGrupoId] = useSessionStorage('rep_filtro_grupoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('rep_filtro_conceptoId', '')
    const [mostrarIngresos, setMostrarIngresos] = useSessionStorage('rep_filtro_mostrar_ingresos', true)

    const [mostrarEgresos, setMostrarEgresos] = useSessionStorage('rep_filtro_mostrar_egresos', true)

    // Dynamic Exclusion
    // Dynamic Exclusion
    const { data: configuracionExclusion = [] } = useConfiguracionExclusion()
    const [gruposExcluidos, setGruposExcluidos] = useSessionStorage<number[] | null>('rep_filtro_gruposExcluidos', null)

    const actualGruposExcluidos = gruposExcluidos || []


    // Tipo de Agrupación (Calculado automáticamente más abajo)

    // Drilldown State (First Level: Grupos)
    const [drilldownState, setDrilldownState] = useState<{
        isOpen: boolean
        title: string
        data: ItemReporte[]
        loading: boolean
        terceroId?: string // Para saber qué tercero se está viendo
        sortField: 'nombre' | 'ingresos' | 'egresos' | 'saldo'
        sortDirection: 'asc' | 'desc'
    }>({
        isOpen: false,
        title: '',
        data: [],
        loading: false,
        sortField: 'egresos',
        sortDirection: 'desc'
    })

    // Second Level Drilldown State (Conceptos)
    const [drilldownConceptoState, setDrilldownConceptoState] = useState<{
        isOpen: boolean
        title: string
        data: ItemReporte[]
        loading: boolean
        sortField: 'nombre' | 'ingresos' | 'egresos' | 'saldo'
        sortDirection: 'asc' | 'desc'
    }>({
        isOpen: false,
        title: '',
        data: [],
        loading: false,
        sortField: 'egresos',
        sortDirection: 'desc'
    })

    // Datos Maestros
    // Datos Maestros
    const { cuentas, terceros, grupos, conceptos } = useCatalogo()

    // Lógica Params (Calculado en render para el hook)
    const tipoAgrupacion = useMemo(() => {
        if (terceroId) {
            return grupoId ? 'concepto' : 'grupo'
        }
        return 'tercero'
    }, [terceroId, grupoId])

    const tipoMovimiento = useMemo(() => {
        if (mostrarIngresos && !mostrarEgresos) return 'ingresos'
        if (!mostrarIngresos && mostrarEgresos) return 'egresos'
        return undefined
    }, [mostrarIngresos, mostrarEgresos])

    const paramsReporte = useMemo(() => ({
        tipo: tipoAgrupacion,
        desde,
        hasta,
        cuenta_id: cuentaId ? Number(cuentaId) : undefined,
        tercero_id: terceroId ? Number(terceroId) : undefined,
        grupo_id: grupoId ? Number(grupoId) : undefined,
        concepto_id: conceptoId ? Number(conceptoId) : undefined,
        grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined,
        tipo_movimiento: tipoMovimiento
    }), [tipoAgrupacion, desde, hasta, cuentaId, terceroId, grupoId, conceptoId, actualGruposExcluidos, tipoMovimiento])

    const { data: datosRaw, isLoading: loading } = useReporteClasificacion(paramsReporte)
    const datos = (datosRaw as ItemReporte[]) || []

    // Sorting State
    const [sortField, setSortField] = useState<'nombre' | 'ingresos' | 'egresos' | 'saldo'>('egresos')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

    // Handle column sort
    const handleSort = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
        if (sortField === field) {
            // Toggle direction if clicking the same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            // New field, default to ascending
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Sorted data
    const datosSorted = useMemo(() => {
        if (!datos || datos.length === 0) return []

        const sorted = [...datos].sort((a, b) => {
            let aVal: any, bVal: any

            if (sortField === 'nombre') {
                aVal = a.nombre.toLowerCase()
                bVal = b.nombre.toLowerCase()
            } else {
                aVal = a[sortField]
                bVal = b[sortField]
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }, [datos, sortField, sortDirection])

    // Handle modal sort for first drilldown
    const handleModalSort = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
        setDrilldownState(prev => {
            if (prev.sortField === field) {
                return { ...prev, sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc' }
            } else {
                return { ...prev, sortField: field, sortDirection: 'asc' }
            }
        })
    }

    // Handle modal sort for second drilldown (Conceptos)
    const handleModalConceptoSort = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
        setDrilldownConceptoState(prev => {
            if (prev.sortField === field) {
                return { ...prev, sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc' }
            } else {
                return { ...prev, sortField: field, sortDirection: 'asc' }
            }
        })
    }

    // Sorted drilldown data
    const drilldownSorted = useMemo(() => {
        if (!drilldownState.data || drilldownState.data.length === 0) return []

        const sorted = [...drilldownState.data].sort((a, b) => {
            let aVal: any, bVal: any

            if (drilldownState.sortField === 'nombre') {
                aVal = a.nombre.toLowerCase()
                bVal = b.nombre.toLowerCase()
            } else {
                aVal = a[drilldownState.sortField]
                bVal = b[drilldownState.sortField]
            }

            if (aVal < bVal) return drilldownState.sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return drilldownState.sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }, [drilldownState.data, drilldownState.sortField, drilldownState.sortDirection])

    // Sorted concepto drilldown data
    const drilldownConceptoSorted = useMemo(() => {
        if (!drilldownConceptoState.data || drilldownConceptoState.data.length === 0) return []

        const sorted = [...drilldownConceptoState.data].sort((a, b) => {
            let aVal: any, bVal: any

            if (drilldownConceptoState.sortField === 'nombre') {
                aVal = a.nombre.toLowerCase()
                bVal = b.nombre.toLowerCase()
            } else {
                aVal = a[drilldownConceptoState.sortField]
                bVal = b[drilldownConceptoState.sortField]
            }

            if (aVal < bVal) return drilldownConceptoState.sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return drilldownConceptoState.sortDirection === 'asc' ? 1 : -1
            return 0
        })

        return sorted
    }, [drilldownConceptoState.data, drilldownConceptoState.sortField, drilldownConceptoState.sortDirection])

    // Totales for drilldown modal
    const totalesDrilldown = useMemo(() => {
        let ingresos = 0
        let egresos = 0
        if (drilldownState.data && drilldownState.data.length > 0) {
            drilldownState.data.forEach(d => {
                ingresos += (d.ingresos || 0)
                egresos += (d.egresos || 0)
            })
        }
        return { ingresos, egresos, saldo: ingresos - egresos }
    }, [drilldownState.data])

    // Totales for concepto drilldown modal
    const totalesDrilldownConcepto = useMemo(() => {
        let ingresos = 0
        let egresos = 0
        if (drilldownConceptoState.data && drilldownConceptoState.data.length > 0) {
            drilldownConceptoState.data.forEach(d => {
                ingresos += (d.ingresos || 0)
                egresos += (d.egresos || 0)
            })
        }
        return { ingresos, egresos, saldo: ingresos - egresos }
    }, [drilldownConceptoState.data])

    // Cargar datos al cargar el componente o cambiar filtros
    // Efecto para actualizar el estado local eliminado ya que tipoAgrupacion es derivado

    // Load Exclusion Config Defaults
    useEffect(() => {
        if (configuracionExclusion.length > 0 && gruposExcluidos === null) {
            const defaults = (configuracionExclusion as ConfigFiltroExclusion[]).filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        }
    }, [configuracionExclusion, gruposExcluidos])

    // Load Exclusion Config Effect Removed (handled above)

    const handleLimpiar = () => {
        const mesActual = getMesActual()
        setDesde(mesActual.inicio)
        setHasta(mesActual.fin)
        setCuentaId('')
        setTerceroId('')
        setGrupoId('')
        setConceptoId('')
        // Reset all exclusion filters to defaults from config
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        } else {
            setGruposExcluidos([])
        }
        setMostrarIngresos(true)
        setMostrarEgresos(true)
    }



    const handleDrilldown = async (item: ItemReporte) => {
        // Lógica: Si estoy en Tercero -> Ver Grupos. Si estoy en Grupo -> Ver Conceptos.
        // Como no tengo los IDs exactos en el 'nombre', necesito buscar el ID del tercero/grupo por nombre en los catálogos.


        let nextTitle = ''
        let filterParams: any = {
            desde,
            hasta,
            cuenta_id: cuentaId,
            concepto_id: conceptoId,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined,
            // Mantener filtro de tipo de movimiento para el drilldown también
            tipo_movimiento: (mostrarIngresos && !mostrarEgresos) ? 'ingresos' : (!mostrarIngresos && mostrarEgresos) ? 'egresos' : undefined
        }

        if (tipoAgrupacion === 'tercero') {
            const tObj = terceros.find(t => t.nombre === item.nombre)
            if (tObj) {
                nextTitle = `Detalle por Grupo: ${item.nombre}`
                filterParams.tercero_id = tObj.id
                filterParams.tipo = 'grupo'

                // Guardar el tercero_id para el segundo nivel de drilldown
                setDrilldownState({
                    isOpen: true,
                    title: nextTitle,
                    data: [],
                    loading: true,
                    terceroId: String(tObj.id),
                    sortField: 'egresos',
                    sortDirection: 'desc'
                })

                try {
                    const data = await apiService.movimientos.reporteClasificacion(filterParams)
                    setDrilldownState(prev => ({
                        ...prev,
                        data: (data as ItemReporte[]) || [],
                        loading: false
                    }))
                } catch (e) {
                    console.error("Error drilldown", e)
                    setDrilldownState(prev => ({
                        ...prev,
                        data: [],
                        loading: false
                    }))
                }
                return
            } else {
                return
            }
        } else if (tipoAgrupacion === 'grupo') {
            const gObj = grupos.find(g => g.nombre === item.nombre)
            if (gObj) {
                nextTitle = `Detalle por Concepto: ${item.nombre}`
                filterParams.tercero_id = terceroId // Mantener tercero seleccionado si existe
                filterParams.grupo_id = gObj.id
                filterParams.tipo = 'concepto'
            } else {
                return
            }
        } else {
            return // No drilldown from concepto
        }

        setDrilldownState({
            isOpen: true,
            title: nextTitle,
            data: [],
            loading: true,
            sortField: 'egresos',
            sortDirection: 'desc'
        })

        try {
            const data = await apiService.movimientos.reporteClasificacion(filterParams)
            setDrilldownState(prev => ({
                ...prev,
                data: (data as ItemReporte[]) || [],
                loading: false
            }))
        } catch (e) {
            console.error("Error drilldown", e)
            setDrilldownState(prev => ({
                ...prev,
                data: [],
                loading: false
            }))
        }
    }

    // Handle second-level drilldown (from grupo to concepto)
    const handleDrilldownConcepto = async (grupoItem: ItemReporte) => {
        const gObj = grupos.find(g => g.nombre === grupoItem.nombre)
        if (!gObj) return

        const nextTitle = `Detalle por Concepto: ${grupoItem.nombre}`
        const filterParams: any = {
            desde,
            hasta,
            cuenta_id: cuentaId,
            concepto_id: conceptoId,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined,
            tipo_movimiento: (mostrarIngresos && !mostrarEgresos) ? 'ingresos' : (!mostrarIngresos && mostrarEgresos) ? 'egresos' : undefined,
            tercero_id: drilldownState.terceroId, // Mantener el tercero del primer drilldown
            grupo_id: gObj.id,
            tipo: 'concepto'
        }

        setDrilldownConceptoState({
            isOpen: true,
            title: nextTitle,
            data: [],
            loading: true,
            sortField: 'egresos',
            sortDirection: 'desc'
        })

        try {
            const data = await apiService.movimientos.reporteClasificacion(filterParams)
            setDrilldownConceptoState(prev => ({
                ...prev,
                data: (data as ItemReporte[]) || [],
                loading: false
            }))
        } catch (e) {
            console.error("Error drilldown concepto", e)
            setDrilldownConceptoState(prev => ({
                ...prev,
                data: [],
                loading: false
            }))
        }
    }

    // Totales Generales (Recalculados cuando cambian los datos)
    const totales = useMemo(() => {
        let ingresos = 0
        let egresos = 0
        if (datos && datos.length > 0) {
            datos.forEach(d => {
                ingresos += (d.ingresos || 0)
                egresos += (d.egresos || 0)
            })
        }
        return { ingresos, egresos, saldo: ingresos - egresos }
    }, [datos])

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Reporte de Clasificaciones</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Análisis detallado: {tipoAgrupacion === 'tercero' ? 'Pareto de Terceros' : tipoAgrupacion === 'grupo' ? 'Grupos por Tercero' : 'Conceptos por Grupo'}
                </p>
            </div>

            {/* Panel de Filtros */}
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
                grupoId={grupoId}
                onGrupoChange={setGrupoId}
                conceptoId={conceptoId}
                onConceptoChange={setConceptoId}
                terceros={terceros}
                grupos={grupos}
                conceptos={conceptos}
                showClasificacionFilters={true}
                mostrarIngresos={mostrarIngresos}
                onMostrarIngresosChange={setMostrarIngresos}
                mostrarEgresos={mostrarEgresos}
                onMostrarEgresosChange={setMostrarEgresos}
                showIngresosEgresos={false}
                configuracionExclusion={configuracionExclusion}
                gruposExcluidos={actualGruposExcluidos}
                onGruposExcluidosChange={setGruposExcluidos}
                onLimpiar={handleLimpiar}
            />

            {/* Totales Cards */}
            <EstadisticasTotales
                ingresos={totales.ingresos}
                egresos={totales.egresos}
                saldo={totales.saldo}
            />

            {/* Gráfica y Tabla */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfica */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[500px]">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-blue-500" />
                        Distribución ({tipoAgrupacion === 'tercero' ? 'Por Tercero' : tipoAgrupacion === 'grupo' ? 'Por Grupo' : 'Por Concepto'})
                        <span className="text-xs font-normal text-gray-400 ml-auto">(Click en barra para detalle)</span>
                    </h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={datos.slice(0, 10)}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                onClick={(data: any) => {
                                    if (data && data.activePayload && data.activePayload.length > 0) {
                                        handleDrilldown(data.activePayload[0].payload)
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="nombre" type="category" width={100} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                {mostrarEgresos && <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[0, 4, 4, 0]} />}
                                {mostrarIngresos && <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[0, 4, 4, 0]} />}
                                {mostrarIngresos && mostrarEgresos && <Bar dataKey="saldo" name="Saldo" fill="#3b82f6" radius={[0, 4, 4, 0]} />}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tabla Detallada */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Detalle por Tercero</h3>
                        <span className="text-xs text-gray-400">(Click en fila para detalle)</span>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 sticky top-0 z-20">
                                    <th
                                        className="py-3 px-4 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('nombre')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nombre
                                            {sortField === 'nombre' ? (
                                                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : (
                                                <ArrowUpDown size={12} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('ingresos')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Ingresos
                                            {sortField === 'ingresos' ? (
                                                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : (
                                                <ArrowUpDown size={12} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('egresos')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Egresos
                                            {sortField === 'egresos' ? (
                                                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : (
                                                <ArrowUpDown size={12} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('saldo')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Saldo
                                            {sortField === 'saldo' ? (
                                                sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : (
                                                <ArrowUpDown size={12} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                </tr>
                                {/* Fila de Totales Generales en el Header o Top Body */}
                                <tr className="bg-gray-100 sticky top-[40px] z-20 font-bold border-b border-gray-200 shadow-sm">
                                    <td className="py-3 px-4 text-sm text-gray-700">TOTALES</td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={totales.ingresos} showCurrency={false} className="font-bold" />
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={-totales.egresos} showCurrency={false} className="font-bold" />
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={totales.saldo} showCurrency={false} className="font-bold" />
                                    </td>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-500">Cargando...</td></tr>
                                ) : datosSorted.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-500">No hay datos para mostrar</td></tr>
                                ) : (
                                    datosSorted.map((d, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => handleDrilldown(d)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3 px-4 text-sm font-medium text-gray-700">{d.nombre}</td>
                                            <td className="py-3 px-4 text-sm text-right font-mono">
                                                <CurrencyDisplay value={d.ingresos} showCurrency={false} />
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-mono">
                                                <CurrencyDisplay value={-d.egresos} showCurrency={false} />
                                            </td>
                                            <td className="py-3 px-4 text-sm text-right font-mono font-bold">
                                                <CurrencyDisplay value={d.saldo} showCurrency={false} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Drilldown Modal */}
            {drilldownState.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{drilldownState.title}</h3>
                                <p className="text-sm text-gray-500">
                                    {drilldownState.terceroId ? 'Desglose detallado (Click en fila para ver conceptos)' : 'Desglose detallado'}
                                </p>
                            </div>
                            <button
                                onClick={() => setDrilldownState(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 sticky top-0">
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalSort('nombre')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Nombre
                                                {drilldownState.sortField === 'nombre' ? (
                                                    drilldownState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalSort('ingresos')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Ingresos
                                                {drilldownState.sortField === 'ingresos' ? (
                                                    drilldownState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalSort('egresos')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Egresos
                                                {drilldownState.sortField === 'egresos' ? (
                                                    drilldownState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalSort('saldo')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Saldo
                                                {drilldownState.sortField === 'saldo' ? (
                                                    drilldownState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                    {/* Fila de Totales */}
                                    <tr className="bg-gray-100 sticky top-[40px] z-10 font-bold border-b border-gray-200 shadow-sm">
                                        <td className="py-3 px-6 text-sm text-gray-700">TOTALES</td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={totalesDrilldown.ingresos} showCurrency={false} className="font-bold" />
                                        </td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={-totalesDrilldown.egresos} showCurrency={false} className="font-bold" />
                                        </td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={totalesDrilldown.saldo} showCurrency={false} className="font-bold" />
                                        </td>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {drilldownState.loading ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-500">Cargando detalles...</td></tr>
                                    ) : drilldownSorted.length === 0 ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-500">No hay datos en este desglose</td></tr>
                                    ) : (
                                        drilldownSorted.map((d, i) => (
                                            <tr
                                                key={i}
                                                className={"hover:bg-gray-50 " + (drilldownState.terceroId ? "cursor-pointer" : "")}
                                                onClick={() => drilldownState.terceroId && handleDrilldownConcepto(d)}
                                            >
                                                <td className="py-3 px-6 text-sm font-medium text-gray-700">{d.nombre}</td>
                                                <td className="py-3 px-6 text-sm text-right font-mono">
                                                    <CurrencyDisplay value={d.ingresos} showCurrency={false} />
                                                </td>
                                                <td className="py-3 px-6 text-sm text-right font-mono">
                                                    <CurrencyDisplay value={-d.egresos} showCurrency={false} />
                                                </td>
                                                <td className="py-3 px-6 text-sm text-right font-mono font-bold">
                                                    <CurrencyDisplay value={d.saldo} showCurrency={false} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setDrilldownState(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Second Level Drilldown Modal (Conceptos) */}
            {drilldownConceptoState.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{drilldownConceptoState.title}</h3>
                                <p className="text-sm text-gray-500">Desglose por conceptos</p>
                            </div>
                            <button
                                onClick={() => setDrilldownConceptoState(prev => ({ ...prev, isOpen: false }))}
                                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-0 overflow-y-auto flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 sticky top-0">
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalConceptoSort('nombre')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Concepto
                                                {drilldownConceptoState.sortField === 'nombre' ? (
                                                    drilldownConceptoState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalConceptoSort('ingresos')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Ingresos
                                                {drilldownConceptoState.sortField === 'ingresos' ? (
                                                    drilldownConceptoState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalConceptoSort('egresos')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Egresos
                                                {drilldownConceptoState.sortField === 'egresos' ? (
                                                    drilldownConceptoState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                        <th
                                            className="py-3 px-6 text-xs font-bold text-gray-500 uppercase text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                            onClick={() => handleModalConceptoSort('saldo')}
                                        >
                                            <div className="flex items-center justify-end gap-1">
                                                Saldo
                                                {drilldownConceptoState.sortField === 'saldo' ? (
                                                    drilldownConceptoState.sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                                ) : (
                                                    <ArrowUpDown size={12} className="opacity-30" />
                                                )}
                                            </div>
                                        </th>
                                    </tr>
                                    {/* Fila de Totales */}
                                    <tr className="bg-gray-100 sticky top-[40px] z-10 font-bold border-b border-gray-200 shadow-sm">
                                        <td className="py-3 px-6 text-sm text-gray-700">TOTALES</td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={totalesDrilldownConcepto.ingresos} showCurrency={false} className="font-bold" />
                                        </td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={-totalesDrilldownConcepto.egresos} showCurrency={false} className="font-bold" />
                                        </td>
                                        <td className="py-3 px-6 text-sm text-right font-mono">
                                            <CurrencyDisplay value={totalesDrilldownConcepto.saldo} showCurrency={false} className="font-bold" />
                                        </td>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {drilldownConceptoState.loading ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-500">Cargando conceptos...</td></tr>
                                    ) : drilldownConceptoSorted.length === 0 ? (
                                        <tr><td colSpan={4} className="py-12 text-center text-gray-500">No hay conceptos en este grupo</td></tr>
                                    ) : (
                                        drilldownConceptoSorted.map((d, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="py-3 px-6 text-sm font-medium text-gray-700">{d.nombre}</td>
                                                <td className="py-3 px-6 text-sm text-right font-mono">
                                                    <CurrencyDisplay value={d.ingresos} showCurrency={false} />
                                                </td>
                                                <td className="py-3 px-6 text-sm text-right font-mono">
                                                    <CurrencyDisplay value={-d.egresos} showCurrency={false} />
                                                </td>
                                                <td className="py-3 px-6 text-sm text-right font-mono font-bold">
                                                    <CurrencyDisplay value={d.saldo} showCurrency={false} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setDrilldownConceptoState(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
