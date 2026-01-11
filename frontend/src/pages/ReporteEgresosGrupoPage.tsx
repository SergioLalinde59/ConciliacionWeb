import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { apiService } from '../services/api'
import { useCatalogo } from '../hooks/useCatalogo'
import { useReporteDesgloseGastos, useConfiguracionExclusion } from '../hooks/useReportes'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import { FiltrosReporte } from '../components/FiltrosReporte'
import { EstadisticasTotales } from '../components/EstadisticasTotales'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import type { ConfigFiltroExclusion } from '../types/filters'

interface ItemDesglose {
    id: number
    nombre: string
    ingresos: number
    egresos: number
    saldo: number
}

interface DrilldownLevel {
    level: 'grupo' | 'tercero' | 'concepto'
    title: string
    parentId?: number
    grandParentId?: number
    data: ItemDesglose[]
    isOpen: boolean
    sortAsc: boolean
    sortField: 'nombre' | 'ingresos' | 'egresos' | 'saldo'
}

export const ReporteEgresosGrupoPage = () => {
    // Filtros
    const [desde, setDesde] = useSessionStorage('rep_egresos_grupo_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('rep_egresos_grupo_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('rep_egresos_grupo_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('rep_egresos_grupo_terceroId', '')
    const [grupoId, setGrupoId] = useSessionStorage('rep_egresos_grupo_grupoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('rep_egresos_grupo_conceptoId', '')
    const [mostrarIngresos, setMostrarIngresos] = useSessionStorage('rep_egresos_grupo_ingresos', false)
    const [mostrarEgresos, setMostrarEgresos] = useSessionStorage('rep_egresos_grupo_egresos', true)

    // Dynamic Exclusion
    const [gruposExcluidos, setGruposExcluidos] = useSessionStorage<number[] | null>('rep_egresos_grupo_gruposExcluidos', null)
    const actualGruposExcluidos = gruposExcluidos || []

    // State for Sorting and Modals (re-added correctly)
    const [sortAscGrupo, setSortAscGrupo] = useState(false)
    const [sortFieldGrupo, setSortFieldGrupo] = useState<'nombre' | 'ingresos' | 'egresos' | 'saldo'>('egresos')

    const [terceroModal, setTerceroModal] = useState<DrilldownLevel>({
        level: 'tercero',
        title: '',
        data: [],
        isOpen: false,
        sortAsc: false,
        sortField: 'egresos'
    })

    const [conceptoModal, setConceptoModal] = useState<DrilldownLevel>({
        level: 'concepto',
        title: '',
        data: [],
        isOpen: false,
        sortAsc: false,
        sortField: 'egresos'
    })

    // Params for Hook
    const paramsReporte = {
        nivel: 'grupo',
        fecha_inicio: desde,
        fecha_fin: hasta,
        cuenta_id: cuentaId ? Number(cuentaId) : undefined,
        tercero_id: terceroId ? Number(terceroId) : undefined,
        grupo_id: grupoId ? Number(grupoId) : undefined,
        concepto_id: conceptoId ? Number(conceptoId) : undefined,
        grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
    }

    const { data: gruposDataRaw, isLoading: loading } = useReporteDesgloseGastos(paramsReporte)
    const gruposData = (gruposDataRaw as ItemDesglose[]) || []

    // Load Catalogs
    const { cuentas, terceros, grupos, conceptos } = useCatalogo()

    // Load Exclusion Config
    const { data: configuracionExclusion = [] } = useConfiguracionExclusion()

    // Set defaults when config loads
    useEffect(() => {
        if (configuracionExclusion.length > 0 && gruposExcluidos === null) {
            const defaults = (configuracionExclusion as ConfigFiltroExclusion[]).filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        }
    }, [configuracionExclusion, gruposExcluidos, setGruposExcluidos])

    const handleGrupoClick = (item: ItemDesglose) => {
        setTerceroModal({
            level: 'tercero',
            title: `Terceros para: ${item.nombre}`,
            parentId: item.id,
            data: [],
            isOpen: true,
            sortAsc: false,
            sortField: 'egresos'
        })

        apiService.movimientos.reporteDesgloseGastos({
            nivel: 'tercero',
            fecha_inicio: desde,
            fecha_fin: hasta,
            cuenta_id: cuentaId ? Number(cuentaId) : undefined,
            tercero_id: undefined,
            grupo_id: item.id,
            concepto_id: conceptoId ? Number(conceptoId) : undefined,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
        } as any).then(data => {
            setTerceroModal(prev => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        })
    }

    const handleTerceroClick = (item: ItemDesglose) => {
        setConceptoModal({
            level: 'concepto',
            title: `Conceptos para: ${item.nombre}`,
            parentId: item.id,
            grandParentId: terceroModal.parentId,
            data: [],
            isOpen: true,
            sortAsc: false,
            sortField: 'egresos'
        })

        apiService.movimientos.reporteDesgloseGastos({
            nivel: 'concepto',
            fecha_inicio: desde,
            fecha_fin: hasta,
            cuenta_id: cuentaId ? Number(cuentaId) : undefined,
            tercero_id: item.id,
            grupo_id: terceroModal.parentId,
            concepto_id: conceptoId ? Number(conceptoId) : undefined,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined
        } as any).then(data => {
            setConceptoModal(prev => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        })
    }

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

    const handleSortGrupo = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
        if (field === sortFieldGrupo) {
            setSortAscGrupo(!sortAscGrupo)
        } else {
            setSortFieldGrupo(field)
            setSortAscGrupo(field === 'nombre')
        }
    }

    const handleLimpiar = () => {
        const mesActual = getMesActual()
        setDesde(mesActual.inicio)
        setHasta(mesActual.fin)
        setCuentaId('')
        setTerceroId('')
        setGrupoId('')
        setConceptoId('')
        setMostrarIngresos(false)
        setMostrarEgresos(true)
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        } else {
            setGruposExcluidos([])
        }
    }


    const totales = {
        ingresos: gruposData.reduce((acc, curr) => acc + curr.ingresos, 0),
        egresos: gruposData.reduce((acc, curr) => acc + curr.egresos, 0),
        saldo: gruposData.reduce((acc, curr) => acc + curr.saldo, 0)
    }

    const Modal = ({ modalState, setModalState, onRowClick }: {
        modalState: DrilldownLevel,
        setModalState: React.Dispatch<React.SetStateAction<DrilldownLevel>>,
        onRowClick?: (item: ItemDesglose) => void
    }) => {
        if (!modalState.isOpen) return null

        const handleSort = (field: 'nombre' | 'ingresos' | 'egresos' | 'saldo') => {
            if (field === modalState.sortField) {
                setModalState(prev => ({ ...prev, sortAsc: !prev.sortAsc }))
            } else {
                setModalState(prev => ({ ...prev, sortField: field, sortAsc: field === 'nombre' }))
            }
        }

        const sortDataModal = (data: ItemDesglose[], field: 'nombre' | 'ingresos' | 'egresos' | 'saldo', asc: boolean) => {
            return [...data].sort((a, b) => {
                if (field === 'nombre') {
                    return asc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)
                }
                const valueA = a[field]
                const valueB = b[field]
                return asc ? valueA - valueB : valueB - valueA
            })
        }

        const sortedData = sortDataModal(modalState.data, modalState.sortField, modalState.sortAsc)
        const totalesModal = {
            ingresos: modalState.data.reduce((acc, curr) => acc + curr.ingresos, 0),
            egresos: modalState.data.reduce((acc, curr) => acc + curr.egresos, 0),
            saldo: modalState.data.reduce((acc, curr) => acc + curr.saldo, 0)
        }

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                    {/* Header with title and close button */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">{modalState.title}</h3>
                        <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 p-0">
                        <table className="w-full text-left">
                            {/* Totals Row */}
                            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                                <tr>
                                    <td className="py-3 px-4 text-xs font-bold text-gray-700 uppercase">Totales</td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Ingresos</span>
                                            <span className="text-sm font-bold text-green-600">
                                                <CurrencyDisplay value={totalesModal.ingresos} showCurrency={true} />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Egresos</span>
                                            <span className="text-sm font-bold text-red-600">
                                                <CurrencyDisplay value={-totalesModal.egresos} showCurrency={true} />
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-gray-500 uppercase font-semibold">Saldo</span>
                                            <span className="text-sm font-bold">
                                                <CurrencyDisplay value={totalesModal.saldo} showCurrency={true} />
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </thead>

                            {/* Column Headers */}
                            <thead className="bg-gray-50 sticky top-0 text-xs font-bold text-gray-500 uppercase">
                                <tr>
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
                <h1 className="text-2xl font-bold text-gray-900">Egresos por Grupo</h1>
                <p className="text-gray-500 text-sm mt-1">Drilldown interactivo de egresos</p>
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



            {/* Estadísticas Totales */}
            <EstadisticasTotales
                ingresos={totales.ingresos}
                egresos={totales.egresos}
                saldo={totales.saldo}
            />

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Egresos por Grupo</h3>
                        <p className="text-xs text-slate-500">
                            Ingresos: ${totales.ingresos.toLocaleString('es-CO')} |
                            Egresos: ${totales.egresos.toLocaleString('es-CO')} |
                            Saldo: ${totales.saldo.toLocaleString('es-CO')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {sortAscGrupo ? '↑' : '↓'} {sortFieldGrupo === 'nombre' ? 'Nombre' : sortFieldGrupo === 'ingresos' ? 'Ingresos' : sortFieldGrupo === 'egresos' ? 'Egresos' : 'Saldo'}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th
                                    className="py-3 px-6 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                    onClick={() => handleSortGrupo('nombre')}
                                >
                                    <div className="flex items-center gap-1">
                                        Grupo
                                        {sortFieldGrupo === 'nombre' && (
                                            <span className="text-blue-600">{sortAscGrupo ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-6 text-right cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                    onClick={() => handleSortGrupo('ingresos')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Ingresos
                                        {sortFieldGrupo === 'ingresos' && (
                                            <span className="text-blue-600">{sortAscGrupo ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-6 text-right cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                    onClick={() => handleSortGrupo('egresos')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Egresos
                                        {sortFieldGrupo === 'egresos' && (
                                            <span className="text-blue-600">{sortAscGrupo ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="py-3 px-6 text-right cursor-pointer hover:bg-gray-50 transition-colors select-none"
                                    onClick={() => handleSortGrupo('saldo')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Saldo
                                        {sortFieldGrupo === 'saldo' && (
                                            <span className="text-blue-600">{sortAscGrupo ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                                <th className="py-3 px-6 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">Cargando...</td></tr>
                            ) : sortData(gruposData, sortFieldGrupo, sortAscGrupo).map((item, i) => (
                                <tr key={i} className="hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => handleGrupoClick(item)}>
                                    <td className="py-3 px-6 text-sm font-medium text-gray-700">{item.nombre}</td>
                                    <td className="py-3 px-6 text-sm text-right font-mono">
                                        <CurrencyDisplay value={item.ingresos} showCurrency={false} />
                                    </td>
                                    <td className="py-3 px-6 text-sm text-right font-mono">
                                        <CurrencyDisplay value={-item.egresos} showCurrency={false} />
                                    </td>
                                    <td className="py-3 px-6 text-sm text-right font-mono font-bold">
                                        <CurrencyDisplay value={item.saldo} showCurrency={false} />
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        <ChevronRight size={16} className="mx-auto text-gray-300 group-hover:text-blue-500" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <Modal modalState={terceroModal} setModalState={setTerceroModal} onRowClick={handleTerceroClick} />
            <Modal modalState={conceptoModal} setModalState={setConceptoModal} />
        </div>
    )
}
