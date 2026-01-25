import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, AlertCircle, CheckCircle, Check, CheckCheck } from 'lucide-react'
import { MatchingTable } from '../components/organisms/MatchingTable'
import { MatchingStatsCard } from '../components/organisms/MatchingStatsCard'
import { MatchEstado } from '../types/Matching'
import type { ConfiguracionMatchingUpdate } from '../types/Matching'
import type { Cuenta, Movimiento } from '../types'
import { ConfiguracionMatchingForm } from '../components/organisms/ConfiguracionMatchingForm'
import { MatchesIncorrectosModal } from '../components/organisms/MatchesIncorrectosModal'
import { MovimientoModal } from '../components/organisms/modals/MovimientoModal'
import { matchingService } from '../services/matching.service'
import { conciliacionService } from '../services/conciliacionService'
import { cuentasService, movimientosService } from '../services/api'
import { UnmatchedSystemTable } from '../components/organisms/UnmatchedSystemTable'

export const ConciliacionMatchingPage = () => {
    // State para filtros principales
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)

    // State para filtros de matches
    const [selectedEstados, setSelectedEstados] = useState<MatchEstado[]>([MatchEstado.SIN_MATCH])

    // State para UI
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showMatchesIncorrectosModal, setShowMatchesIncorrectosModal] = useState(false)

    // State para edición de movimiento de sistema (desde popover)
    const [editingSystemMov, setEditingSystemMov] = useState<Movimiento | null>(null)
    const [showEditSystemModal, setShowEditSystemModal] = useState(false)

    const queryClient = useQueryClient()

    // Cargar cuentas
    const { data: cuentasResult } = useQuery({
        queryKey: ['cuentas'],
        queryFn: cuentasService.listar
    })
    const cuentas = cuentasResult || []

    // Filtrar solo cuentas que permiten conciliar
    const reconcilableCuentas = useMemo(() => {
        return cuentas.filter((c: Cuenta) => c.permite_conciliar)
    }, [cuentas])

    // Seleccionar primera cuenta por defecto
    useEffect(() => {
        if (!cuentaId && reconcilableCuentas.length > 0) {
            setCuentaId(reconcilableCuentas[0].id)
        }
    }, [reconcilableCuentas, cuentaId])

    // Obtener estado de la conciliación para bloqueo
    const { data: conciliacion } = useQuery({
        queryKey: ['conciliacion', cuentaId, year, month],
        queryFn: () => conciliacionService.getByPeriod(cuentaId!, year, month),
        enabled: cuentaId !== null
    })

    const isLocked = conciliacion?.estado === 'CONCILIADO'

    // Ejecutar matching
    const { data: matchingResult, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['matching', cuentaId, year, month],
        queryFn: async () => {
            try {
                return await matchingService.ejecutarMatching(cuentaId!, year, month)
            } catch (err: any) {
                // Si el error es 404, significa que no hay configuración activa o datos
                if (err.response?.status === 404) {
                    throw new Error("No se encontraron datos o configuración para este período.")
                }
                throw err
            }
        },
        enabled: cuentaId !== null,
        retry: 1
    })




    // Detectar matches 1-a-muchos (Calculado LOCALMENTE para in-memory validation)
    const matches1aMuchosData = useMemo(() => {
        if (!matchingResult || !matchingResult.matches) return null

        // Agrupar por movimiento de sistema ID
        const conteoPorSistema: Record<number, {
            sistemaMov: any,
            extractoMovs: any[]
        }> = {}

        matchingResult.matches.forEach(match => {
            if (match.mov_sistema) {
                const sysId = match.mov_sistema.id
                if (!conteoPorSistema[sysId]) {
                    conteoPorSistema[sysId] = {
                        sistemaMov: match.mov_sistema,
                        extractoMovs: []
                    }
                }
                conteoPorSistema[sysId].extractoMovs.push(match.mov_extracto)
            }
        })

        // Filtrar los que tienen > 1 vinculación
        const casosProblematicos = Object.values(conteoPorSistema)
            .filter(grupo => grupo.extractoMovs.length > 1)
            .map(grupo => ({
                sistema_id: grupo.sistemaMov.id,
                sistema_descripcion: grupo.sistemaMov.descripcion,
                sistema_valor: grupo.sistemaMov.valor,
                sistema_fecha: grupo.sistemaMov.fecha,
                num_vinculaciones: grupo.extractoMovs.length,
                extracto_ids: grupo.extractoMovs.map(e => e.id),
                extracto_descripciones: grupo.extractoMovs.map(e => e.descripcion),
                extracto_valores: grupo.extractoMovs.map(e => e.valor),
                extracto_fechas: grupo.extractoMovs.map(e => e.fecha)
            }))

        if (casosProblematicos.length === 0) return null

        const totalExtractosAfectados = casosProblematicos.reduce((acc, curr) => acc + curr.num_vinculaciones, 0)

        return {
            casos_problematicos: casosProblematicos,
            total_movimientos_sistema_afectados: casosProblematicos.length,
            total_extractos_afectados: totalExtractosAfectados
        }
    }, [matchingResult])

    // Detectar matches 1-a-muchos (BACKEND - Legacy/Backup)
    // const { data: matches1aMuchosDataLegacy } = useQuery({
    //     queryKey: ['matches-1-a-muchos', cuentaId, year, month],
    //     queryFn: () => matchingService.detectarMatches1aMuchos(cuentaId!, year, month),
    //     enabled: cuentaId !== null
    // })

    // Cargar configuración
    const { data: configuracion } = useQuery({
        queryKey: ['matching-config'],
        queryFn: matchingService.obtenerConfiguracion
    })

    // Mutations
    const vincularMutation = useMutation({
        mutationFn: (data: { extractoId: number, sistemaId: number, usuario: string, notas?: string }) =>
            matchingService.vincularManual({
                movimiento_extracto_id: data.extractoId,
                movimiento_id: data.sistemaId,
                usuario: data.usuario,
                notas: data.notas
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
        }
    })

    const desvincularMutation = useMutation({
        mutationFn: (extractoId: number) => matchingService.desvincular(extractoId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
        },
        onError: (error) => {
            console.error(error)
            alert('Error al desvincular el movimiento')
        }
    })

    const actualizarConfigMutation = useMutation({
        mutationFn: (config: ConfiguracionMatchingUpdate) => matchingService.actualizarConfiguracion(config),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching-config'] })
            setShowConfigModal(false)
        }
    })

    const createMovementsMutation = useMutation({
        mutationFn: (items: { movimiento_extracto_id: number, descripcion?: string }[]) =>
            matchingService.crearMovimientosLote(items),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
        },
        onError: (error) => {
            console.error(error)
            alert('Error al crear movimientos')
        }
    })

    const invalidarMatches1aMuchosMutation = useMutation({
        // NOTA: Este endpoint del backend borra de DB. 
        // Si los duplicados son solo en memoria (no guardados), esto podría no hacer nada en DB 
        // pero refrescar la query limpiaría el estado inestable.
        mutationFn: () => matchingService.invalidarMatches1aMuchos(cuentaId!, year, month),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
            // queryClient.invalidateQueries({ queryKey: ['matches-1-a-muchos', cuentaId, year, month] })
            setShowMatchesIncorrectosModal(false)
        },
        onError: (error) => {
            console.error(error)
            alert('Error al invalidar matches incorrectos')
        }
    })

    // Mutations para sistema (Floating Window)
    const deleteSystemMovMutation = useMutation({
        mutationFn: (id: number) => movimientosService.eliminarLote([id]),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
        },
        onError: (error) => {
            console.error(error)
            alert('Error al eliminar movimiento del sistema')
        }
    })

    const updateSystemMovMutation = useMutation({
        mutationFn: (data: { id: number, datos: Partial<Movimiento> }) =>
            movimientosService.actualizar(data.id, data.datos),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
            setShowEditSystemModal(false)
        },
        onError: (error) => {
            console.error(error)
            alert('Error al actualizar movimiento')
        }
    })

    const closeMutation = useMutation({
        mutationFn: () => conciliacionService.cerrarConciliacion(cuentaId!, year, month),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conciliacion', cuentaId, year, month] })
            alert("Conciliación cerrada y bloqueada exitosamente. 🟢")
        },
        onError: (error: any) => {
            alert("Error al cerrar: " + (error.message || "Error desconocido"));
        }
    })


    // Filtrar matches
    const matchesFiltrados = useMemo(() => {
        if (!matchingResult) return []

        let filtered = matchingResult.matches

        // Filtrar por estados
        if (selectedEstados.length > 0) {
            filtered = filtered.filter(m => selectedEstados.includes(m.estado))
        }



        // Ordenar por estado (Sin Match → Probables → OK → Manual → Ignorado)
        // Dentro de cada estado, ordenar por score descendente
        const estadoOrder = {
            'SIN_MATCH': 0,
            'PROBABLE': 1,
            'OK': 2,
            'MANUAL': 3,
            'IGNORADO': 4
        }

        return filtered.sort((a, b) => {
            const estadoCompare = estadoOrder[a.estado] - estadoOrder[b.estado]
            if (estadoCompare !== 0) return estadoCompare
            // Dentro del mismo estado, ordenar por score descendente
            return b.score_total - a.score_total
        })
    }, [matchingResult, selectedEstados])

    const limpiarFiltros = () => {
        setSelectedEstados([])
    }



    return (
        <div className="flex flex-col gap-3">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Matching Inteligente</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Vinculación automática de movimientos bancarios
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                        >
                            <Settings size={18} />
                            Configuración
                        </button>
                    </div>
                </div>
            </div>

            {/* Filtros Principales */}
            <div className="bg-white rounded-xl border border-gray-200 p-3">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cuenta
                        </label>
                        <select
                            value={cuentaId || ''}
                            onChange={(e) => setCuentaId(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {reconcilableCuentas.map((cuenta: Cuenta) => (
                                <option key={cuenta.id} value={cuenta.id}>
                                    {cuenta.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-32">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Año
                        </label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="2020"
                            max="2030"
                        />
                    </div>

                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mes
                        </label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >

                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>
                                    {new Date(2000, m - 1, 1).toLocaleString('es-CO', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Error State */}
            {isError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700 mb-6">
                    <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-500" />
                    <h3 className="text-lg font-semibold mb-1">Error al cargar datos</h3>
                    <p className="text-sm opacity-80 mb-4">{error instanceof Error ? error.message : 'Ocurrió un error desconocido'}</p>
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-sm font-medium transition-colors"
                    >
                        Intentar nuevamente
                    </button>
                </div>
            )}

            {/* Banner de Bloqueo */}
            {isLocked && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-emerald-900 mb-1">
                                Período Conciliado y Bloqueado
                            </h3>
                            <p className="text-sm text-emerald-800">
                                Esta cuenta ya ha sido marcada como <strong>CONCILIADA</strong> para este período. Los movimientos y vinculaciones están protegidos contra cambios.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Checklist de Cuadre Estricto */}
            {matchingResult && !isLocked && (
                <div className={`bg-white rounded-xl border p-5 mb-6 shadow-sm transition-colors ${matchingResult.integridad.es_cuadrado ? 'border-emerald-200 bg-emerald-50/10' : 'border-amber-200 bg-amber-50/10'}`}>
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-3 h-3 rounded-full ${matchingResult.integridad.es_cuadrado ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Estado de Cuadre Estricto</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                                <Requirement
                                    label="Balance Ingresos"
                                    ok={matchingResult.integridad.balance_ingresos}
                                    detail={matchingResult.integridad.balance_ingresos ? "Coincide" : `Dif: ${new Intl.NumberFormat('es-CO').format(matchingResult.estadisticas.total_extracto.ingresos - matchingResult.estadisticas.total_sistema.ingresos)}`}
                                />
                                <Requirement
                                    label="Balance Egresos"
                                    ok={matchingResult.integridad.balance_egresos}
                                    detail={matchingResult.integridad.balance_egresos ? "Coincide" : `Dif: ${new Intl.NumberFormat('es-CO').format(matchingResult.estadisticas.total_extracto.egresos - matchingResult.estadisticas.total_sistema.egresos)}`}
                                />
                                <Requirement
                                    label="Volumen Total"
                                    ok={matchingResult.integridad.igualdad_registros}
                                    detail={matchingResult.integridad.igualdad_registros ? "Igual" : `${matchingResult.estadisticas.total_extracto.cantidad} vs ${matchingResult.estadisticas.total_sistema.cantidad}`}
                                />
                                <Requirement
                                    label="Vinculación"
                                    ok={matchingResult.integridad.todo_vinculado}
                                    detail={matchingResult.integridad.todo_vinculado ? "Completa" : `${matchingResult.estadisticas.ok.cantidad} de ${matchingResult.estadisticas.total_extracto.cantidad}`}
                                />
                                <Requirement
                                    label="Sin Pendientes"
                                    ok={matchingResult.integridad.sin_pendientes}
                                    detail={matchingResult.integridad.sin_pendientes ? "Limpio" : `${matchingResult.estadisticas.sin_match.cantidad + matchingResult.estadisticas.probables.cantidad} por resolver`}
                                />
                                <Requirement
                                    label="Relación 1 a 1"
                                    ok={matchingResult.integridad.relacion_1_a_1}
                                    detail={matchingResult.integridad.relacion_1_a_1 ? "Correcta" : "Duplicados"}
                                />
                            </div>
                        </div>

                        {matchingResult.integridad.es_cuadrado && (
                            <div className="shrink-0 flex flex-col items-center gap-2 pr-2">
                                <button
                                    onClick={() => {
                                        if (confirm('¿Deseas aprobar y cerrar formalmente la conciliación de este periodo? Una vez cerrada, no se permitirán más cambios.')) {
                                            closeMutation.mutate();
                                        }
                                    }}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2 hover:scale-105"
                                >
                                    <CheckCheck size={20} />
                                    Aprobar y Cerrar
                                </button>
                                <span className="text-[10px] text-emerald-600 font-medium uppercase">Conciliación Lista</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Alerta de Matches Incorrectos */}
            {matches1aMuchosData && matches1aMuchosData.total_movimientos_sistema_afectados > 0 && !isLocked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-yellow-900 mb-1">
                                ⚠️ Matches Incorrectos Detectados
                            </h3>
                            <p className="text-sm text-yellow-800 mb-3">
                                Se detectaron {matches1aMuchosData.total_movimientos_sistema_afectados} movimiento{matches1aMuchosData.total_movimientos_sistema_afectados !== 1 ? 's' : ''} del
                                sistema vinculado{matches1aMuchosData.total_movimientos_sistema_afectados !== 1 ? 's' : ''} a múltiples extractos ({matches1aMuchosData.total_extractos_afectados} extractos afectados).
                                Esto es incorrecto (debe ser 1-a-1).
                            </p>
                            <button
                                onClick={() => setShowMatchesIncorrectosModal(true)}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                Ver Detalles y Corregir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Estadísticas y Filtros */}
            {/* Estadísticas y Filtros */}
            {
                matchingResult && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-4">
                            <div className="space-y-3">
                                <MatchingStatsCard
                                    estadisticas={matchingResult.estadisticas}
                                    unmatchedSystemRecordsCount={matchingResult.movimientos_sistema_sin_match?.length || 0}
                                />
                            </div>

                            {/* Tabla de Matches */}
                            <div className="space-y-4">
                                <MatchingTable
                                    matches={matchesFiltrados}
                                    selectedEstados={selectedEstados}
                                    onEstadosChange={setSelectedEstados}
                                    onLimpiar={limpiarFiltros}
                                    onAprobar={isLocked ? undefined : (match) => {
                                        if (match.mov_sistema) {
                                            vincularMutation.mutate({
                                                extractoId: match.mov_extracto.id,
                                                sistemaId: match.mov_sistema.id,
                                                usuario: 'sistema', // TODO: Usar usuario real
                                                notas: 'Aprobado desde Probable'
                                            })
                                        }
                                    }}
                                    onCrear={isLocked ? undefined : (match) => {
                                        createMovementsMutation.mutate([{
                                            movimiento_extracto_id: match.mov_extracto.id,
                                            descripcion: match.mov_extracto.descripcion
                                        }])
                                    }}
                                    onDesvincular={isLocked ? undefined : (match) => {
                                        desvincularMutation.mutate(match.mov_extracto.id)
                                    }}
                                    onAprobarTodo={isLocked ? undefined : () => {
                                        const probables = matchesFiltrados.filter(m => m.estado === MatchEstado.PROBABLE)
                                        if (probables.length === 0) return

                                        probables.forEach(match => {
                                            if (match.mov_sistema) {
                                                vincularMutation.mutate({
                                                    extractoId: match.mov_extracto.id,
                                                    sistemaId: match.mov_sistema.id,
                                                    usuario: 'sistema',
                                                    notas: 'Aprobación masiva'
                                                })
                                            }
                                        })
                                    }}
                                    onCrearTodo={isLocked ? undefined : () => {
                                        const sinMatch = matchesFiltrados.filter(m => m.estado === MatchEstado.SIN_MATCH && !m.mov_sistema)
                                        if (sinMatch.length === 0) return

                                        const itemsToCreate = sinMatch.map(m => ({
                                            movimiento_extracto_id: m.mov_extracto.id,
                                            descripcion: m.mov_extracto.descripcion
                                        }))
                                        createMovementsMutation.mutate(itemsToCreate)
                                    }}
                                    loading={isLoading}
                                />
                            </div>
                        </div>

                        {/* Tabla de Registros en Tránsito / Sin Match */}
                        {matchingResult.movimientos_sistema_sin_match && matchingResult.movimientos_sistema_sin_match.length > 0 && (
                            <div className="mt-4">
                                <UnmatchedSystemTable
                                    records={matchingResult.movimientos_sistema_sin_match}
                                    onDelete={isLocked ? undefined : (id) => {
                                        if (confirm('¿Estás seguro de eliminar este movimiento del sistema?')) {
                                            deleteSystemMovMutation.mutate(id)
                                        }
                                    }}
                                    onEdit={isLocked ? undefined : (mov) => {
                                        setEditingSystemMov(mov as any)
                                        setShowEditSystemModal(true)
                                    }}
                                />
                            </div>
                        )}
                    </>
                )
            }

            {/* Mensaje cuando no hay datos */}
            {!isLoading && !matchingResult && cuentaId && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <div className="max-w-md mx-auto">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            No hay datos disponibles
                        </h3>
                        <p className="text-gray-600 mb-4">
                            No se encontraron movimientos para la cuenta seleccionada en el período {month}/{year}.
                        </p>
                        <p className="text-sm text-gray-500">
                            Asegúrate de que existan movimientos de extracto bancario y del sistema para este período.
                        </p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Ejecutando algoritmo de matching...</p>
                    </div>
                </div>
            )}

            {/* Modal de Configuración */}
            {showConfigModal && configuracion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <ConfiguracionMatchingForm
                            configuracion={configuracion}
                            onSave={async (config) => { await actualizarConfigMutation.mutateAsync(config) }}
                            onCancel={() => setShowConfigModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Modal de Matches Incorrectos */}
            {showMatchesIncorrectosModal && matches1aMuchosData && matches1aMuchosData.casos_problematicos.length > 0 && (
                <MatchesIncorrectosModal
                    casos={matches1aMuchosData.casos_problematicos}
                    totalMovimientosSistema={matches1aMuchosData.total_movimientos_sistema_afectados}
                    totalExtractos={matches1aMuchosData.total_extractos_afectados}
                    onClose={() => setShowMatchesIncorrectosModal(false)}
                    onCorregir={async () => { await invalidarMatches1aMuchosMutation.mutateAsync() }}
                    isLoading={invalidarMatches1aMuchosMutation.isPending}
                />
            )}

            {/* Modal de Edición de Sistema */}
            {showEditSystemModal && editingSystemMov && (
                <MovimientoModal
                    isOpen={showEditSystemModal}
                    onClose={() => setShowEditSystemModal(false)}
                    movimiento={editingSystemMov}
                    onSave={async (data) => {
                        await updateSystemMovMutation.mutateAsync({
                            id: editingSystemMov.id,
                            datos: data
                        })
                    }}
                />
            )}
        </div>
    )
}

// Sub-componente para los requisitos
const Requirement = ({ label, ok, detail }: { label: string, ok: boolean, detail: string }) => (
    <div className={`p-2 rounded-lg border flex flex-col gap-0.5 ${ok ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center gap-1.5">
            {ok ? (
                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check size={10} className="text-emerald-600" />
                </div>
            ) : (
                <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle size={10} className="text-amber-600" />
                </div>
            )}
            <span className={`text-[10px] font-bold uppercase tracking-tight ${ok ? 'text-emerald-700' : 'text-gray-500'}`}>{label}</span>
        </div>
        <span className={`text-xs ml-5 font-medium ${ok ? 'text-emerald-600' : 'text-amber-700 italic'}`}>
            {detail}
        </span>
    </div>
)
