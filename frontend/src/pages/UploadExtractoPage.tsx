import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import { UploadCloud, FileText, CheckCircle, AlertCircle, BarChart3, FolderOpen } from 'lucide-react'
import { Modal } from '../components/molecules/Modal'
import { Button } from '../components/atoms/Button'
import { ExtractoResumenCinta } from '../components/molecules/ExtractoResumenCinta'

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
    movimientos_count?: number
    total_leidos?: number
    total_duplicados?: number
    total_nuevos?: number
}

export const UploadExtractoPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null)
    const [tipoCuenta, setTipoCuenta] = useState('')
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [cuentas, setCuentas] = useState<Cuenta[]>([])

    // Status
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [analyzed, setAnalyzed] = useState(false)
    const [resumen, setResumen] = useState<ResumenExtracto | null>(null)

    // Local Files State
    const [localFilename, setLocalFilename] = useState<string | null>(null)
    const [showLocalModal, setShowLocalModal] = useState(false)
    const [localFiles, setLocalFiles] = useState<string[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)

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
            setLocalFilename(null)
            setResult(null)
            setError(null)
            setAnalyzed(false)
            setResumen(null)
            setShowSuccessModal(false)
        }
    }

    const handleOpenLocalPicker = async () => {
        setLoadingFiles(true)
        setShowLocalModal(true)
        try {
            const files = await apiService.archivos.listarDirectorios('extractos')
            setLocalFiles(files)
        } catch (err: any) {
            console.error(err)
            setError("Error al listar archivos del servidor")
        } finally {
            setLoadingFiles(false)
        }
    }

    const handleLocalFileSelect = async (filename: string) => {
        setShowLocalModal(false)
        setLocalFilename(filename)
        setFile(null)

        // Trigger analysis immediately
        await handleAnalizarLocal(filename)
    }

    const handleAnalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        setResult(null)
        setResumen(null)

        try {
            const data = await apiService.conciliacion.analizarExtracto(file, tipoCuenta, cuentaId)
            console.log("DEBUG: Datos recibidos de analizarExtracto (resumen):", data)
            setResumen(data)
            setAnalyzed(true)
        } catch (err: any) {
            setError(err.message || "Error al analizar archivo")
        } finally {
            setLoading(false)
        }
    }

    const handleAnalizarLocal = async (filename: string) => {
        setLoading(true)
        setError(null)
        setResult(null)
        setResumen(null)

        try {
            const data = await apiService.archivos.procesarLocal(
                filename,
                'extractos',
                tipoCuenta,
                cuentaId || undefined,
                false,
                undefined, undefined,
                'analizar'
            )
            console.log("DEBUG: Datos recibidos de analizarExtracto LOCAL (resumen):", data)
            setResumen(data)
            setAnalyzed(true)
        } catch (err: any) {
            setError(err.message || "Error al analizar archivo local")
        } finally {
            setLoading(false)
        }
    }

    const handleCargarDefinitivo = async () => {
        if ((!file && !localFilename) || !cuentaId || !resumen) return

        // Validación simple de que tenemos periodo
        if (!resumen.year || !resumen.month) {
            setError("No se pudo identificar el periodo (Año/Mes) en el extracto. No se puede cargar.")
            return
        }

        setLoading(true)
        try {
            let data;
            if (localFilename) {
                data = await apiService.archivos.procesarLocal(
                    localFilename,
                    'extractos',
                    tipoCuenta,
                    cuentaId,
                    false,
                    resumen.year,
                    resumen.month,
                    'cargar'
                )
            } else if (file) {
                data = await apiService.conciliacion.cargarExtracto(
                    file,
                    tipoCuenta,
                    cuentaId,
                    resumen.year,
                    resumen.month
                )
            }

            setResult(data)
            setShowSuccessModal(true) // Show modal on success
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

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false)
        setResult(null)
        setAnalyzed(false)
        setFile(null)
        setLocalFilename(null)
        setResumen(null)
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
                                    setLocalFilename(null)
                                    setAnalyzed(false)
                                    setResumen(null)
                                    setResult(null)
                                    setError(null)
                                    const cuenta = cuentas.find(c => c.id === id)
                                    if (cuenta) {
                                        // Usar el nombre de cuenta directamente como tipo_cuenta
                                        setTipoCuenta(cuenta.nombre)
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
                                {file ? file.name : localFilename ? `(Servidor) ${localFilename}` : "Seleccionar extracto PDF"}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Haz clic para buscar"}
                            </span>
                        </label>
                    </div>

                    <div className="text-center">
                        <span className="text-sm text-gray-500">¿El archivo está en el servidor?</span>
                        <button
                            type="button"
                            onClick={handleOpenLocalPicker}
                            className="ml-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline inline-flex items-center gap-1"
                        >
                            <FolderOpen size={14} />
                            Explorar Carpeta Predeterminada
                        </button>
                    </div>

                    {!analyzed && !result && (
                        <button
                            type="submit"
                            disabled={loading || (!file && !localFilename)}
                            className={`w-full py-3 px-4 rounded-lg font-medium text-white shadow-sm transition-colors
                                ${loading || (!file && !localFilename)
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
                            {resumen.total_leidos !== undefined && (
                                <ExtractoResumenCinta
                                    totalLeidos={resumen.total_leidos}
                                    totalDuplicados={resumen.total_duplicados || 0}
                                    totalNuevos={resumen.total_nuevos || 0}
                                />
                            )}

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

                            {/* Validación eliminada - el usuario revisa visualmente los valores */}

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
                                    setLocalFilename(null)
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCargarDefinitivo}
                                disabled={!cuentaId || !resumen.year || resumen.total_nuevos === 0}
                                className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition flex items-center gap-2
                                    ${!cuentaId || !resumen.year || resumen.total_nuevos === 0
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

                {/* Modal de Selección de Archivo Local */}
                <Modal
                    isOpen={showLocalModal}
                    onClose={() => setShowLocalModal(false)}
                    title="Seleccionar Extracto del Servidor"
                    size="md"
                    footer={
                        <Button variant="secondary" onClick={() => setShowLocalModal(false)}>
                            Cancelar
                        </Button>
                    }
                >
                    <div className="space-y-4 max-h-96 overflow-y-auto p-2">
                        {loadingFiles ? (
                            <div className="text-center py-4 text-gray-500">Cargando archivos...</div>
                        ) : localFiles.length === 0 ? (
                            <div className="text-center py-4 text-gray-500">No se encontraron archivos PDF en el directorio configurado.</div>
                        ) : (
                            <div className="grid gap-2">
                                {localFiles.map(f => (
                                    <button
                                        key={f}
                                        onClick={() => handleLocalFileSelect(f)}
                                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left group"
                                    >
                                        <FileText className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                                        <span className="text-gray-700 font-medium group-hover:text-blue-700">{f}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-xs text-gray-400 text-center mt-4">
                            Directorio: {`Extractos`}
                        </p>
                    </div>
                </Modal>

                {/* Modal de Resultados Finales */}
                <Modal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    title={
                        result?.conciliacion
                            ? `Extracto Cargado: ${tipoCuenta} - ${result.conciliacion.year} - ${["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][result.conciliacion.month] || result.conciliacion.month}`
                            : "Resumen de Carga"
                    }
                    size="xl"
                    footer={
                        <Button onClick={handleCloseSuccessModal} className="w-full">
                            Entendido
                        </Button>
                    }
                >
                    {result && result.conciliacion && (
                        <div className="space-y-6 text-center py-4">
                            <div className="flex justify-center">
                                <div className="bg-green-100 p-4 rounded-full">
                                    <CheckCircle className="h-12 w-12 text-green-600" />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xl font-bold text-gray-900 mb-2">¡Carga Completada!</h4>
                                <p className="text-gray-500 mb-2">El extracto se ha procesado exitosamente.</p>

                                <p className="text-lg font-medium text-blue-900 mb-4">{cuentaId} - {tipoCuenta}</p>

                                {/* Mostrar Periodo Explícitamente */}
                                <div className="inline-block bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                    <span className="text-blue-800 font-medium">
                                        Periodo: <strong>{result.conciliacion.periodo_texto || `${["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"][result.conciliacion.month] || result.conciliacion.month} ${result.conciliacion.year}`}</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Mostrar estadísticas en el modal de éxito usando el mismo componente (Atomic Design) */}
                            {resumen && result.movimientos_count !== undefined && (
                                <ExtractoResumenCinta
                                    totalLeidos={resumen.total_leidos || 0}
                                    totalDuplicados={resumen.total_duplicados || 0}
                                    totalNuevos={result.movimientos_count}
                                    labelNuevos="CARGADOS"
                                />
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left bg-gray-50 p-6 rounded-xl">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Saldo Anterior</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(result.conciliacion.extracto_saldo_anterior)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-green-600 uppercase font-semibold">Entradas</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(result.conciliacion.extracto_entradas)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-red-600 uppercase font-semibold">Salidas</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(result.conciliacion.extracto_salidas)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-blue-600 uppercase font-semibold">Saldo Final</p>
                                    <p className="text-lg font-bold text-blue-600">{formatCurrency(result.conciliacion.extracto_saldo_final)}</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg text-left">
                                <p className="text-sm text-gray-600">Sistema actualizado</p>
                                <p className="text-xl font-bold text-blue-700">{formatCurrency(result.conciliacion.sistema_saldo_final)}</p>
                            </div>
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
