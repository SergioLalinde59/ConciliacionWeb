import React, { useState, useEffect } from 'react'
import type { Movimiento, SugerenciaClasificacion, ContextoClasificacionResponse } from '../types'
import { apiService } from '../services/api'
import { ComboBox } from '../components/molecules/ComboBox'
import { TerceroModal } from '../components/organisms/modals/TerceroModal'
import { ModalClasificarSimilares } from '../components/ModalClasificarSimilares'
import { CurrencyDisplay } from '../components/atoms/CurrencyDisplay'
import { Save, Layers, Clock, CheckCircle, ArrowRight, Search, Copy, RefreshCw } from 'lucide-react'
import { DataTable } from '../components/molecules/DataTable'
import type { Column } from '../components/molecules/DataTable'

export const ClasificarMovimientosPage: React.FC = () => {
    // --- State ---
    const [pendientes, setPendientes] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(true)
    const [movimientoActual, setMovimientoActual] = useState<Movimiento | null>(null)

    // Sugerencias y Contexto
    const [sugerenciaData, setSugerenciaData] = useState<ContextoClasificacionResponse | null>(null)
    // const [loadingContexto, setLoadingContexto] = useState(false)

    // Form State
    const [terceroId, setTerceroId] = useState<number | null>(null)
    const [centroCostoId, setCentroCostoId] = useState<number | null>(null)
    const [conceptoId, setConceptoId] = useState<number | null>(null)
    const [descripcion, setDescripcion] = useState<string>('')
    const [referencia, setReferencia] = useState<string>('')

    // Modals
    const [showTerceroModal, setShowTerceroModal] = useState(false)
    const [modalInitialValues, setModalInitialValues] = useState<{ nombre?: string }>({})

    // Batch Lote Modal
    const [showBatchModal, setShowBatchModal] = useState(false)
    const [batchPreview, setBatchPreview] = useState<Movimiento[]>([])
    const [batchPatron, setBatchPatron] = useState('')
    const [loadingBatch, setLoadingBatch] = useState(false)
    const [batchSelectedIds, setBatchSelectedIds] = useState<Set<number>>(new Set())

    // Modal Clasificar Similares
    const [showSimilaresModal, setShowSimilaresModal] = useState(false)

    // Catalogos
    const [centrosCostos, setCentrosCostos] = useState<{ id: number, nombre: string }[]>([])
    const [conceptos, setConceptos] = useState<{ id: number, nombre: string, centro_costo_id?: number }[]>([])
    const [terceros, setTerceros] = useState<{ id: number, nombre: string }[]>([])

    // --- Effects ---

    // 1. Cargar Pendientes y Catálogos
    useEffect(() => {
        cargarDatosIniciales()
    }, [])

    const cargarDatosIniciales = async () => {
        setLoading(true)
        try {
            const [pends, cats] = await Promise.all([
                apiService.movimientos.obtenerPendientes(),
                apiService.catalogos.obtenerTodos()
            ])
            setPendientes(pends)
            setCentrosCostos(cats.centros_costos)
            setConceptos(cats.conceptos)
            setTerceros(cats.terceros)
        } catch (error) {
            console.error("Error cargando datos:", error)
        } finally {
            setLoading(false)
        }
    }

    // 2. Cargar Sugerencia cuando cambia el movimiento actual
    useEffect(() => {
        if (!movimientoActual) {
            setSugerenciaData(null)
            limpiarFormulario()
            return
        }

        const cargarSugerencia = async () => {
            // setLoadingContexto(true)
            try {
                const data = await apiService.clasificacion.obtenerSugerencia(movimientoActual.id) as ContextoClasificacionResponse
                setSugerenciaData(data)
                aplicarSugerencia(data.sugerencia)
            } catch (error) {
                console.error("Error cargando sugerencia:", error)
            } finally {
                // setLoadingContexto(false)
            }
        }
        cargarSugerencia()
    }, [movimientoActual])

    // --- Helpers ---

    const limpiarFormulario = () => {
        setTerceroId(null)
        setCentroCostoId(null)
        setConceptoId(null)
        setDescripcion('')
        setReferencia('')
    }

    const aplicarSugerencia = (sug: SugerenciaClasificacion) => {
        // Always update form state, clearing previous values if suggestion is null
        setTerceroId(sug.tercero_id ?? null)
        setCentroCostoId(sug.centro_costo_id ?? null)
        setConceptoId(sug.concepto_id ?? null)
        // Keep current descripcion and referencia from movimientoActual
        if (movimientoActual) {
            setDescripcion(movimientoActual.descripcion || '')
            setReferencia(movimientoActual.referencia || '')
        }
    }

    const seleccionarMovimiento = (mov: Movimiento) => {
        setMovimientoActual(mov)
        setDescripcion(mov.descripcion || '')
        setReferencia(mov.referencia || '')
    }

    const guardarClasificacion = async () => {
        if (!movimientoActual || !terceroId || !centroCostoId || !conceptoId) {
            alert("Por favor complete Tercero, Centro de Costo y Concepto")
            return
        }

        try {
            const payload = {
                ...movimientoActual,
                tercero_id: terceroId,
                centro_costo_id: centroCostoId,
                concepto_id: conceptoId,
                descripcion: descripcion,
                referencia: referencia,
            }

            await apiService.movimientos.actualizar(movimientoActual.id, payload)

            // Éxito: Remover de pendientes
            setPendientes(prev => prev.filter(m => m.id !== movimientoActual.id))
            setMovimientoActual(null)

        } catch (error) {
            console.error("Error guardando:", error)
            alert("Error al guardar: " + error)
        }
    }

    const abrirModalLote = async () => {
        if (!movimientoActual) return
        if (!terceroId || !centroCostoId || !conceptoId) {
            alert("Por favor complete Tercero, Centro de Costo y Concepto antes de aplicar en lote")
            return
        }

        const palabras = movimientoActual.descripcion.split(' ')
        // Default pattern: First 2 words, but user can edit now
        const patronDefault = palabras.slice(0, 2).join(' ')

        setBatchPatron(patronDefault)
        setBatchSelectedIds(new Set())
        await obtenerPreviewLote(patronDefault)
        setShowBatchModal(true)
    }

    const obtenerPreviewLote = async (patron: string) => {
        setLoadingBatch(true)
        try {
            const preview = await apiService.clasificacion.previewLote(patron) as Movimiento[]
            setBatchPreview(preview)
            // Select all by default
            setBatchSelectedIds(new Set(preview.map(m => m.id)))
        } catch (error) {
            console.error("Error obteniendo preview:", error)
            alert("Error al obtener preview: " + error)
        } finally {
            setLoadingBatch(false)
        }
    }

    const handleRefreshPreview = () => {
        if (!batchPatron.trim()) return
        obtenerPreviewLote(batchPatron)
    }

    const confirmarLote = async () => {
        if (!batchPatron || !terceroId || !centroCostoId || !conceptoId) return
        if (batchSelectedIds.size === 0) return

        try {
            const dto = {
                // patron: batchPatron, // Ya no usamos patron para el guardado final, sino IDs explícitos
                movimiento_ids: Array.from(batchSelectedIds),
                tercero_id: terceroId,
                centro_costo_id: centroCostoId,
                concepto_id: conceptoId
            }
            await apiService.clasificacion.clasificarLote(dto)
            setShowBatchModal(false)
            setBatchPreview([])
            // Recargar todo
            cargarDatosIniciales()
            setMovimientoActual(null)
        } catch (error) {
            alert("Error en lote: " + error)
        }
    }

    const abrirModalTercero = () => {
        setModalInitialValues({
            nombre: movimientoActual?.descripcion || ''
        })
        setShowTerceroModal(true)
    }

    const handleGuardarTercero = async (nombre: string) => {
        try {
            const nuevoTercero = await apiService.terceros.crear({
                tercero: nombre
            })
            // Update list
            setTerceros(prev => [...prev, nuevoTercero])
            // Select it
            setTerceroId(nuevoTercero.id)
            setShowTerceroModal(false)
        } catch (error) {
            console.error(error)
            alert("Error creando tercero")
        }
    }

    // --- DataTable Logic for Batch Modal ---
    const handleToggleBatchSelect = (id: number) => {
        const newSelected = new Set(batchSelectedIds)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setBatchSelectedIds(newSelected)
    }

    const handleToggleBatchSelectAll = () => {
        if (batchSelectedIds.size === batchPreview.length) {
            setBatchSelectedIds(new Set())
        } else {
            setBatchSelectedIds(new Set(batchPreview.map(m => m.id)))
        }
    }

    const batchColumns: Column<Movimiento>[] = [
        {
            key: 'id',
            header: 'ID',
            width: 'w-16',
            accessor: (row) => <span className="text-gray-500">#{row.id}</span>
        },
        { key: 'fecha', header: 'Fecha', sortable: true, width: 'w-24' },
        {
            key: 'descripcion',
            header: 'Descripción',
            sortable: true,
            accessor: (row) => <div className="truncate max-w-xs" title={row.descripcion}>{row.descripcion}</div>
        },
        {
            key: 'valor',
            header: 'Valor',
            sortable: true,
            align: 'right',
            accessor: (row) => <CurrencyDisplay value={row.valor} />
        },
        {
            key: 'seleccionar',
            header: 'Clasificar',
            width: 'w-24',
            align: 'center',
            sortable: false,
            headerClassName: 'text-center',
            accessor: (row) => (
                <div className="flex justify-center">
                    <input
                        type="checkbox"
                        checked={batchSelectedIds.has(row.id)}
                        onChange={() => handleToggleBatchSelect(row.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                </div>
            )
        }
    ]

    // --- Render ---

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">
            {/* Left Panel: List */}
            <div className="w-1/3 bg-white border-r flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-blue-600" />
                        Pendientes ({pendientes.length})
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando...</div>
                    ) : pendientes.length === 0 ? (
                        <div className="p-8 text-center text-green-600">
                            <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                            <p>¡Todo clasificado!</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {pendientes.map(mov => (
                                <div
                                    key={mov.id}
                                    onClick={() => seleccionarMovimiento(mov)}
                                    className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${movimientoActual?.id === mov.id ? 'bg-blue-100 border-l-4 border-blue-600' : ''
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {mov.cuenta_display && (
                                                <span className="text-xs text-blue-600 font-medium truncate max-w-[120px]" title={mov.cuenta_display}>
                                                    {mov.cuenta_display}
                                                </span>
                                            )}
                                            {/* USD indicator for MasterCard account */}
                                            {mov.cuenta_display?.toLowerCase().includes('mc') &&
                                                (mov.usd || mov.descripcion?.toLowerCase().includes('usd')) && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">
                                                        USD
                                                    </span>
                                                )}
                                            <span className="text-xs font-semibold text-gray-500">{mov.fecha}</span>
                                        </div>
                                        <CurrencyDisplay value={mov.valor} className="text-sm font-bold" />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        {mov.referencia && (
                                            <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0">
                                                <span className="bg-gray-200 px-1 rounded">REF</span> {mov.referencia}
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-800 font-medium truncate" title={mov.descripcion}>
                                            {mov.referencia && <span className="text-gray-400 mx-1">-</span>}
                                            {mov.descripcion}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Editor */}
            <div className="flex-1 flex flex-col bg-gray-50 overflow-y-auto">
                {movimientoActual ? (
                    <div className="p-6">
                        {/* Header Movimiento */}
                        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Editor de Clasificación</h1>
                                    <p className="text-gray-500 text-sm">ID: {movimientoActual.id}</p>
                                </div>
                                <div className="text-right">
                                    <CurrencyDisplay value={movimientoActual.valor} className="text-3xl font-bold" />
                                    <div className="text-gray-500 text-sm">{movimientoActual.cuenta_display}</div>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-4">
                                <p className="text-lg text-blue-900 font-medium">{movimientoActual.descripcion}</p>
                                {movimientoActual.referencia && (
                                    <p className="text-sm text-blue-700 mt-1">Ref: {movimientoActual.referencia}</p>
                                )}
                            </div>

                            {/* Sugerencia Bar */}
                            {sugerenciaData?.sugerencia.razon && (
                                <div className="bg-green-50 px-4 py-2 rounded border border-green-200 text-green-800 text-sm flex items-center gap-2 mb-4">
                                    <Search className="h-4 w-4" />
                                    <strong>Sugerencia:</strong> {sugerenciaData.sugerencia.razon}
                                </div>
                            )}

                            {/* Alert: Tercero no existe para esta referencia */}
                            {sugerenciaData?.referencia_no_existe && (
                                <div className="bg-orange-50 px-4 py-3 rounded border border-orange-200 text-orange-800 text-sm flex items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-orange-500 font-bold text-lg">⚠</span>
                                        <span>
                                            <strong>Tercero no Existe</strong> para la referencia <code className="bg-orange-100 px-1 rounded">{sugerenciaData.referencia}</code>
                                        </span>
                                    </div>
                                    <button
                                        onClick={abrirModalTercero}
                                        className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600 transition text-sm font-medium whitespace-nowrap"
                                    >
                                        ¿Quiere crearlo?
                                    </button>
                                </div>
                            )}

                            {/* Form Area */}
                            <div className="space-y-2">
                                {/* Tercero */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tercero</label>
                                    <ComboBox
                                        options={terceros}
                                        value={terceroId ? terceroId.toString() : ""}
                                        onChange={(val) => setTerceroId(val ? parseInt(val) : null)}
                                        placeholder="Buscar tercero..."
                                    />
                                    <div className="mt-1 text-left">
                                        <button
                                            onClick={abrirModalTercero}
                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            + Nuevo Tercero
                                        </button>
                                    </div>
                                </div>

                                {/* Grupo y Concepto en la misma línea */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Centro de Costo</label>
                                        <ComboBox
                                            options={centrosCostos}
                                            value={centroCostoId ? centroCostoId.toString() : ""}
                                            onChange={(val) => {
                                                setCentroCostoId(val ? parseInt(val) : null)
                                                setConceptoId(null)
                                            }}
                                            placeholder="Seleccionar centro de costo..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                                        <ComboBox
                                            options={conceptos.filter(c => !centroCostoId || c.centro_costo_id === centroCostoId)}
                                            value={conceptoId ? conceptoId.toString() : ""}
                                            onChange={(val) => setConceptoId(val ? parseInt(val) : null)}
                                            placeholder="Seleccionar concepto..."
                                        />
                                    </div>
                                </div>

                                {/* Descripción y Referencia */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                        <input
                                            type="text"
                                            value={descripcion}
                                            onChange={(e) => setDescripcion(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Descripción del movimiento..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                                        <input
                                            type="text"
                                            value={referencia}
                                            onChange={(e) => setReferencia(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Referencia..."
                                        />
                                    </div>
                                </div>

                                {/* Botones en una sola línea */}
                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        onClick={guardarClasificacion}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition shadow-md font-medium"
                                    >
                                        <Save className="h-5 w-5" />
                                        Guardar Clasificación
                                    </button>

                                    {sugerenciaData?.sugerencia.razon && (
                                        <button
                                            onClick={abrirModalLote}
                                            disabled={loadingBatch}
                                            className="flex-1 flex items-center justify-center gap-2 bg-white text-purple-700 border border-purple-200 py-3 px-4 rounded-lg hover:bg-purple-50 transition font-medium disabled:opacity-50"
                                        >
                                            <Layers className="h-5 w-5" />
                                            {loadingBatch ? 'Cargando...' : 'Aplicar a Todos (Lote)'}
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setMovimientoActual(null)}
                                        className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 py-3 px-4"
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                        Saltar
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* History Context - SIEMPRE MOSTRAR */}
                        {sugerenciaData && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-gray-400" />
                                    Historial Relacionado ({sugerenciaData.contexto.length})
                                </h3>

                                {sugerenciaData.contexto.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                        <p className="text-gray-500 text-sm mb-2">
                                            📋 No se encontraron registros similares para este movimiento
                                        </p>
                                        <p className="text-gray-400 text-xs">
                                            Esto puede ocurrir si es un movimiento nuevo o único
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 text-left text-gray-500">
                                                    <th className="px-4 py-2">Fecha</th>
                                                    <th className="px-4 py-2">Cuenta</th>
                                                    <th className="px-4 py-2">Referencia</th>
                                                    <th className="px-4 py-2">Descripción</th>
                                                    <th className="px-4 py-2">Valor</th>
                                                    <th className="px-4 py-2">Tercero</th>
                                                    <th className="px-4 py-2">Clasificación Asignada</th>
                                                    <th className="px-4 py-2">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sugerenciaData.contexto.map((ctx) => (
                                                    <tr key={ctx.id} className="border-b hover:bg-gray-50">
                                                        <td className="px-4 py-2 whitespace-nowrap">{ctx.fecha}</td>
                                                        <td className="px-4 py-2 text-sm text-blue-600 font-medium whitespace-nowrap">
                                                            {ctx.cuenta_display || '-'}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900 whitespace-nowrap">{ctx.referencia || '-'}</td>
                                                        <td className="px-4 py-2 text-xs text-gray-500 max-w-xs line-clamp-3" title={ctx.descripcion}>{ctx.descripcion}</td>
                                                        <td className="px-4 py-2"><CurrencyDisplay value={ctx.valor} /></td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-gray-900 font-medium">{ctx.tercero_display?.split('-')[1] || '-'}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <div className="text-xs text-gray-500">{ctx.centro_costo_display?.split('-')[1]} / {ctx.concepto_display?.split('-')[1]}</div>
                                                        </td>
                                                        <td className="px-4 py-2">
                                                            <button
                                                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                                                                onClick={() => {
                                                                    if (ctx.tercero_id) setTerceroId(ctx.tercero_id)
                                                                    if (ctx.centro_costo_id) setCentroCostoId(ctx.centro_costo_id)
                                                                    if (ctx.concepto_id) setConceptoId(ctx.concepto_id)
                                                                    if (ctx.descripcion) setDescripcion(ctx.descripcion)
                                                                    if (ctx.referencia) setReferencia(ctx.referencia)
                                                                }}
                                                                title="Copiar clasificación"
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                        {/* Botón para clasificar similares */}
                                        {movimientoActual && terceroId && centroCostoId && conceptoId && (
                                            <div className="mt-4 flex justify-end">
                                                <button
                                                    onClick={() => setShowSimilaresModal(true)}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Layers className="h-4 w-4" />
                                                    Clasificar Todos los Similares
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <ArrowRight className="h-16 w-16 mb-4 opacity-20" />
                        <p className="text-xl font-medium">Seleccione un movimiento para clasificar</p>
                    </div>
                )}
            </div>

            {/* Modal Clasificar Similares */}
            {movimientoActual && terceroId && centroCostoId && conceptoId && (
                <ModalClasificarSimilares
                    isOpen={showSimilaresModal}
                    onClose={() => setShowSimilaresModal(false)}
                    movimientoReferencia={movimientoActual}
                    clasificacion={{
                        tercero_id: terceroId,
                        centro_costo_id: centroCostoId,
                        concepto_id: conceptoId,
                        tercero_display: terceros.find(t => t.id === terceroId)?.nombre || '',
                        centro_costo_display: centrosCostos.find(c => c.id === centroCostoId)?.nombre || '',
                        concepto_display: conceptos.find(c => c.id === conceptoId)?.nombre || ''
                    }}
                    onConfirm={() => {
                        // Recargar pendientes después de clasificar
                        cargarDatosIniciales()
                    }}
                />
            )}

            <TerceroModal
                isOpen={showTerceroModal}
                tercero={null}
                initialValues={modalInitialValues}
                onClose={() => setShowTerceroModal(false)}
                onSave={handleGuardarTercero}
            />

            {/* Modal de Confirmación de Lote */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="bg-purple-600 text-white px-6 py-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Layers className="h-6 w-6" />
                                Confirmar Clasificación en Lote
                            </h2>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-auto flex-1">
                            <div className="mb-4 bg-gray-50 rounded-lg p-4">
                                <label className="block text-sm text-gray-700 mb-1">Patrón de búsqueda:</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={batchPatron}
                                        onChange={(e) => setBatchPatron(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleRefreshPreview()}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="Escriba patrón para buscar..."
                                    />
                                    <button
                                        onClick={handleRefreshPreview}
                                        disabled={loadingBatch}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {loadingBatch ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                            <RefreshCw className="h-4 w-4" />
                                        )}
                                        Refrescar
                                    </button>
                                </div>
                            </div>

                            <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
                                <div className="bg-blue-50 rounded-lg p-3">
                                    <p className="text-gray-500">Tercero</p>
                                    <p className="font-medium">{terceros.find(t => t.id === terceroId)?.nombre || '-'}</p>
                                </div>
                                <div className="bg-green-50 rounded-lg p-3">
                                    <p className="text-gray-500">Centro de Costo</p>
                                    <p className="font-medium">{centrosCostos.find(g => g.id === centroCostoId)?.nombre || '-'}</p>
                                </div>
                                <div className="bg-yellow-50 rounded-lg p-3">
                                    <p className="text-gray-500">Concepto</p>
                                    <p className="font-medium">{conceptos.find(c => c.id === conceptoId)?.nombre || '-'}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-2">
                                <div className="font-medium text-sm text-gray-600">
                                    Movimientos a clasificar ({batchPreview.length})
                                </div>
                                {batchPreview.length > 0 && (
                                    <button
                                        onClick={handleToggleBatchSelectAll}
                                        className="text-sm text-purple-600 hover:text-purple-800 hover:underline"
                                    >
                                        {batchSelectedIds.size === batchPreview.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                    </button>
                                )}
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <DataTable
                                    data={batchPreview}
                                    columns={batchColumns}
                                    loading={loadingBatch}
                                    emptyMessage="No hay movimientos que coincidan con el patrón"
                                    getRowKey={(row) => row.id}
                                    showActions={false}
                                    className="max-h-[400px]"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t px-6 py-4 flex justify-end gap-4 bg-gray-50">
                            <button
                                onClick={() => {
                                    setShowBatchModal(false)
                                    setBatchPreview([])
                                }}
                                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarLote}
                                disabled={batchSelectedIds.size === 0}
                                className="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition disabled:opacity-50 flex items-center gap-2"
                            >
                                <CheckCircle className="h-5 w-5" />
                                Aplicar a {batchSelectedIds.size} Movimientos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
