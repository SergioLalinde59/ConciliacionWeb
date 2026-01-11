import { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import { toast } from 'react-hot-toast'
import { ArrowRight, Check, TrendingDown, TrendingUp, Search, Calendar, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { Movimiento } from '../types'

interface SugerenciaGrupo {
    tercero_id: number
    tercero_nombre: string
    grupo_id: number
    grupo_nombre: string
    concepto_id: number
    concepto_nombre: string
    cantidad: number
    ingresos: number
    egresos: number
    volumen_total: number
}

export const SugerenciasReclasificacionPage = () => {
    const [sugerencias, setSugerencias] = useState<SugerenciaGrupo[]>([])
    const [loading, setLoading] = useState(true)
    const [procesando, setProcesando] = useState(false)

    // Filtros
    const [year, setYear] = useState('2025')
    const [filtro, setFiltro] = useState('')

    // Modal state
    const [selectedItem, setSelectedItem] = useState<SugerenciaGrupo | null>(null)
    const [detallesMovimientos, setDetallesMovimientos] = useState<Movimiento[]>([])
    const [selectedMovimientos, setSelectedMovimientos] = useState<number[]>([])
    const [loadingDetalles, setLoadingDetalles] = useState(false)
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

    useEffect(() => {
        if (detallesMovimientos.length > 0) {
            setSelectedMovimientos(detallesMovimientos.map(m => m.id))
        } else {
            setSelectedMovimientos([])
        }
    }, [detallesMovimientos])

    const toggleMovimiento = (id: number) => {
        setSelectedMovimientos(prev =>
            prev.includes(id)
                ? prev.filter(mId => mId !== id)
                : [...prev, id]
        )
    }

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc'
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        }
        setSortConfig({ key, direction })
    }

    const sortedMovimientos = [...detallesMovimientos].sort((a: any, b: any) => {
        if (!sortConfig) return 0

        let valA = a[sortConfig.key]
        let valB = b[sortConfig.key]

        // Custom sort for Clasificación which is a composite in display but we can sort by tercero_display as proxy
        if (sortConfig.key === 'clasificacion') {
            valA = (a.tercero_display || '') + (a.grupo_display || '')
            valB = (b.tercero_display || '') + (b.grupo_display || '')
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })



    useEffect(() => {
        cargarSugerencias()
    }, [year])

    const cargarSugerencias = async () => {
        try {
            setLoading(true)
            const fechaInicio = `${year}-01-01`
            const fechaFin = `${year}-12-31`
            const data = await apiService.movimientos.obtenerSugerenciasReclasificacion(fechaInicio, fechaFin) as SugerenciaGrupo[]
            setSugerencias(data)
        } catch (error) {
            console.error(error)
            toast.error('Error cargando sugerencias')
        } finally {
            setLoading(false)
        }
    }

    const abrirPrevisualizacion = async (item: SugerenciaGrupo) => {
        setSelectedItem(item)
        setLoadingDetalles(true)
        try {
            const fechaInicio = `${year}-01-01`
            const fechaFin = `${year}-12-31`
            const data = await apiService.movimientos.obtenerDetallesSugerencia(
                item.tercero_id,
                undefined, // grupo_id deprecated
                undefined, // concepto_id deprecated
                fechaInicio,
                fechaFin
            )
            setDetallesMovimientos(data as Movimiento[])
        } catch (error) {
            console.error(error)
            toast.error('Error cargando detalles')
            setSelectedItem(null)
        } finally {
            setLoadingDetalles(false)
        }
    }

    const cerrarModal = () => {
        setSelectedItem(null)
        setDetallesMovimientos([])
    }

    const confirmarReclasificacion = async () => {
        if (!selectedItem) return

        try {
            setProcesando(true)
            const fechaInicio = `${year}-01-01`
            const fechaFin = `${year}-12-31`

            await apiService.movimientos.reclasificarLote({
                tercero_id: selectedItem.tercero_id,
                // grupo_id y concepto_id ya no son requeridos
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                movimiento_ids: selectedMovimientos
            })

            toast.success('Movimientos reclasificados exitosamente')
            cerrarModal()
            cargarSugerencias() // Reload to refresh list

        } catch (error) {
            console.error(error)
            toast.error('Error al reclasificar')
        } finally {
            setProcesando(false)
        }
    }

    // Calcular impacto total
    const totalIngresosFalsos = sugerencias.reduce((sum, item) => sum + item.ingresos, 0)
    const totalEgresosFalsos = sugerencias.reduce((sum, item) => sum + item.egresos, 0)

    // Filtrar sugerencias
    const sugerenciasFiltradas = sugerencias.filter(item =>
        item.tercero_nombre.toLowerCase().includes(filtro.toLowerCase())
    )

    if (loading && sugerencias.length === 0) return <div className="p-8 text-center bg-white rounded-lg shadow-sm border border-gray-100">Cargando sugerencias...</div>

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Depuración Inteligente de Traslados</h1>
                    <p className="text-gray-600 mt-2">
                        Identificamos Terceros que actúan como cuentas (tienen ingresos y egresos) para clasificarlos como Traslados.
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
                    <Calendar size={16} className="text-gray-500" />
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-transparent text-sm font-medium focus:outline-none text-gray-700"
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>
                </div>
            </header>

            {/* Resumen de Impacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-red-800 font-semibold mb-1">Gastos Recortables ({year})</h3>
                        <p className="text-3xl font-bold text-red-600">
                            ${totalEgresosFalsos.toLocaleString()}
                        </p>
                        <p className="text-sm text-red-700 mt-1 flex items-center gap-1">
                            <TrendingDown size={16} /> Dinero clasificado erróneamente como gasto
                        </p>
                    </div>
                </div>
                <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-green-800 font-semibold mb-1">Ingresos Recortables ({year})</h3>
                        <p className="text-3xl font-bold text-green-600">
                            ${totalIngresosFalsos.toLocaleString()}
                        </p>
                        <p className="text-sm text-green-700 mt-1 flex items-center gap-1">
                            <TrendingUp size={16} /> Dinero clasificado erróneamente como ingreso
                        </p>
                    </div>
                </div>
            </div>

            {/* Barra de Búsqueda */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Buscar por Tercero..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                />
            </div>

            {sugerenciasFiltradas.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">
                        {filtro ? 'No se encontraron coincidencias' : `¡Todo limpio para ${year}!`}
                    </h3>
                    <p className="text-gray-500">
                        {filtro ? 'Prueba con otro término de búsqueda.' : 'No encontramos Terceros para reclasificar en este periodo.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sugerenciasFiltradas.map((item, index) => (
                        <div key={`${item.tercero_id}-${index}`}
                            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">

                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="max-w-[70%]">
                                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1" title={item.tercero_nombre}>
                                            {item.tercero_nombre}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Reclasificar todo como Traslado
                                        </p>
                                    </div>
                                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0">
                                        {item.cantidad} movs
                                    </span>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Ingresos (Créditos):</span>
                                        <span className="font-medium text-green-600">
                                            +${item.ingresos.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Egresos (Débitos):</span>
                                        <span className="font-medium text-red-600">
                                            -${item.egresos.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center font-semibold">
                                        <span className="text-gray-900">Volumen Total:</span>
                                        <span className="text-gray-900">${item.volumen_total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => abrirPrevisualizacion(item)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    Revisar y Convertir <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Previsualización */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Confirmar Reclasificación</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Se actualizarán {selectedMovimientos.length} de {detallesMovimientos.length} movimientos del año {year} para <strong>{selectedItem.tercero_nombre}</strong>
                                </p>
                            </div>
                            <button onClick={cerrarModal} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Comparativa Visual */}
                            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg mb-6 border border-blue-100">
                                <div className="text-center w-1/3">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Clasificación Actual</p>
                                    <p className="font-medium text-gray-900 line-clamp-1 text-sm">Varias (Mixto)</p>
                                    <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                                        {selectedItem.ingresos > 0 && (
                                            <p>Ingresos: <span className="text-green-600 font-medium">${selectedItem.ingresos.toLocaleString()}</span></p>
                                        )}
                                        {selectedItem.egresos > 0 && (
                                            <p>Gastos: <span className="text-red-600 font-medium">${selectedItem.egresos.toLocaleString()}</span></p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center text-blue-500 px-2">
                                    <ArrowRight size={24} />
                                    <span className="text-xs font-medium mt-1 text-blue-400">Reclasificar Todo</span>
                                </div>
                                <div className="text-center w-1/3">
                                    <p className="text-xs text-green-600 uppercase font-semibold mb-1">Propuesto</p>
                                    <p className="font-bold text-green-700">Traslado</p>
                                    <p className="text-sm text-green-600">Traslado</p>
                                    <div className="mt-2 text-xs text-green-600/70">
                                        <p>Efecto Neutro</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla de Detalles */}
                            <div className="flex justify-between items-end mb-3">
                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Search size={16} /> Detalles de Movimientos
                                </h4>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedMovimientos(detallesMovimientos.map(m => m.id))}
                                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium transition-colors"
                                    >
                                        Marcar Todos
                                    </button>
                                    <button
                                        onClick={() => setSelectedMovimientos([])}
                                        className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded hover:bg-gray-200 font-medium transition-colors"
                                    >
                                        Desmarcar Todos
                                    </button>
                                </div>
                            </div>

                            {loadingDetalles ? (
                                <div className="text-center py-8 text-gray-500">Cargando detalles...</div>
                            ) : (
                                <div className="overflow-x-auto border rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                                    {/* Checkbox removed */}
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('fecha')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Fecha
                                                        {sortConfig?.key === 'fecha' && (
                                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('clasificacion')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Clasificación Actual
                                                        {sortConfig?.key === 'clasificacion' && (
                                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('descripcion')}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Descripción
                                                        {sortConfig?.key === 'descripcion' && (
                                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                    onClick={() => handleSort('valor')}
                                                >
                                                    <div className="flex items-center justify-end gap-1">
                                                        Valor
                                                        {sortConfig?.key === 'valor' && (
                                                            sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                                                        )}
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sortedMovimientos.map((mov) => (
                                                <tr key={mov.id} className={selectedMovimientos.includes(mov.id) ? 'bg-blue-50/30' : ''}>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedMovimientos.includes(mov.id)}
                                                            onChange={() => toggleMovimiento(mov.id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(mov.fecha).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-500">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-700">{mov.tercero_display || '-'}</span>
                                                            <span className="text-xs text-gray-400">
                                                                {mov.grupo_display || '-'} / {mov.concepto_display || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-900 line-clamp-1 max-w-xs" title={mov.descripcion}>
                                                        {mov.descripcion}
                                                    </td>
                                                    <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${mov.valor < 0 ? 'text-red-600' : 'text-green-600'
                                                        }`}>
                                                        ${Math.abs(mov.valor).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                onClick={cerrarModal}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarReclasificacion}
                                disabled={procesando || selectedMovimientos.length === 0}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {procesando ? 'Procesando...' : 'Confirmar Reclasificación'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
