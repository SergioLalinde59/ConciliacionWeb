import { useState, useEffect, useMemo } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { apiService } from '../services/api'
import { useReporteDesgloseGastos, useConfiguracionExclusion } from '../hooks/useReportes'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import { FiltrosReporte } from '../components/organisms/FiltrosReporte'
import { EstadisticasTotales } from '../components/organisms/EstadisticasTotales'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import { DataTable, type Column } from '../components/molecules/DataTable'
import type { ConfigFiltroExclusion } from '../types/filters'

interface ItemDesglose {
    id: number
    nombre: string
    ingresos: number
    egresos: number
    saldo: number
}

interface DrilldownLevel {
    level: 'centro_costo' | 'tercero' | 'concepto'
    title: string
    parentId?: number
    grandParentId?: number
    data: ItemDesglose[]
    isOpen: boolean
    sortAsc: boolean
    sortField: 'nombre' | 'ingresos' | 'egresos' | 'saldo'
}

type SortField = 'nombre' | 'ingresos' | 'egresos' | 'saldo'

export const ReporteEgresosCentroCostoPage = () => {
    // Filtros
    const [desde, setDesde] = useSessionStorage('rep_egresos_cc_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('rep_egresos_cc_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('rep_egresos_cc_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('rep_egresos_cc_terceroId', '')
    const [centroCostoId, setCentroCostoId] = useSessionStorage('rep_egresos_cc_centroCostoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('rep_egresos_cc_conceptoId', '')
    const [mostrarIngresos, setMostrarIngresos] = useSessionStorage('rep_egresos_cc_ingresos', false)
    const [mostrarEgresos, setMostrarEgresos] = useSessionStorage('rep_egresos_cc_egresos', true)

    // Dynamic Exclusion
    const [centrosCostosExcluidos, setCentrosCostosExcluidos] = useSessionStorage<number[] | null>('rep_egresos_cc_excluidos', null)
    const actualCentrosCostosExcluidos = centrosCostosExcluidos || []

    // State for Sorting
    const [sortAscCentroCosto, setSortAscCentroCosto] = useState(false)
    const [sortFieldCentroCosto, setSortFieldCentroCosto] = useState<SortField>('egresos')

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
        nivel: 'centro_costo',
        fecha_inicio: desde,
        fecha_fin: hasta,
        cuenta_id: cuentaId ? Number(cuentaId) : undefined,
        tercero_id: terceroId ? Number(terceroId) : undefined,
        centro_costo_id: centroCostoId ? Number(centroCostoId) : undefined,
        concepto_id: conceptoId ? Number(conceptoId) : undefined,
        centros_costos_excluidos: actualCentrosCostosExcluidos.length > 0 ? actualCentrosCostosExcluidos : undefined
    }

    const { data: gruposDataRaw, isLoading: loading } = useReporteDesgloseGastos(paramsReporte)
    const gruposData = (gruposDataRaw as ItemDesglose[]) || []

    // Load Exclusion Config
    const { data: configuracionExclusion = [] } = useConfiguracionExclusion()

    // Set defaults when config loads
    useEffect(() => {
        if (configuracionExclusion.length > 0 && centrosCostosExcluidos === null) {
            const defaults = (configuracionExclusion as ConfigFiltroExclusion[]).filter(d => d.activo_por_defecto).map(d => d.centro_costo_id)
            setCentrosCostosExcluidos(defaults)
        }
    }, [configuracionExclusion, centrosCostosExcluidos, setCentrosCostosExcluidos])

    const handleCentroCostoClick = (item: ItemDesglose) => {
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
            centro_costo_id: item.id,
            concepto_id: conceptoId ? Number(conceptoId) : undefined,
            centros_costos_excluidos: actualCentrosCostosExcluidos.length > 0 ? actualCentrosCostosExcluidos : undefined
        } as any).then(data => {
            setTerceroModal((prev: DrilldownLevel) => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
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
            centro_costo_id: terceroModal.parentId,
            concepto_id: conceptoId ? Number(conceptoId) : undefined,
            centros_costos_excluidos: actualCentrosCostosExcluidos.length > 0 ? actualCentrosCostosExcluidos : undefined
        } as any).then(data => {
            setConceptoModal((prev: DrilldownLevel) => ({ ...prev, data: (data as ItemDesglose[]) || [] }))
        })
    }

    // Generic sort function
    const sortData = (data: ItemDesglose[], field: SortField, asc: boolean) => {
        return [...data].sort((a, b) => {
            if (field === 'nombre') {
                return asc ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)
            }
            const valueA = a[field]
            const valueB = b[field]
            return asc ? valueA - valueB : valueB - valueA
        })
    }

    const sortedGruposData = useMemo(() => {
        return sortData(gruposData, sortFieldCentroCosto, sortAscCentroCosto)
    }, [gruposData, sortFieldCentroCosto, sortAscCentroCosto])

    const handleSortCentroCosto = (key: string, direction: 'asc' | 'desc' | null) => {
        if (!direction || !key) return
        setSortFieldCentroCosto(key as SortField)
        setSortAscCentroCosto(direction === 'asc')
    }

    const handleLimpiar = () => {
        const mesActual = getMesActual()
        setDesde(mesActual.inicio)
        setHasta(mesActual.fin)
        setCuentaId('')
        setTerceroId('')
        setCentroCostoId('')
        setConceptoId('')
        setMostrarIngresos(false)
        setMostrarEgresos(true)
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.centro_costo_id)
            setCentrosCostosExcluidos(defaults)
        } else {
            setCentrosCostosExcluidos([])
        }
    }


    const totales = {
        ingresos: gruposData.reduce((acc, curr) => acc + curr.ingresos, 0),
        egresos: gruposData.reduce((acc, curr) => acc + curr.egresos, 0),
        saldo: gruposData.reduce((acc, curr) => acc + curr.saldo, 0)
    }

    // Column Definitions
    const createColumns = (onRowClick?: (item: ItemDesglose) => void): Column<ItemDesglose>[] => [
        {
            key: 'nombre',
            header: 'Centro de Costo',
            sortable: true,
            accessor: (row) => (
                <span
                    className={`text-sm font-medium text-gray-700 ${onRowClick ? 'cursor-pointer' : ''}`}
                    onClick={() => onRowClick && onRowClick(row)}
                >
                    {row.nombre}
                </span>
            )
        },
        {
            key: 'ingresos',
            header: 'Ingresos',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <span className="font-mono text-sm">
                    <CurrencyDisplay value={row.ingresos} showCurrency={false} />
                </span>
            )
        },
        {
            key: 'egresos',
            header: 'Egresos',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <span className="font-mono text-sm">
                    <CurrencyDisplay value={-row.egresos} showCurrency={false} />
                </span>
            )
        },
        {
            key: 'saldo',
            header: 'Saldo',
            sortable: true,
            align: 'right',
            accessor: (row) => (
                <span className="font-mono text-sm font-bold">
                    <CurrencyDisplay value={row.saldo} showCurrency={false} />
                </span>
            )
        }
    ]

    const mainTableColumns = useMemo(() => [
        ...createColumns(handleCentroCostoClick),
        {
            key: 'actions',
            header: 'Acción',
            align: 'center' as const,
            width: 'w-20',
            accessor: (row: ItemDesglose) => (
                <button
                    onClick={() => handleCentroCostoClick(row)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors group"
                >
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                </button>
            )
        }
    ], [handleCentroCostoClick])

    const Modal = ({ modalState, setModalState, onRowClick }: {
        modalState: DrilldownLevel,
        setModalState: React.Dispatch<React.SetStateAction<DrilldownLevel>>,
        onRowClick?: (item: ItemDesglose) => void
    }) => {
        if (!modalState.isOpen) return null

        const handleSortModal = (key: string, direction: 'asc' | 'desc' | null) => {
            if (!direction || !key) return
            setModalState((prev: DrilldownLevel) => ({
                ...prev,
                sortField: key as SortField,
                sortAsc: direction === 'asc'
            }))
        }

        const sortedData = useMemo(() => {
            return sortData(modalState.data, modalState.sortField, modalState.sortAsc)
        }, [modalState.data, modalState.sortField, modalState.sortAsc])

        const totalesModal = {
            ingresos: modalState.data.reduce((acc, curr) => acc + curr.ingresos, 0),
            egresos: modalState.data.reduce((acc, curr) => acc + curr.egresos, 0),
            saldo: modalState.data.reduce((acc, curr) => acc + curr.saldo, 0)
        }

        const modalColumns = createColumns(onRowClick)

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">{modalState.title}</h3>
                        <button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 flex flex-col">
                        {/* Totals Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 grid grid-cols-4 gap-4">
                            <div className="text-xs font-bold text-gray-700 uppercase flex items-center">Totales</div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase font-semibold block">Ingresos</span>
                                <span className="text-sm font-bold text-green-600">
                                    <CurrencyDisplay value={totalesModal.ingresos} showCurrency={true} />
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase font-semibold block">Egresos</span>
                                <span className="text-sm font-bold text-red-600">
                                    <CurrencyDisplay value={-totalesModal.egresos} showCurrency={true} />
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-500 uppercase font-semibold block">Saldo</span>
                                <span className="text-sm font-bold">
                                    <CurrencyDisplay value={totalesModal.saldo} showCurrency={true} />
                                </span>
                            </div>
                        </div>

                        {/* DataTable */}
                        <div className="flex-1 overflow-hidden">
                            <DataTable
                                data={sortedData}
                                columns={modalColumns}
                                getRowKey={(row) => row.id}
                                sortKey={modalState.sortField}
                                sortDirection={modalState.sortAsc ? 'asc' : 'desc'}
                                onSort={handleSortModal}
                                stickyHeader={true}
                                showActions={false}
                                rounded={false}
                                className="h-full"
                                rowPy="py-1"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Egresos por Centro de Costo</h1>
                <p className="text-gray-500 text-sm mt-1">Drilldown interactivo de egresos</p>
            </div>

            {/* Filtros */}
            <FiltrosReporte
                desde={desde}
                hasta={hasta}
                onDesdeChange={setDesde}
                onHastaChange={setHasta}
                cuentaId={cuentaId}
                onCuentaChange={setCuentaId}
                terceroId={terceroId}
                onTerceroChange={setTerceroId}
                centroCostoId={centroCostoId}
                onCentroCostoChange={setCentroCostoId}
                conceptoId={conceptoId}
                onConceptoChange={setConceptoId}
                showClasificacionFilters={true}
                mostrarIngresos={mostrarIngresos}
                onMostrarIngresosChange={setMostrarIngresos}
                mostrarEgresos={mostrarEgresos}
                onMostrarEgresosChange={setMostrarEgresos}
                showIngresosEgresos={false}
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

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-4 py-2 border-b border-gray-50 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Egresos por Centro de Costo</h3>
                    </div>
                </div>

                <div
                    style={{
                        height: '700px',
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#fcfcfc'
                    }}
                >
                    <DataTable
                        data={sortedGruposData}
                        columns={mainTableColumns}
                        getRowKey={(row) => row.id}
                        loading={loading}
                        sortKey={sortFieldCentroCosto}
                        sortDirection={sortAscCentroCosto ? 'asc' : 'desc'}
                        onSort={handleSortCentroCosto}
                        showActions={false}
                        rounded={false}
                        stickyHeader={true}
                        rowPy="py-1"
                        className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
                        style={{ height: '100%' }}
                    />
                </div>
            </div>

            {/* Modals */}
            <Modal modalState={terceroModal} setModalState={setTerceroModal} onRowClick={handleTerceroClick} />
            <Modal modalState={conceptoModal} setModalState={setConceptoModal} />
        </div>
    )
}
