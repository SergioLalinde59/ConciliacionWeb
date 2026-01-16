import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import { UploadCloud, FileText, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react'

// TODO: Importar tipo Conciliacion si es necesario o usar `any` para el resumen por ahora
interface ResumenExtracto {
    saldo_anterior: number
    entradas: number
    salidas: number
    saldo_final: number
    periodo_desde?: string
    periodo_hasta?: string
    year?: number
    month?: number
    periodo_texto?: string
}

export const UploadExtractoPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null)
    const [tipoCuenta, setTipoCuenta] = useState('bancolombia_ahorro')
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [cuentas, setCuentas] = useState<Cuenta[]>([])

    // Status
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [analyzed, setAnalyzed] = useState(false)
    const [resumen, setResumen] = useState<ResumenExtracto | null>(null)

    useEffect(() => {
        // Load accounts
        apiService.cuentas.listar()
            .then(setCuentas)
            .catch(err => console.error(err))
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
            setError(null)
            setAnalyzed(false)
            setResumen(null)
        }
    }

    const handleAnalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        setResult(null)
        setResumen(null)

        try {
            const data = await apiService.conciliacion.analizarExtracto(file, tipoCuenta)
            setResumen(data)
            setAnalyzed(true)
        } catch (err: any) {
            setError(err.message || "Error al analizar archivo")
        } finally {
            setLoading(false)
        }
    }

    const handleCargarDefinitivo = async () => {
        if (!file || !cuentaId || !resumen) return

        // Validación simple de que tenemos periodo
        if (!resumen.year || !resumen.month) {
            setError("No se pudo identificar el periodo (Año/Mes) en el extracto. No se puede cargar.")
            return
        }

        setLoading(true)
        try {
            // Enviamos year/month extraídos explícitamente por seguridad, 
            // aunque el backend podría re-extraerlos, es mejor pasar lo que el usuario confirmó visualmente.
            const data = await apiService.conciliacion.cargarExtracto(
                file,
                tipoCuenta,
                cuentaId,
                resumen.year,
                resumen.month
            )
            setResult(data)
            setAnalyzed(false)
            setFile(null) // Reset on complete success
        } catch (err: any) {
            setError(err.message || "Error al cargar extracto")
        } finally {
            setLoading(false)
        }
    }

    // Reset analysis if file changes
    useEffect(() => {
        setAnalyzed(false)
        setResumen(null)
        setResult(null)
    }, [file, tipoCuenta])

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <UploadCloud className="h-8 w-8 text-blue-600" />
                Cargar Extracto Bancario
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">

                {/* 1. Selección */}
                <form onSubmit={handleAnalizar} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta Asociada</label>
                            <select
                                value={cuentaId || ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value)
                                    setCuentaId(id)
                                    // Reset basics
                                    setFile(null)
                                    setAnalyzed(false)
                                    setResumen(null)
                                    setResult(null)
                                    setError(null)
                                    const cuenta = cuentas.find(c => c.id === id)
                                    if (cuenta) {
                                        // Default inference
                                        const nombreLower = cuenta.nombre.toLowerCase()
                                        if (nombreLower.includes('ahorro') || nombreLower.includes('bancolombia')) {
                                            setTipoCuenta('bancolombia_ahorro')
                                        } else if (nombreLower.includes('renta') || nombreLower.includes('fondo')) {
                                            setTipoCuenta('FondoRenta')
                                        }
                                    }
                                }}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                            >
                                <option value="">Seleccione una cuenta...</option>
                                {cuentas.filter(c => c.permite_conciliar).map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                        <input
                            type="file"
                            id="file-upload"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <FileText className={`h-12 w-12 mb-2 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
                            <span className="text-lg font-medium text-gray-700">
                                {file ? file.name : "Seleccionar extracto PDF"}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Haz clic para buscar"}
                            </span>
                        </label>
                    </div>

                    {!analyzed && !result && (
                        <button
                            type="submit"
                            disabled={loading || !file}
                            className={`w-full py-3 px-4 rounded-lg font-medium text-white shadow-sm transition-colors
                                ${loading || !file
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {loading ? 'Analizando...' : 'Analizar Extracto'}
                        </button>
                    )}
                </form>

                {/* 2. Resumen Hallado */}
                {resumen && analyzed && (
                    <div className="animate-fade-in space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="text-blue-600" />
                                    Resumen del Periodo
                                </div>
                                {resumen.periodo_texto && (
                                    <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded-full uppercase">
                                        {resumen.periodo_texto}
                                    </span>
                                )}
                            </h3>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs text-gray-500 uppercase font-semibold">Saldo Anterior</span>
                                    <p className="text-lg font-mono font-medium text-gray-800">{formatCurrency(resumen.saldo_anterior)}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs text-green-600 uppercase font-semibold">Entradas</span>
                                    <p className="text-lg font-mono font-medium text-green-600">{formatCurrency(resumen.entradas)}</p>
                                </div>
                                <div className="p-3 bg-white rounded-lg shadow-sm border border-gray-100">
                                    <span className="text-xs text-red-600 uppercase font-semibold">Salidas</span>
                                    <p className="text-lg font-mono font-medium text-red-600">{formatCurrency(resumen.salidas)}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                                    <span className="text-xs text-blue-600 uppercase font-semibold">Saldo Final</span>
                                    <p className="text-lg font-mono font-bold text-blue-700">{formatCurrency(resumen.saldo_final)}</p>
                                </div>
                            </div>

                            {/* Validación básica matematica */}
                            {Math.abs((resumen.saldo_anterior + resumen.entradas - resumen.salidas) - resumen.saldo_final) > 0.01 && (
                                <div className="mt-4 p-3 bg-orange-50 text-orange-800 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    <span>Advertencia: Los valores leídos no cuadran matemáticamente. Verifique el PDF.</span>
                                </div>
                            )}

                            {(!resumen.year || !resumen.month) && (
                                <div className="mt-4 p-3 bg-red-50 text-red-800 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    <span>Error: No se pudo identificar el año y mes en el extracto. No podrá cargar este archivo automáticamente.</span>
                                </div>
                            )}
                        </div>

                        {/* Botones Acción */}
                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => {
                                    setAnalyzed(false)
                                    setResumen(null)
                                    setFile(null)
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCargarDefinitivo}
                                disabled={!cuentaId || !resumen.year}
                                className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition flex items-center gap-2
                                    ${!cuentaId || !resumen.year
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                <UploadCloud size={18} />
                                Confirmar y Cargar
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Resultado Final */}
                {result && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 animate-fade-in">
                        <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" />
                            Carga Exitosa
                        </h3>
                        <p className="text-green-800">
                            {result.conciliacion?.year && result.conciliacion?.month
                                ? `Se ha actualizado la conciliación del periodo ${result.conciliacion.year}-${result.conciliacion.month} correctamente.`
                                : 'Se ha actualizado la conciliación correctamente.'}
                        </p>
                        <div className="mt-4">
                            <p className="text-sm">Sistema actualizado: <strong>{formatCurrency(result.conciliacion.sistema_saldo_final)}</strong></p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-8 p-4 bg-red-50 rounded-lg border border-red-200">
                        <h3 className="text-lg font-semibold text-red-900 mb-1 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Error
                        </h3>
                        <p className="text-red-700">{error}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
