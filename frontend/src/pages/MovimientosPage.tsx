import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import type { Movimiento } from '../types'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import { FiltrosReporte } from '../components/FiltrosReporte'
import { EstadisticasTotales } from '../components/EstadisticasTotales'

export const MovimientosPage = () => {
    const navigate = useNavigate()

    // Filtros
    // Filtros persistentes con useSessionStorage
    const [desde, setDesde] = useSessionStorage('filtro_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('filtro_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('filtro_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('filtro_terceroId', '')
    const [grupoId, setGrupoId] = useSessionStorage('filtro_grupoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('filtro_conceptoId', '')
    const [soloPendientes, setSoloPendientes] = useSessionStorage('filtro_soloPendientes', false)
    const [mostrarIngresos, setMostrarIngresos] = useSessionStorage('filtro_mostrarIngresos', true)

    const [mostrarEgresos, setMostrarEgresos] = useSessionStorage('filtro_mostrarEgresos', true)

    // Dynamic Exclusion Logic
    const [configuracionExclusion, setConfiguracionExclusion] = useState<Array<{ grupo_id: number; etiqueta: string; activo_por_defecto: boolean }>>([])
    // We use null initial value to detect if we need to set defaults from config
    const [gruposExcluidos, setGruposExcluidos] = useSessionStorage<number[] | null>('filtro_gruposExcluidos', null)

    // Grupos excluidos finales para la API
    const actualGruposExcluidos = useMemo(() => {
        return gruposExcluidos || []
    }, [gruposExcluidos])


    // Datos Maestros desde Hook centralizado
    const { cuentas, terceros, grupos, conceptos } = useCatalogo()

    // Paginación ELIMINADA - mostrar todos los registros
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(true)
    const [sortConfig, setSortConfig] = useState<{ key: keyof Movimiento | 'clasificacion', direction: 'asc' | 'desc' } | null>(null)
    const [totalesGlobales, setTotalesGlobales] = useState<{ ingresos: number; egresos: number; saldo: number } | null>(null)

    const handleSort = (key: keyof Movimiento | 'clasificacion') => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedMovimientos = useMemo(() => {
        let sortableItems = [...movimientos]
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any
                let bValue: any

                if (sortConfig.key === 'clasificacion') {
                    aValue = (a.grupo_display || '') + (a.concepto_display || '')
                    bValue = (b.grupo_display || '') + (b.concepto_display || '')
                } else {
                    aValue = a[sortConfig.key]
                    bValue = b[sortConfig.key]
                }

                if (aValue === undefined || aValue === null) return 1
                if (bValue === undefined || bValue === null) return -1

                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1
                }
                return 0
            })
        }
        return sortableItems
    }, [movimientos, sortConfig])

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
        const parsedGrupoId = grupoId && grupoId !== '' ? parseInt(grupoId) : undefined
        const parsedConceptoId = conceptoId && conceptoId !== '' ? parseInt(conceptoId) : undefined

        const filterParams = {
            desde: f_desde || desde,
            hasta: f_hasta || hasta,
            cuenta_id: parsedCuentaId,
            tercero_id: parsedTerceroId,
            grupo_id: parsedGrupoId,
            concepto_id: parsedConceptoId,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined,
            solo_pendientes: soloPendientes || undefined,
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

    }, [desde, hasta, cuentaId, terceroId, grupoId, conceptoId, soloPendientes, mostrarIngresos, mostrarEgresos, actualGruposExcluidos])


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
                if (gruposExcluidos === null) {
                    // Set all filters with activo_por_defecto=true as excluded
                    const defaults = data.filter((d: any) => d.activo_por_defecto).map((d: any) => d.grupo_id)
                    setGruposExcluidos(defaults)
                }
            })
            .catch(err => console.error("Error fetching filter config", err))
    }, [])

    // Note: Reload when gruposExcluidos changes is handled by main useEffect via actualGruposExcluidos



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
        setSoloPendientes(false)
        setMostrarIngresos(true)
        setMostrarEgresos(true)
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión de Movimientos</h1>
                    <p className="text-gray-500 text-sm mt-1">Visualización y clasificación de transacciones</p>
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
                grupoId={grupoId}
                onGrupoChange={(val) => {
                    setGrupoId(val)
                    setConceptoId('')
                }}
                conceptoId={conceptoId}
                onConceptoChange={setConceptoId}
                terceros={terceros}
                grupos={grupos}
                conceptos={conceptos}
                showClasificacionFilters={true}
                soloPendientes={soloPendientes}
                onSoloPendientesChange={setSoloPendientes}
                showSoloPendientes={true}
                mostrarIngresos={mostrarIngresos}
                onMostrarIngresosChange={setMostrarIngresos}
                mostrarEgresos={mostrarEgresos}
                onMostrarEgresosChange={setMostrarEgresos}
                showIngresosEgresos={true}
                configuracionExclusion={configuracionExclusion}
                gruposExcluidos={actualGruposExcluidos}
                onGruposExcluidosChange={setGruposExcluidos}
                onLimpiar={handleLimpiar}
            />

            {/* Estadísticas Totales */}
            <EstadisticasTotales
                ingresos={totales.ingresos}
                egresos={totales.egresos}
                saldo={totales.saldo}
            />

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/50">
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-12 text-center cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('id')}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        ID
                                        {sortConfig?.key === 'id' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('fecha')}
                                >
                                    <div className="flex items-center gap-1">
                                        Fecha
                                        {sortConfig?.key === 'fecha' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('cuenta_display')}
                                >
                                    <div className="flex items-center gap-1">
                                        Cuenta
                                        {sortConfig?.key === 'cuenta_display' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('tercero_display')}
                                >
                                    <div className="flex items-center gap-1">
                                        Tercero
                                        {sortConfig?.key === 'tercero_display' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('clasificacion')}
                                >
                                    <div className="flex items-center gap-1">
                                        Clasificación
                                        {sortConfig?.key === 'clasificacion' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('valor')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Valor
                                        {sortConfig?.key === 'valor' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('usd')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Valor USD
                                        {sortConfig?.key === 'usd' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('trm')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        TRM
                                        {sortConfig?.key === 'trm' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('moneda_display')}
                                >
                                    <div className="flex items-center gap-1">
                                        Moneda
                                        {sortConfig?.key === 'moneda_display' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('detalle')}
                                >
                                    <div className="flex items-center gap-1">
                                        Detalle
                                        {sortConfig?.key === 'detalle' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('referencia')}
                                >
                                    <div className="flex items-center gap-1">
                                        Referencia
                                        {sortConfig?.key === 'referencia' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:bg-gray-100 hover:text-blue-600 transition-colors"
                                    onClick={() => handleSort('descripcion')}
                                >
                                    <div className="flex items-center gap-1">
                                        Descripción
                                        {sortConfig?.key === 'descripcion' ? (
                                            sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                                        ) : <ArrowUpDown size={12} className="text-gray-300" />}
                                    </div>
                                </th>
                                <th className="py-3 px-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center w-12">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={13} className="py-20 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                                        <p className="mt-2 text-sm text-gray-500 font-medium">Cargando transacciones...</p>
                                    </td>
                                </tr>
                            ) : movimientos.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="py-20 text-center text-gray-500">
                                        <div className="bg-gray-50 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                            <Search size={24} className="text-gray-300" />
                                        </div>
                                        <p className="font-medium">No se encontraron movimientos.</p>
                                        <p className="text-xs mt-1">Intenta ajustar los filtros de búsqueda.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedMovimientos.map((mov) => (
                                    <tr key={mov.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="py-2 px-2 text-xs text-gray-400 font-mono text-center">#{mov.id}</td>
                                        <td className="py-2 px-2 text-sm text-gray-700 whitespace-nowrap">
                                            {mov.fecha}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                                {mov.cuenta_display}
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600 overflow-hidden">
                                            <div className="max-w-[160px] truncate">
                                                {mov.tercero_display || <span className="text-gray-300 italic">No asignado</span>}
                                            </div>
                                        </td>
                                        <td className="py-2 px-2">
                                            {mov.grupo_display ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[11px] font-bold text-slate-700">{mov.grupo_display}</span>
                                                    <span className="text-[10px] text-slate-400 italic font-medium">{mov.concepto_display}</span>
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 italic">
                                                    Sin clasificar
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 px-2 text-xs font-bold text-right font-mono">
                                            <span className={mov.valor < 0 ? 'text-rose-500' : 'text-emerald-500'}>
                                                {mov.valor < 0 ? '-' : ''}${Math.abs(mov.valor).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 text-xs text-right font-mono text-gray-600 w-20">
                                            {mov.usd ? `$${Math.abs(mov.usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-right font-mono text-gray-600">
                                            {mov.trm ? mov.trm.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600">
                                            {mov.moneda_display}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600 max-w-[100px] truncate" title={mov.detalle || ''}>
                                            {mov.detalle || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600 max-w-[80px] truncate" title={mov.referencia || ''}>
                                            {mov.referencia || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-xs text-gray-600 max-w-[100px] truncate" title={mov.descripcion || ''}>
                                            {mov.descripcion || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            <button
                                                onClick={() => navigate(`/movimientos/editar/${mov.id}`)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-blue-100 transition-all shadow-sm group-hover:bg-white"
                                                title="Editar Movimiento"
                                            >
                                                ✏️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Indicador de registros */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-sm text-gray-600 flex justify-between items-center">
                    <span>
                        Mostrando <strong>{sortedMovimientos.length}</strong> registro{sortedMovimientos.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    )
}

