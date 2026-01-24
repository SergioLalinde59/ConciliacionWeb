import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, AlertCircle } from 'lucide-react'
import { MatchingTable } from '../components/organisms/MatchingTable'
import { MatchingStatsCard } from '../components/organisms/MatchingStatsCard'
import { MatchingFilters } from '../components/organisms/MatchingFilters'
import { ConfiguracionMatchingForm } from '../components/organisms/ConfiguracionMatchingForm'
import { MatchesIncorrectosModal } from '../components/organisms/MatchesIncorrectosModal'
import { matchingService } from '../services/matching.service'
import { cuentasService } from '../services/api'
import type { ConfiguracionMatchingUpdate } from '../types/Matching'
import { MatchEstado } from '../types/Matching'
import type { Cuenta } from '../types'

export const ConciliacionMatchingPage = () => {
    // State para filtros principales
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [year, setYear] = useState(new Date().getFullYear())
    const [month, setMonth] = useState(new Date().getMonth() + 1)

    // State para filtros de matches
    const [selectedEstados, setSelectedEstados] = useState<MatchEstado[]>([MatchEstado.SIN_MATCH])
    const [minScore, setMinScore] = useState(0)
    const [soloConfirmados, setSoloConfirmados] = useState(false)

    // State para UI
    const [showConfigModal, setShowConfigModal] = useState(false)
    const [showMatchesIncorrectosModal, setShowMatchesIncorrectosModal] = useState(false)

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




    // Detectar matches 1-a-muchos
    const { data: matches1aMuchosData } = useQuery({
        queryKey: ['matches-1-a-muchos', cuentaId, year, month],
        queryFn: () => matchingService.detectarMatches1aMuchos(cuentaId!, year, month),
        enabled: cuentaId !== null
    })

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
        mutationFn: () => matchingService.invalidarMatches1aMuchos(cuentaId!, year, month),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matching', cuentaId, year, month] })
            queryClient.invalidateQueries({ queryKey: ['matches-1-a-muchos', cuentaId, year, month] })
            setShowMatchesIncorrectosModal(false)
        },
        onError: (error) => {
            console.error(error)
            alert('Error al invalidar matches incorrectos')
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



        // Ordenar por estado (Sin Match → Probables → Exactos → Manual → Ignorado)
        // Dentro de cada estado, ordenar por score descendente
        const estadoOrder = {
            'SIN_MATCH': 0,
            'PROBABLE': 1,
            'EXACTO': 2,
            'MANUAL': 3,
            'IGNORADO': 4
        }

        return filtered.sort((a, b) => {
            const estadoCompare = estadoOrder[a.estado] - estadoOrder[b.estado]
            if (estadoCompare !== 0) return estadoCompare
            // Dentro del mismo estado, ordenar por score descendente
            return b.score_total - a.score_total
        })
    }, [matchingResult, minScore, selectedEstados, soloConfirmados])

    const limpiarFiltros = () => {
        setSelectedEstados([])
    }



    return (
        <div className="flex flex-col gap-6">
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
            <div className="bg-white rounded-xl border border-gray-200 p-4">
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

            {/* Alerta de Matches Incorrectos */}
            {matches1aMuchosData && matches1aMuchosData.total_movimientos_sistema_afectados > 0 && (
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
            {
                matchingResult && (
                    <div className="grid grid-cols-1 lg:grid-cols-[350px,1fr] gap-6">
                        <div className="space-y-6">
                            <MatchingStatsCard estadisticas={matchingResult.estadisticas} />
                            <MatchingFilters
                                selectedEstados={selectedEstados}
                                onEstadosChange={setSelectedEstados}
                                minScore={minScore}
                                onMinScoreChange={setMinScore}
                                soloConfirmados={soloConfirmados}
                                onSoloConfirmadosChange={setSoloConfirmados}
                                onLimpiar={limpiarFiltros}
                            />
                        </div>

                        {/* Tabla de Matches */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Matches Encontrados ({matchesFiltrados.length})
                                </h2>
                            </div>

                            <MatchingTable
                                matches={matchesFiltrados}
                                onAprobar={(match) => {
                                    if (match.mov_sistema) {
                                        vincularMutation.mutate({
                                            extractoId: match.mov_extracto.id,
                                            sistemaId: match.mov_sistema.id,
                                            usuario: 'sistema', // TODO: Usar usuario real
                                            notas: 'Aprobado desde Probable'
                                        })
                                    }
                                }}
                                onCrear={(match) => {
                                    createMovementsMutation.mutate([{
                                        movimiento_extracto_id: match.mov_extracto.id,
                                        descripcion: match.mov_extracto.descripcion
                                    }])
                                }}
                                onDesvincular={(match) => {
                                    desvincularMutation.mutate(match.mov_extracto.id)
                                }}
                                onAprobarTodo={() => {
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
                                onCrearTodo={() => {
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
            {
                isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Ejecutando algoritmo de matching...</p>
                        </div>
                    </div>
                )
            }

            {/* Modal de Configuración */}
            {
                showConfigModal && configuracion && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <ConfiguracionMatchingForm
                                configuracion={configuracion}
                                onSave={async (config) => { await actualizarConfigMutation.mutateAsync(config) }}
                                onCancel={() => setShowConfigModal(false)}
                            />
                        </div>
                    </div>
                )
            }

            {/* Modal de Matches Incorrectos */}
            {
                showMatchesIncorrectosModal && matches1aMuchosData && matches1aMuchosData.casos_problematicos.length > 0 && (
                    <MatchesIncorrectosModal
                        casos={matches1aMuchosData.casos_problematicos}
                        totalMovimientosSistema={matches1aMuchosData.total_movimientos_sistema_afectados}
                        totalExtractos={matches1aMuchosData.total_extractos_afectados}
                        onClose={() => setShowMatchesIncorrectosModal(false)}
                        onCorregir={async () => { await invalidarMatches1aMuchosMutation.mutateAsync() }}
                        isLoading={invalidarMatches1aMuchosMutation.isPending}
                    />
                )
            }
        </div >
    )
}
