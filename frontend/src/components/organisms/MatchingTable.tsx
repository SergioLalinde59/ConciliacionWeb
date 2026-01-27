import React, { useState, useMemo } from 'react'
import { CheckCheck, Unlink, X } from 'lucide-react'
import { Icon } from '../atoms/Icon'
import { Button } from '../atoms/Button'
import { MatchStatusBadge } from '../atoms/MatchStatusBadge'
import type { MovimientoMatch } from '../../types/Matching'
import { MatchEstado } from '../../types/Matching'

interface MatchingTableProps {
    matches: MovimientoMatch[]
    selectedEstados: MatchEstado[]
    onEstadosChange: (estados: MatchEstado[]) => void
    onLimpiar: () => void
    onAprobar?: (match: MovimientoMatch) => void
    onAprobarTodo?: () => void
    onCrear?: (match: MovimientoMatch) => void
    onCrearTodo?: () => void
    onDesvincular?: (match: MovimientoMatch) => void
    onDesvincularTodo?: () => void
    loading?: boolean
    className?: string
}

type SortColumn = 'extracto_fecha' | 'extracto_descripcion' | 'extracto_valor' | 'extracto_usd' | 'extracto_trm' |
    'sistema_fecha' | 'sistema_descripcion' | 'sistema_valor' | 'sistema_usd' | 'sistema_trm' | 'diferencia' | null
type SortDirection = 'asc' | 'desc'

/**
 * Tabla de matches con datos del extracto y sistema lado a lado
 * 
 * Muestra los resultados del matching en formato tabular con columnas para:
 * - Estado del match
 * - Datos del extracto (fecha, descripción, valor, USD, TRM)
 * - Datos del sistema (fecha, descripción, valor, USD, TRM)
 * - Acciones (desvincular, ignorar)
 */
export const MatchingTable = ({
    matches,
    selectedEstados,
    onEstadosChange,
    onLimpiar,
    onAprobar,
    onAprobarTodo,
    onCrear,
    onCrearTodo,
    onDesvincular,
    onDesvincularTodo,
    loading = false,
    className = ''
}: MatchingTableProps) => {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
    const [sortColumn, setSortColumn] = useState<SortColumn>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

    const toggleEstado = (estado: MatchEstado) => {
        if (selectedEstados.includes(estado)) {
            onEstadosChange(selectedEstados.filter(e => e !== estado))
        } else {
            onEstadosChange([...selectedEstados, estado])
        }
    }

    const toggleRow = (matchId: number | null | undefined) => {
        if (!matchId) return
        const newExpanded = new Set(expandedRows)
        if (newExpanded.has(matchId)) {
            newExpanded.delete(matchId)
        } else {
            newExpanded.add(matchId)
        }
        setExpandedRows(newExpanded)
    }

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('desc')
        }
    }

    const getSortedMatches = () => {
        if (!sortColumn) return matches

        return [...matches].sort((a, b) => {
            let aVal: any
            let bVal: any

            switch (sortColumn) {
                case 'extracto_fecha':
                    aVal = new Date(a.mov_extracto.fecha).getTime()
                    bVal = new Date(b.mov_extracto.fecha).getTime()
                    break
                case 'extracto_descripcion':
                    aVal = a.mov_extracto.descripcion.toLowerCase()
                    bVal = b.mov_extracto.descripcion.toLowerCase()
                    break
                case 'extracto_valor':
                    aVal = a.mov_extracto.valor
                    bVal = b.mov_extracto.valor
                    break
                case 'extracto_usd':
                    aVal = a.mov_extracto.usd || 0
                    bVal = b.mov_extracto.usd || 0
                    break
                case 'extracto_trm':
                    aVal = a.mov_extracto.trm || 0
                    bVal = b.mov_extracto.trm || 0
                    break
                case 'sistema_fecha':
                    aVal = a.mov_sistema ? new Date(a.mov_sistema.fecha).getTime() : 0
                    bVal = b.mov_sistema ? new Date(b.mov_sistema.fecha).getTime() : 0
                    break
                case 'sistema_descripcion':
                    aVal = a.mov_sistema?.descripcion.toLowerCase() || ''
                    bVal = b.mov_sistema?.descripcion.toLowerCase() || ''
                    break
                case 'sistema_valor':
                    aVal = a.mov_sistema?.valor || 0
                    bVal = b.mov_sistema?.valor || 0
                    break
                case 'sistema_usd':
                    aVal = a.mov_sistema?.usd || 0
                    bVal = b.mov_sistema?.usd || 0
                    break
                case 'sistema_trm':
                    aVal = a.mov_sistema?.trm || 0
                    bVal = b.mov_sistema?.trm || 0
                    break
                case 'diferencia':
                    aVal = a.mov_extracto.valor - (a.mov_sistema?.valor || 0)
                    bVal = b.mov_extracto.valor - (b.mov_sistema?.valor || 0)
                    break
                default:
                    return 0
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
            return 0
        })
    }

    const getValueColor = (value: number): string => {
        if (value > 0) return 'text-green-600'
        if (value < 0) return 'text-red-600'
        return 'text-blue-600'
    }

    const SortIcon = ({ column }: { column: SortColumn }) => {
        if (sortColumn !== column) {
            return <Icon name="ArrowUpDown" size={14} className="text-gray-400" />
        }
        return sortDirection === 'asc'
            ? <Icon name="ChevronUp" size={14} className="text-blue-600" />
            : <Icon name="ChevronDown" size={14} className="text-blue-600" />
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value)
    }

    const formatDifference = (value: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    }

    const formatUSD = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-'
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value)
    }
    // ...

    const formatTRM = (value: number | null | undefined) => {
        if (value === null || value === undefined) return '-'
        return new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value)
    }

    const formatDate = (date: Date | string) => {
        if (!date) return '-'
        // Si es string YYYY-MM-DD, lo mostramos directo para evitar problemas de timezone
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-')
            return `${day}/${month}/${year}`
        }

        const d = typeof date === 'string' ? new Date(date) : date
        return d.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'UTC' // Forzamos UTC si viene como objeto Date
        })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const sortedMatches = getSortedMatches()

    const totalDifference = useMemo(() => {
        return matches.reduce((sum, m) => {
            const diff = m.mov_extracto.valor - (m.mov_sistema?.valor || 0)
            return sum + diff
        }, 0)
    }, [matches])

    const estadosOptions = [
        { value: MatchEstado.SIN_MATCH, label: 'Sin Match', color: 'gray' },
        { value: MatchEstado.PROBABLE, label: 'Probable', color: 'amber' },
        { value: MatchEstado.OK, label: 'OK', color: 'emerald' }
    ]

    return (
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
            <div className="p-3 border-b border-gray-100 bg-emerald-50 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Unlink className="text-emerald-600" size={20} />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 leading-none">Matches Encontrados</h3>
                            <p className="text-xs text-emerald-700 mt-1">
                                Vinculaciones detectadas
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pl-4 border-l border-emerald-200">
                        {estadosOptions.map(({ value, label, color }) => {
                            const isSelected = selectedEstados.includes(value)
                            const activeClass = `bg-${color}-100 text-${color}-700 border-${color}-300 ring-1 ring-${color}-300`
                            const inactiveClass = 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'

                            return (
                                <button
                                    key={value}
                                    onClick={() => toggleEstado(value)}
                                    className={`
                                        px-3 py-1 rounded-md text-xs font-semibold border transition-all
                                        ${isSelected ? activeClass : inactiveClass}
                                    `}
                                >
                                    {label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {selectedEstados.length > 0 && (
                        <button
                            onClick={onLimpiar}
                            className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-red-600 transition-colors"
                        >
                            <X size={14} />
                            Limpiar
                        </button>
                    )}
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                        {matches.length} registros
                    </span>
                    <span className={`px-3 py-1 bg-purple-100 rounded-full text-xs font-bold ${getValueColor(totalDifference)}`}>
                        Dif: {formatDifference(totalDifference)}
                    </span>
                </div>
            </div>

            {matches.length === 0 ? (
                <div className="p-12 text-center">
                    <p className="text-gray-500">No se encontraron matches con los filtros aplicados</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                                    Estado
                                </th>
                                <th colSpan={5} className="px-4 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200 bg-emerald-50">
                                    Extracto Bancario
                                </th>
                                <th colSpan={5} className="px-4 py-1.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200 bg-blue-50">
                                    Sistema
                                </th>
                                <th className="px-4 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200 bg-purple-50">
                                    Diferencia
                                </th>
                                <th className="px-4 py-1.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-l border-gray-200 w-32">
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        <span>Acciones</span>
                                        <div className="flex items-center gap-2">
                                            {onAprobarTodo && matches.some(m => m.estado === MatchEstado.PROBABLE) && (
                                                <button
                                                    onClick={onAprobarTodo}
                                                    className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                                    title="Aprobar todos los probables"
                                                >
                                                    <CheckCheck size={16} />
                                                </button>
                                            )}
                                            {onCrearTodo && matches.some(m => m.estado === MatchEstado.SIN_MATCH && !m.mov_sistema) && (
                                                <button
                                                    onClick={onCrearTodo}
                                                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                    title="Crear todos los faltantes"
                                                >
                                                    <CheckCheck size={16} />
                                                </button>
                                            )}
                                            {onDesvincularTodo && matches.some(m => m.id !== null) && (
                                                <button
                                                    onClick={onDesvincularTodo}
                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                    title="Desvincular TODO y reiniciar"
                                                >
                                                    <Unlink size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </th>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-4 py-1.5"></th>
                                {/* Extracto subheaders */}
                                <th
                                    className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border-l border-gray-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => handleSort('extracto_fecha')}
                                >
                                    <div className="flex items-center gap-1">
                                        Fecha
                                        <SortIcon column="extracto_fecha" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => handleSort('extracto_descripcion')}
                                >
                                    <div className="flex items-center gap-1">
                                        Descripción
                                        <SortIcon column="extracto_descripcion" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => handleSort('extracto_valor')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Valor
                                        <SortIcon column="extracto_valor" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => handleSort('extracto_usd')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        USD
                                        <SortIcon column="extracto_usd" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-emerald-50 cursor-pointer hover:bg-emerald-100"
                                    onClick={() => handleSort('extracto_trm')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        TRM
                                        <SortIcon column="extracto_trm" />
                                    </div>
                                </th>
                                {/* Sistema subheaders */}
                                <th
                                    className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 border-l border-gray-200 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                    onClick={() => handleSort('sistema_fecha')}
                                >
                                    <div className="flex items-center gap-1">
                                        Fecha
                                        <SortIcon column="sistema_fecha" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-left text-xs font-medium text-gray-600 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                    onClick={() => handleSort('sistema_descripcion')}
                                >
                                    <div className="flex items-center gap-1">
                                        Descripción
                                        <SortIcon column="sistema_descripcion" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                    onClick={() => handleSort('sistema_valor')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Valor
                                        <SortIcon column="sistema_valor" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                    onClick={() => handleSort('sistema_usd')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        USD
                                        <SortIcon column="sistema_usd" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 bg-blue-50 cursor-pointer hover:bg-blue-100"
                                    onClick={() => handleSort('sistema_trm')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        TRM
                                        <SortIcon column="sistema_trm" />
                                    </div>
                                </th>
                                <th
                                    className="px-2 py-1.5 text-right text-xs font-medium text-gray-600 border-l border-gray-200 bg-purple-50 cursor-pointer hover:bg-purple-100"
                                    onClick={() => handleSort('diferencia')}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        Dif
                                        <SortIcon column="diferencia" />
                                    </div>
                                </th>
                                <th className="px-4 py-1.5 border-l border-gray-200"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {sortedMatches.map((match, index) => {
                                const isExpanded = match.id ? expandedRows.has(match.id) : false
                                const hasSystemMovement = match.mov_sistema !== null


                                return (
                                    <React.Fragment key={match.id || `match-${index}`}>
                                        <tr className="hover:bg-gray-50 transition-colors">
                                            {/* Estado */}
                                            <td className="px-4 py-0.5">
                                                <MatchStatusBadge estado={match.estado} size="sm" />
                                            </td>

                                            {/* Extracto - Fecha */}
                                            <td className="px-2 py-0.5 text-sm text-gray-900 border-l border-gray-100">
                                                {formatDate(match.mov_extracto.fecha)}
                                            </td>

                                            {/* Extracto - Descripción */}
                                            <td className="px-2 py-0.5 text-sm text-gray-900 max-w-xs">
                                                <div className="truncate" title={match.mov_extracto.descripcion}>
                                                    {match.mov_extracto.descripcion}
                                                </div>
                                            </td>

                                            {/* Extracto - Valor */}
                                            <td className={`px-2 py-0.5 text-sm text-right font-medium ${getValueColor(match.mov_extracto.valor)}`}>
                                                {formatCurrency(match.mov_extracto.valor)}
                                            </td>

                                            {/* Extracto - USD */}
                                            <td className={`px-2 py-0.5 text-sm text-right ${match.mov_extracto.usd !== null && match.mov_extracto.usd !== undefined ? getValueColor(match.mov_extracto.usd) : 'text-gray-600'}`}>
                                                {formatUSD(match.mov_extracto.usd)}
                                            </td>

                                            {/* Extracto - TRM */}
                                            <td className="px-2 py-0.5 text-sm text-right text-gray-600">
                                                {formatTRM(match.mov_extracto.trm)}
                                            </td>

                                            {/* Sistema - Fecha */}
                                            <td className="px-2 py-0.5 text-sm text-gray-900 border-l border-gray-100">
                                                {hasSystemMovement ? formatDate(match.mov_sistema!.fecha) : '-'}
                                            </td>

                                            {/* Sistema - Descripción */}
                                            <td className="px-2 py-0.5 text-sm text-gray-900 max-w-xs">
                                                {hasSystemMovement ? (
                                                    <div className="truncate" title={match.mov_sistema!.descripcion}>
                                                        {match.mov_sistema!.descripcion}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin vinculación</span>
                                                )}
                                            </td>

                                            {/* Sistema - Valor */}
                                            <td className={`px-2 py-0.5 text-sm text-right font-medium ${hasSystemMovement ? getValueColor(match.mov_sistema!.valor) : 'text-gray-900'}`}>
                                                {hasSystemMovement ? formatCurrency(match.mov_sistema!.valor) : '-'}
                                            </td>

                                            {/* Sistema - USD */}
                                            <td className={`px-2 py-0.5 text-sm text-right ${hasSystemMovement && match.mov_sistema!.usd !== null && match.mov_sistema!.usd !== undefined ? getValueColor(match.mov_sistema!.usd) : 'text-gray-600'}`}>
                                                {hasSystemMovement ? formatUSD(match.mov_sistema!.usd) : '-'}
                                            </td>

                                            {/* Sistema - TRM */}
                                            <td className="px-2 py-0.5 text-sm text-right text-gray-600">
                                                {hasSystemMovement ? formatTRM(match.mov_sistema!.trm) : '-'}
                                            </td>

                                            {/* Diferencia */}
                                            <td className={`px-2 py-0.5 text-sm text-right font-medium border-l border-gray-100 ${hasSystemMovement ? getValueColor(match.mov_extracto.valor - match.mov_sistema!.valor) : 'text-gray-400'}`}>
                                                {hasSystemMovement ? formatDifference(match.mov_extracto.valor - match.mov_sistema!.valor) : '-'}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-4 py-0.5 border-l border-gray-100">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Expand/Collapse button */}
                                                    {hasSystemMovement && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                toggleRow(match.id)
                                                            }}
                                                            className="!p-1 text-gray-400 hover:text-gray-600"
                                                            title={isExpanded ? "Ocultar detalles" : "Ver detalles"}
                                                        >
                                                            {isExpanded ? <Icon name="ChevronUp" size={15} /> : <Icon name="ChevronDown" size={15} />}
                                                        </Button>
                                                    )}

                                                    {/* Aprobar (Probable -> OK) */}
                                                    {match.estado === MatchEstado.PROBABLE && onAprobar && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onAprobar(match)
                                                            }}
                                                            className="!p-1 text-green-600 hover:text-green-700 bg-green-50 border-green-100"
                                                            title="Aprobar vinculación"
                                                        >
                                                            <Icon name="Check" size={15} />
                                                        </Button>
                                                    )}

                                                    {/* Crear (Sin Match -> Nuevo Movimiento) */}
                                                    {match.estado === MatchEstado.SIN_MATCH && onCrear && (
                                                        <Button
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onCrear(match)
                                                            }}
                                                            className="!p-1 !text-blue-600 hover:!text-blue-700 bg-blue-50 border-blue-100"
                                                            title="Crear movimiento en sistema"
                                                        >
                                                            <Icon name="Check" size={15} />
                                                        </Button>
                                                    )}

                                                    {/* Desvincular */}
                                                    {hasSystemMovement && onDesvincular && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onDesvincular(match)
                                                            }}
                                                            className="!p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            title="Desvincular (Eliminar vinculación)"
                                                        >
                                                            <Icon name="Unlink" size={15} />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded row - Score breakdown */}
                                        {isExpanded && hasSystemMovement && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={13} className="px-4 py-3">
                                                    <div className="flex items-center gap-6 text-sm">
                                                        <div className="font-semibold text-gray-700">Scores de Similitud:</div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-600">Fecha:</span>
                                                            <span className="font-medium">{(match.score_fecha * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-600">Valor:</span>
                                                            <span className="font-medium">{(match.score_valor * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-600">Descripción:</span>
                                                            <span className="font-medium">{(match.score_descripcion * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 ml-auto">
                                                            <span className="text-gray-600">Total:</span>
                                                            <span className="font-bold text-blue-600">{(match.score_total * 100).toFixed(0)}%</span>
                                                        </div>
                                                        {match.notas && (
                                                            <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 rounded">
                                                                <span className="text-amber-800 text-xs">📝 {match.notas}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
