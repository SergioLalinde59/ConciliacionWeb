import { useState, useEffect, useMemo } from 'react'
import { BarChart2, X } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

import { FiltrosReporte } from '../components/FiltrosReporte' // Import FiltrosReporte
import { EstadisticasTotales } from '../components/EstadisticasTotales'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { useSessionStorage } from '../hooks/useSessionStorage'
import {
    formatDateISO,
    getAnioYTD
} from '../utils/dateUtils' // Use shared utils
import type { ConfigFiltroExclusion } from '../types/filters'
import { useReporteIngresosGastosMes, useConfiguracionExclusion } from '../hooks/useReportes'


interface ItemReporteMes {
    mes: string
    ingresos: number
    egresos: number
    saldo: number
}

interface ItemDesglose {
    id: number
    nombre: string
    ingresos: number
    egresos: number
    saldo: number
}

interface DrilldownLevel {
    level: 'tercero' | 'grupo' | 'concepto'
    title: string
    mes?: string
    terceroId?: number
    grupoId?: number
    data: ItemDesglose[]
    isOpen: boolean
    sortField: 'nombre' | 'ingresos' | 'egresos' | 'saldo'
    sortAsc: boolean
}

export const ReporteIngresosGastosMesPage = () => {
    // Filtros
    const [desde, setDesde] = useSessionStorage('rep_mes_filtro_desde', getAnioYTD().inicio)
    const [hasta, setHasta] = useSessionStorage('rep_mes_filtro_hasta', getAnioYTD().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('rep_mes_filtro_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('rep_mes_filtro_terceroId', '')
    const [grupoId, setGrupoId] = useSessionStorage('rep_mes_filtro_grupoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('rep_mes_filtro_conceptoId', '')

    // Dynamic Exclusion
    // Dynamic Exclusion
    const { data: configuracionExclusion = [] } = useConfiguracionExclusion()
    const [gruposExcluidos, setGruposExcluidos] = useSessionStorage<number[] | null>('rep_mes_filtro_gruposExcluidos', null)

    const actualGruposExcluidos = gruposExcluidos || []

    // Datos Maestros
    const { cuentas, terceros, grupos, conceptos } = useCatalogo()

    // Params for Hook
    const paramsReporte = useMemo(() => ({
        fecha_inicio: desde,
        fecha_fin: hasta,
        cuenta_id: cuentaId ? Number(cuentaId) : undefined,
        tercero_id: terceroId ? Number(terceroId) : undefined,
        grupo_id: grupoId ? Number(grupoId) : undefined,
        concepto_id: conceptoId ? Number(conceptoId) : undefined,
        grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
    }), [desde, hasta, cuentaId, terceroId, grupoId, conceptoId, actualGruposExcluidos])

    const { data: datosRaw, isLoading: loading } = useReporteIngresosGastosMes(paramsReporte)

    // Filtrar datos por rango de fechas (Client-side fix)
    const datos = useMemo(() => {
        if (!datosRaw) return []
        const dataTyped = datosRaw as ItemReporteMes[]

        return dataTyped.filter(d => {
            // Asumimos d.mes viene como YYYY-MM
            // desde/hasta vienen como YYYY-MM-DD
            const mesItem = d.mes
            const mesDesde = desde.substring(0, 7)
            const mesHasta = hasta.substring(0, 7)

            return mesItem >= mesDesde && mesItem <= mesHasta
        })
    }, [datosRaw, desde, hasta])

    // Drilldown Modals
    const [terceroModal, setTerceroModal] = useState<DrilldownLevel>({
        level: 'tercero',
        title: '',
        data: [],
        isOpen: false,
        sortField: 'egresos',
        sortAsc: false
    })

    const [grupoModal, setGrupoModal] = useState<DrilldownLevel>({
        level: 'grupo',
        title: '',
        data: [],
        isOpen: false,
        sortField: 'egresos',
        sortAsc: false
    })

    const [conceptoModal, setConceptoModal] = useState<DrilldownLevel>({
        level: 'concepto',
        title: '',
        data: [],
        isOpen: false,
        sortField: 'egresos',
        sortAsc: false
    })


    // Load Exclusion Config Defaults
    useEffect(() => {
        if (configuracionExclusion.length > 0 && gruposExcluidos === null) {
            const defaults = (configuracionExclusion as ConfigFiltroExclusion[]).filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        }
    }, [configuracionExclusion, gruposExcluidos])

    const handleLimpiar = () => {
        const rangoYTD = getAnioYTD()
        setDesde(rangoYTD.inicio)
        setHasta(rangoYTD.fin)
        setCuentaId('')
        setTerceroId('')
        setGrupoId('')
        setConceptoId('')
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        } else {
            setGruposExcluidos([])
        }
    }

    // setRango removed as it is handled by FiltrosReporte internally or via proper change handlers


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

    // Helper para obtener rango de fechas de un mes
    const getMesRange = (mes: string) => {
        // mes viene en formato "YYYY-MM" o "MMM YYYY"
        let year: number, month: number

        if (mes.includes('-')) {
            // Formato "YYYY-MM"
            const [y, m] = mes.split('-')
            year = parseInt(y)
            month = parseInt(m) - 1
        } else {
            // Formato "MMM YYYY" (e.g., "Ene 2024")
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
            const parts = mes.split(' ')
            const monthStr = parts[0]
            year = parseInt(parts[1])
            month = monthNames.indexOf(monthStr)
        }

        const inicio = new Date(year, month, 1)
        const fin = new Date(year, month + 1, 0)
        return { inicio: formatDateISO(inicio), fin: formatDateISO(fin) }
    }

    // Drilldown Level 1: Click en mes -> Ver terceros
    const handleMesClick = async (itemMes: ItemReporteMes) => {
        const rangoMes = getMesRange(itemMes.mes)

        setTerceroModal({
            level: 'tercero',
            title: `Terceros - ${itemMes.mes}`,
            mes: itemMes.mes,
            data: [],
            isOpen: true,
            sortField: 'egresos',
            sortAsc: false
        })

        try {
            const data = await apiService.movimientos.reporteDesgloseGastos({
                nivel: 'tercero',
                fecha_inicio: rangoMes.inicio,
                fecha_fin: rangoMes.fin,
                cuenta_id: cuentaId ? Number(cuentaId) : undefined,
                tercero_id: terceroId ? Number(terceroId) : undefined,
                grupo_id: grupoId ? Number(grupoId) : undefined,
                concepto_id: conceptoId ? Number(conceptoId) : undefined,
                grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
            } as any)
            setTerceroModal(prev => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        } catch (err) {
            console.error('Error cargando terceros:', err)
            setTerceroModal(prev => ({ ...prev, data: [] }))
        }
    }

    // Drilldown Level 2: Click en tercero -> Ver grupos
    const handleTerceroClick = async (item: ItemDesglose) => {
        if (!terceroModal.mes) return
        const rangoMes = getMesRange(terceroModal.mes)

        setGrupoModal({
            level: 'grupo',
            title: `Grupos - ${item.nombre} (${terceroModal.mes})`,
            mes: terceroModal.mes,
            terceroId: item.id,
            data: [],
            isOpen: true,
            sortField: 'egresos',
            sortAsc: false
        })

        try {
            const data = await apiService.movimientos.reporteDesgloseGastos({
                nivel: 'grupo',
                fecha_inicio: rangoMes.inicio,
                fecha_fin: rangoMes.fin,
                cuenta_id: cuentaId ? Number(cuentaId) : undefined,
                tercero_id: item.id,
                concepto_id: conceptoId ? Number(conceptoId) : undefined,
                grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
            } as any)
            setGrupoModal(prev => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        } catch (err) {
            console.error('Error cargando grupos:', err)
            setGrupoModal(prev => ({ ...prev, data: [] }))
        }
    }

    // Drilldown Level 3: Click en grupo -> Ver conceptos
    const handleGrupoClick = async (item: ItemDesglose) => {
        if (!grupoModal.mes || !grupoModal.terceroId) return
        const rangoMes = getMesRange(grupoModal.mes)

        setConceptoModal({
            level: 'concepto',
            title: `Conceptos - ${item.nombre} (${grupoModal.mes})`,
            mes: grupoModal.mes,
            terceroId: grupoModal.terceroId,
            grupoId: item.id,
            data: [],
            isOpen: true,
            sortField: 'egresos',
            sortAsc: false
        })

        try {
            const data = await apiService.movimientos.reporteDesgloseGastos({
                nivel: 'concepto',
                fecha_inicio: rangoMes.inicio,
                fecha_fin: rangoMes.fin,
                cuenta_id: cuentaId ? Number(cuentaId) : undefined,
                tercero_id: grupoModal.terceroId,
                grupo_id: item.id,
                concepto_id: conceptoId ? Number(conceptoId) : undefined,
                grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
            } as any)
            setConceptoModal(prev => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        } catch (err) {
            console.error('Error cargando conceptos:', err)
            setConceptoModal(prev => ({ ...prev, data: [] }))
        }
    }

    // Sorting helper
    const sortData = (data: ItemDesglose[], field: 'nombre' | 'ingresos' | 'egresos' | 'saldo', asc: boolean) => {
        return [...data].sort((a, b) => {
            if (field === 'nombre') {
                return asc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)
            }
            const valueA = a[field]
            const valueB = b[field]
            return asc ? valueA - valueB : valueB - valueA
        })
    }

    // Modal Component
    const Modal = ({
        modalState,
        setModalState,
        onRowClick
    }: {
        modalState: DrilldownLevel,
        setModalState: React.Dispatch<React.SetStateAction<DrilldownLevel>>,
        onRowClick?: (item: ItemDesglose) => void
    }) => {
        if (!modalState.isOpen) return null

        const handleSort = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
            if (field === modalState.sortField) {
                setModalState(prev => ({ ...prev, sortAsc: !prev.sortAsc }))
            } else {
                setModalState(prev => ({
                    ...prev,
                    sortField: field,
                    sortAsc: field === 'nombre'
                }))
            }
        }

        const sortedData = sortData(modalState.data, modalState.sortField, modalState.sortAsc)
        const totalesModal = {
            ingresos: modalState.data.reduce((acc, curr) => acc + curr.ingresos, 0),
            egresos: modalState.data.reduce((acc, curr) => acc + curr.egresos, 0),
            saldo: modalState.data.reduce((acc, curr) => acc + curr.saldo, 0)
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">{modalState.title}</h3>

                        </div>
                        <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-gray-200 rounded-full">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 p-0">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 sticky top-0 z-20 text-xs font-bold text-gray-500 uppercase">
                                <tr className="bg-gray-50">
                                    <th
                                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('nombre')}
                                    >
                                        <div className="flex items-center gap-1">
                                            Nombre
                                            {modalState.sortField === 'nombre' && (
                                                <span className="text-blue-600">{modalState.sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('ingresos')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Ingresos
                                            {modalState.sortField === 'ingresos' && (
                                                <span className="text-blue-600">{modalState.sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('egresos')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Egresos
                                            {modalState.sortField === 'egresos' && (
                                                <span className="text-blue-600">{modalState.sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                    <th
                                        className="py-3 px-4 text-right cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                        onClick={() => handleSort('saldo')}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Saldo
                                            {modalState.sortField === 'saldo' && (
                                                <span className="text-blue-600">{modalState.sortAsc ? '↑' : '↓'}</span>
                                            )}
                                        </div>
                                    </th>
                                </tr>
                                {/* Fila de Totales */}
                                <tr className="bg-gray-100 sticky top-[40px] z-10 font-bold border-b border-gray-200 shadow-sm">
                                    <td className="py-3 px-4 text-sm text-gray-700">TOTALES</td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={totalesModal.ingresos} showCurrency={false} className="font-bold" />
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={-totalesModal.egresos} showCurrency={false} className="font-bold" />
                                    </td>
                                    <td className="py-3 px-4 text-sm text-right font-mono">
                                        <CurrencyDisplay value={totalesModal.saldo} showCurrency={false} className="font-bold" />
                                    </td>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => onRowClick && onRowClick(item)}
                                        className={`hover:bg-blue-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-700">{item.nombre}</td>
                                        <td className="py-3 px-4 text-sm text-right font-mono">
                                            <CurrencyDisplay value={item.ingresos} showCurrency={false} />
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right font-mono">
                                            <CurrencyDisplay value={-item.egresos} showCurrency={false} />
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right font-mono font-bold">
                                            <CurrencyDisplay value={item.saldo} showCurrency={false} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Ingresos y Gastos por Mes</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Evolución mensual de tus finanzas
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
                showIngresosEgresos={false}
                configuracionExclusion={configuracionExclusion}
                gruposExcluidos={actualGruposExcluidos}
                onGruposExcluidosChange={setGruposExcluidos}
                onLimpiar={handleLimpiar}
            />


            {/* Totales Cards */}
            <div className="mb-6">
                <EstadisticasTotales
                    ingresos={totales.ingresos}
                    egresos={totales.egresos}
                    saldo={totales.saldo}
                />
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Gráfica Ingresos */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
                    <h3 className="text-lg font-bold text-emerald-800 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-emerald-500" />
                        Evolución Ingresos
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={datos}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="mes" fontSize={12} />
                                <YAxis fontSize={11} tickFormatter={(val: number) => `$${(val / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica Egresos */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px]">
                    <h3 className="text-lg font-bold text-rose-800 mb-6 flex items-center gap-2">
                        <BarChart2 size={20} className="text-rose-500" />
                        Evolución Egresos
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={datos}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="mes" fontSize={12} />
                                <YAxis fontSize={11} tickFormatter={(val: number) => `$${(val / 1000000).toFixed(1)}M`} />
                                <Tooltip
                                    formatter={(value: any) => `$${Number(value).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tabla Detallada */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Detalle Mensual</h3>
                    <span className="text-xs text-gray-400">(Click en fila para ver detalle)</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 sticky top-0 z-10">
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Mes</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Ingresos</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Egresos</th>
                                <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Saldo</th>
                            </tr>
                            {/* Fila de Totales */}
                            <tr className="bg-gray-100 sticky top-[40px] z-10 font-bold border-b-2 border-gray-300 shadow-sm">
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
                            ) : datos.length === 0 ? (
                                <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-500">No hay datos para mostrar</td></tr>
                            ) : (
                                datos.map((d, i) => (
                                    <tr
                                        key={i}
                                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                                        onClick={() => handleMesClick(d)}
                                    >
                                        <td className="py-3 px-4 text-sm font-medium text-gray-700">{d.mes}</td>
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

            {/* Drilldown Modals */}
            <Modal modalState={terceroModal} setModalState={setTerceroModal} onRowClick={handleTerceroClick} />
            <Modal modalState={grupoModal} setModalState={setGrupoModal} onRowClick={handleGrupoClick} />
            <Modal modalState={conceptoModal} setModalState={setConceptoModal} />
        </div>
    )
}
