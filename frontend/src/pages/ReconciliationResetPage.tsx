import React, { useState, useEffect } from 'react'
import { apiService, conciliacionService } from '../services/api'
import { toast } from 'react-hot-toast'
import { AlertTriangle, RefreshCw, BarChart3, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import type { Conciliacion } from '../types/Conciliacion'

export const ReconciliationResetPage: React.FC = () => {
    const [cuentas, setCuentas] = useState<any[]>([])
    const [selectedCuenta, setSelectedCuenta] = useState<number | ''>('')
    const [year, setYear] = useState<number>(new Date().getFullYear())
    const [month, setMonth] = useState<number>(new Date().getMonth() + 1)

    // Data States
    const [conciliacionData, setConciliacionData] = useState<Conciliacion | null>(null)
    const [statsData, setStatsData] = useState<any | null>(null)
    const [fetchingStats, setFetchingStats] = useState(false)

    // UI States
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)

    useEffect(() => {
        cargarCuentas()
    }, [])

    useEffect(() => {
        if (selectedCuenta && year && month) {
            fetchStatistics()
        } else {
            setConciliacionData(null)
            setStatsData(null)
        }
    }, [selectedCuenta, year, month])

    const cargarCuentas = async () => {
        try {
            const data = await apiService.cuentas.listar()
            setCuentas(data)
            if (data.length > 0) {
                // El servicio catalogosService.cuentas.listar retorna Cuenta[] con campo 'id'
                setSelectedCuenta(data[0].id)
            }
        } catch (error) {
            console.error('Error cargando cuentas', error)
            toast.error('Error cargando cuentas')
        }
    }

    const fetchStatistics = async () => {
        if (!selectedCuenta) return

        setFetchingStats(true)
        try {
            const [conciliacion, comparacion] = await Promise.all([
                conciliacionService.getByPeriod(Number(selectedCuenta), year, month),
                conciliacionService.compararMovimientos(Number(selectedCuenta), year, month)
            ])
            setConciliacionData(conciliacion)
            setStatsData(comparacion)
        } catch (error) {
            console.error("Error fetching statistics:", error)
            setConciliacionData(null)
            setStatsData(null)
        } finally {
            setFetchingStats(false)
        }
    }

    const handleReset = async () => {
        if (!selectedCuenta) {
            toast.error('Seleccione una cuenta')
            return
        }

        setLoading(true)
        try {
            const result = await apiService.matching.desvincularTodo(
                Number(selectedCuenta),
                year,
                month
            )
            toast.success(result.mensaje)
            setShowConfirm(false)
            fetchStatistics() // Refresh stats
        } catch (error: any) {
            console.error('Error reseteando periodo', error)
            toast.error(error.message || 'Error al reiniciar periodo')
        } finally {
            setLoading(false)
        }
    }

    // Generate years list (current +/- 5)
    const currentYear = new Date().getFullYear()
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)

    const months = [
        { value: 1, label: 'Enero' },
        { value: 2, label: 'Febrero' },
        { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' },
        { value: 5, label: 'Mayo' },
        { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' },
        { value: 8, label: 'Agosto' },
        { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' },
        { value: 11, label: 'Noviembre' },
        { value: 12, label: 'Diciembre' },
    ]

    // Helper to format currency without decimals
    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val)
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                    <RefreshCw size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reiniciar Conciliación</h1>
                    <p className="text-gray-500">Elimina vinculaciones y restablece el balance del sistema para un mes específico.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Cuenta Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta</label>
                        <select
                            value={selectedCuenta}
                            onChange={(e) => setSelectedCuenta(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        >
                            <option value="">Seleccione Cuenta</option>
                            {cuentas.filter(c => c.permite_carga).map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Year Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>

                    {/* Month Select */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mes</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                        >
                            {months.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Statistics Ribbon */}
                {(fetchingStats || conciliacionData) && (
                    <div className="mb-8 animate-fade-in relative">
                        {fetchingStats && (
                            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            {/* Número de Registros */}
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Nº Registros</span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <BarChart3 size={16} />
                                    <span className="text-xl font-bold">{statsData?.extracto?.total || '-'}</span>
                                </div>
                            </div>

                            {/* Saldo Inicial */}
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Saldo Inicial</span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Wallet size={16} className="text-blue-500" />
                                    <span className="text-lg font-bold">
                                        {formatMoney(conciliacionData?.extracto_saldo_anterior || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Ingresos */}
                            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">Ingresos</span>
                                <div className="flex items-center gap-2 text-emerald-700">
                                    <TrendingUp size={16} />
                                    <span className="text-lg font-bold">
                                        {formatMoney(conciliacionData?.extracto_entradas || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Egresos */}
                            <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider mb-1">Egresos</span>
                                <div className="flex items-center gap-2 text-rose-700">
                                    <TrendingDown size={16} />
                                    <span className="text-lg font-bold">
                                        {formatMoney(conciliacionData?.extracto_salidas || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* Saldo Final */}
                            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-sm">
                                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">Saldo Final</span>
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Wallet size={16} />
                                    <span className="text-lg font-bold">
                                        {formatMoney(conciliacionData?.extracto_saldo_final || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-8 flex gap-3">
                    <AlertTriangle className="text-orange-600 h-6 w-6 flex-shrink-0" />
                    <div className="text-sm text-orange-800">
                        <strong>Advertencia:</strong> Esta acción eliminará todas las vinculaciones (matches) realizadas en el periodo seleccionado.
                        <ul className="list-disc list-inside mt-1 ml-1 space-y-1">
                            <li>Se borrarán los matches manuales y automáticos.</li>
                            <li>El saldo del sistema en el "Resumen de Conciliación" se recalculará basado en el total de movimientos del libro.</li>
                            <li><strong>Los datos del Extracto Bancario NO se modificarán.</strong></li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={!selectedCuenta || loading}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Procesando...' : (
                            <>
                                <RefreshCw size={20} />
                                Reiniciar Conciliación
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border-none max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-red-600 p-6 text-white flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full animate-pulse">
                                <AlertTriangle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">¿Confirmar Reinicio?</h3>
                                <p className="text-red-100 text-xs font-medium tracking-wide border-t border-white/20 mt-1 pt-1 opacity-80">ACCIÓN DESTRUCTIVA</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                    <p className="text-slate-500 text-sm font-medium">Periodo a reiniciar:</p>
                                    <p className="mt-1 font-black text-gray-900 text-xl">
                                        {months.find(m => m.value === month)?.label} {year}
                                    </p>

                                    {conciliacionData && (
                                        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-center gap-4 text-sm">
                                            <div className="text-slate-600">
                                                Registros: <strong>{statsData?.extracto?.total || 0}</strong>
                                            </div>
                                            <div className="text-slate-600">
                                                Saldo: <strong>{formatMoney(conciliacionData.extracto_saldo_final)}</strong>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-600 text-center">
                                    Se perderá todo el trabajo de conciliación realizado en este mes.
                                </p>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(false)}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="flex-[2] px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-gray-900 font-black shadow-lg shadow-red-200 transition-all uppercase tracking-widest text-sm"
                                >
                                    {loading ? 'Eliminando...' : 'Sí, Reiniciar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
