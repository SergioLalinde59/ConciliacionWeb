import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import { UploadCloud, FileText, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { Modal } from '../components/molecules/Modal'
import { Button } from '../components/atoms/Button'

export const UploadMovimientosPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null)
    const [tipoCuenta, setTipoCuenta] = useState('')
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [cuentas, setCuentas] = useState<Cuenta[]>([])

    // Status
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Modal Success State
    const [showSuccessModal, setShowSuccessModal] = useState(false)

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
            setShowSuccessModal(false)
        }
    }

    // State for analysis mode
    const [analyzed, setAnalyzed] = useState(false)
    const [stats, setStats] = useState<{ leidos: number, duplicados: number, nuevos: number } | null>(null)
    const [movimientosPreview, setMovimientosPreview] = useState<any[]>([])

    const handleAnalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        setResult(null)
        setStats(null)
        setMovimientosPreview([])

        try {
            const data = await apiService.archivos.analizar(file, tipoCuenta)
            setStats(data.estadisticas)
            setMovimientosPreview(data.movimientos)
            setAnalyzed(true)
        } catch (err: any) {
            setError(err.message || "Error al analizar archivo")
        } finally {
            setLoading(false)
        }
    }

    const handleCargarDefinitivo = async () => {
        if (!file || !cuentaId) return

        setLoading(true)
        try {
            const data = await apiService.archivos.cargar(file, tipoCuenta, cuentaId)
            setResult(data)
            setShowSuccessModal(true) // Show modal on success
            setAnalyzed(false)
            setFile(null) // Reset on complete success
        } catch (err: any) {
            setError(err.message || "Error al cargar movimientos")
        } finally {
            setLoading(false)
        }
    }

    // Reset analysis if file changes
    useEffect(() => {
        setAnalyzed(false)
        setStats(null)
        // No limpiar result aquí, ya que se usa para mostrar el modal de éxito cuando file se vuelve null
    }, [file, tipoCuenta])

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false)
        setResult(null)
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <UploadCloud className="h-8 w-8 text-blue-600" />
                Cargar Movimientos Bancarios
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
                                    // Limpiar archivo y análisis previo al cambiar cuenta
                                    setFile(null)
                                    setAnalyzed(false)
                                    setStats(null)
                                    setMovimientosPreview([])
                                    setResult(null)
                                    setError(null)
                                    // Inferir tipo de cuenta
                                    const cuenta = cuentas.find(c => c.id === id)
                                    if (cuenta) {
                                        // Usar el nombre de cuenta directamente como tipo_cuenta
                                        setTipoCuenta(cuenta.nombre)
                                    }
                                }}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5"
                            >
                                <option value="">Seleccione una cuenta...</option>
                                {cuentas.filter(c => c.permite_carga).map(c => (
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
                                {file ? file.name : "Seleccionar archivo PDF"}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Haz clic para buscar en tu equipo"}
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
                            {loading ? 'Analizando...' : 'Analizar Archivo'}
                        </button>
                    )}
                </form>

                {/* 2. Estadísticas de Validación (Solo visibles tras analizar) */}
                {stats && analyzed && (
                    <div className="animate-fade-in space-y-8">
                        {/* Cards Estadísticas */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                                <span className="text-3xl font-bold text-blue-600 block">{stats.leidos}</span>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registros Leídos</span>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                                <span className="text-3xl font-bold text-orange-600 block">{stats.duplicados}</span>
                                <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Duplicados</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                                <span className="text-3xl font-bold text-green-600 block">{stats.nuevos}</span>
                                <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">A Cargar</span>
                            </div>
                        </div>

                        {/* 3. Preview de Datos (Tabla) */}
                        {movimientosPreview.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 font-semibold text-sm text-gray-700">
                                    Previsualización de Datos Extraídos
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Referencia</th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Moneda</th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                            {movimientosPreview.map((mov, idx) => (
                                                <tr key={idx} className={mov.es_duplicado ? "bg-orange-50 text-gray-500" : "hover:bg-gray-50"}>
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        {mov.es_duplicado ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                Duplicado
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                Nuevo
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{mov.fecha}</td>
                                                    <td className="px-4 py-2">{mov.descripcion}</td>
                                                    <td className="px-4 py-2 font-mono text-xs text-center">{mov.referencia || '-'}</td>
                                                    <td className="px-4 py-2 text-center text-xs font-medium text-gray-500">{mov.moneda}</td>
                                                    <td className={`px-4 py-2 text-right font-medium ${(() => {
                                                        const val = Number(mov.valor);
                                                        if (val > 0) return 'text-green-600';
                                                        if (val < 0) return 'text-red-600';
                                                        return 'text-blue-600';
                                                    })()
                                                        }`}>
                                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number(mov.valor))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Botón de Acción Final */}
                        <div className="flex justify-end gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <button
                                onClick={() => {
                                    setAnalyzed(false)
                                    setStats(null)
                                    setMovimientosPreview([])
                                    setFile(null)
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCargarDefinitivo}
                                disabled={!cuentaId || stats.nuevos === 0}
                                className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition flex items-center gap-2
                                    ${!cuentaId || stats.nuevos === 0
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                <UploadCloud size={18} />
                                {stats.nuevos > 0 ? `Cargar ${stats.nuevos} Registros` : 'Nada nuevo para cargar'}
                            </button>
                        </div>
                    </div>
                )}


                {/* Modal de Resultados Finales */}
                <Modal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    title={result ? `${result.nuevos_insertados} Registros Cargados` : "Resumen de Carga"}
                    size="md"
                    footer={
                        <Button onClick={handleCloseSuccessModal} className="w-full">
                            Entendido
                        </Button>
                    }
                >
                    {result && (
                        <div className="space-y-6 text-center py-4">
                            <div className="flex justify-center">
                                <div className="bg-green-100 p-4 rounded-full">
                                    <CheckCircle className="h-12 w-12 text-green-600" />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-1 text-center">
                                    {cuentaId} - {tipoCuenta}
                                </h4>
                                <p className="text-gray-500 text-center font-medium">
                                    {result.periodo || 'YYYY-MMM'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-left bg-gray-50 p-4 rounded-xl">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Leídos</p>
                                    <p className="text-2xl font-bold text-gray-900">{result.total_extraidos}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-blue-600 uppercase font-semibold">Nuevos Cargados</p>
                                    <p className="text-2xl font-bold text-blue-600">{result.nuevos_insertados}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-orange-600 uppercase font-semibold">Duplicados Ignorados</p>
                                    <p className="text-2xl font-bold text-orange-600">{result.duplicados}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-red-600 uppercase font-semibold">Errores</p>
                                    <p className="text-2xl font-bold text-red-600">{result.errores}</p>
                                </div>
                            </div>

                            {result.errores > 0 && (
                                <div className="bg-red-50 p-3 rounded-lg flex items-start gap-3 text-left">
                                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">
                                        Se encontraron errores en {result.errores} registros. Revisa los logs del servidor para más detalles o intenta corregir el archivo.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </Modal>

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

