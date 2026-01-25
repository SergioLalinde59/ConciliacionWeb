import React, { useState, useEffect, useRef } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import { UploadCloud, FileText, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react'
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

    // Local Files State
    const [localFilename, setLocalFilename] = useState<string | null>(null)
    const [showLocalModal, setShowLocalModal] = useState(false)
    const [localFiles, setLocalFiles] = useState<string[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)

    // Modal Success State
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    // Ref for file input
    const fileInputRef = useRef<HTMLInputElement>(null)

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
            setShowSuccessModal(false)
        }
    }

    const handleOpenLocalPicker = async () => {
        setLoadingFiles(true)
        setShowLocalModal(true)
        try {
            const files = await apiService.archivos.listarDirectorios('movimientos')
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
        if (fileInputRef.current) fileInputRef.current.value = ''

        // Trigger analysis immediately
        await handleAnalizarLocal(filename)
    }

    // State for analysis mode
    const [analyzed, setAnalyzed] = useState(false)
    const [stats, setStats] = useState<{ leidos: number, duplicados: number, nuevos: number, actualizables?: number } | null>(null)
    const [movimientosPreview, setMovimientosPreview] = useState<any[]>([])
    const [updateExisting, setUpdateExisting] = useState(false)

    const handleAnalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        setResult(null)
        setStats(null)
        setMovimientosPreview([])
        setUpdateExisting(true)

        try {
            const data = await apiService.archivos.analizar(file, tipoCuenta, cuentaId || undefined)
            setStats(data.estadisticas)
            setMovimientosPreview(data.movimientos)
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
        setStats(null)
        setMovimientosPreview([])
        setUpdateExisting(true)

        try {
            const data = await apiService.archivos.procesarLocal(
                filename,
                'movimientos',
                tipoCuenta,
                cuentaId || undefined,
                false,
                undefined, undefined,
                'analizar'
            )
            setStats(data.estadisticas)
            setMovimientosPreview(data.movimientos)
            setAnalyzed(true)
        } catch (err: any) {
            setError(err.message || "Error al analizar archivo local")
        } finally {
            setLoading(false)
        }
    }

    const handleCargarDefinitivo = async () => {
        if ((!file && !localFilename) || !cuentaId) return

        setLoading(true)
        try {
            let data;
            if (localFilename) {
                data = await apiService.archivos.procesarLocal(
                    localFilename,
                    'movimientos',
                    tipoCuenta,
                    cuentaId,
                    updateExisting,
                    undefined, undefined,
                    'cargar'
                )
            } else if (file) {
                data = await apiService.archivos.cargar(file, tipoCuenta, cuentaId, updateExisting)
            }

            setResult(data)
            setShowSuccessModal(true)
            setAnalyzed(false)
            setFile(null)
            setLocalFilename(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
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
        setUpdateExisting(false)
    }, [file, tipoCuenta])

    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false)
        setResult(null)
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <UploadCloud className="h-8 w-8 text-blue-600" />
                Cargar Movimientos Bancarios
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">

                {/* 1. Selección */}
                <form onSubmit={handleAnalizar} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Cuenta Asociada</label>
                            <select
                                value={cuentaId || ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value)
                                    setCuentaId(id)
                                    setFile(null)
                                    setLocalFilename(null)
                                    if (fileInputRef.current) fileInputRef.current.value = ''
                                    setAnalyzed(false)
                                    setStats(null)
                                    setMovimientosPreview([])
                                    setResult(null)
                                    setError(null)
                                    const cuenta = cuentas.find(c => c.id === id)
                                    if (cuenta) {
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

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                        <input
                            type="file"
                            id="file-upload"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                            <FileText className={`h-12 w-12 mb-2 ${file ? 'text-blue-500' : 'text-gray-400'}`} />
                            <span className="text-lg font-medium text-gray-700">
                                {file ? file.name : localFilename ? `(Servidor) ${localFilename}` : "Seleccionar archivo PDF"}
                            </span>
                            <span className="text-sm text-gray-500 mt-1">
                                {file ? `${(file.size / 1024).toFixed(1)} KB` : "Haz clic para buscar en tu equipo"}
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
                            {loading ? 'Analizando...' : 'Analizar Archivo'}
                        </button>
                    )}
                </form>

                {/* 2. Estadísticas de Validación */}
                {stats && analyzed && (
                    <div className="animate-fade-in space-y-6">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                                <span className="text-3xl font-bold text-blue-600 block">{stats.leidos}</span>
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registros Leídos</span>
                            </div>
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 text-center">
                                <span className="text-3xl font-bold text-orange-600 block">{stats.duplicados}</span>
                                <span className="text-xs font-semibold text-orange-800 uppercase tracking-wide">Duplicados</span>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-center">
                                <span className="text-3xl font-bold text-blue-600 block">{stats.actualizables || 0}</span>
                                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Actualizables</span>
                            </div>
                            <div className="bg-green-50 p-4 rounded-xl border border-green-200 text-center">
                                <span className="text-3xl font-bold text-green-600 block">{stats.nuevos}</span>
                                <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">A Cargar</span>
                            </div>
                        </div>

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
                                                <tr key={idx} className={mov.es_duplicado ? "bg-orange-50 text-gray-500" : mov.es_actualizable ? "bg-blue-50 text-gray-700" : "hover:bg-gray-50"}>
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        {mov.es_duplicado ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                Duplicado
                                                            </span>
                                                        ) : mov.es_actualizable ? (
                                                            <div className="flex flex-col gap-1">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                    Actualizable
                                                                </span>
                                                                {mov.descripcion_actual && (
                                                                    <span className="text-xs text-blue-600" title={mov.descripcion_actual}>
                                                                        (Exist: {mov.descripcion_actual.substring(0, 15)}...)
                                                                    </span>
                                                                )}
                                                            </div>
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

                        <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            {(stats.actualizables || 0) > 0 && (
                                <div className="flex items-center gap-2 mb-2 p-2 bg-blue-50 rounded border border-blue-100">
                                    <input
                                        type="checkbox"
                                        id="updateExisting"
                                        checked={updateExisting}
                                        onChange={(e) => setUpdateExisting(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="updateExisting" className="text-sm font-medium text-blue-900 cursor-pointer">
                                        Actualizar descripción de {stats.actualizables} registros existentes (Misma Fecha y Valor)
                                        <span className="block text-xs font-normal text-blue-700">
                                            Si se desmarca, se crearán como nuevos registros.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => {
                                        setAnalyzed(false)
                                        setStats(null)
                                        setMovimientosPreview([])
                                        setFile(null)
                                        setLocalFilename(null)
                                        setCuentaId(null)
                                        setTipoCuenta('')
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = ''
                                        }
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCargarDefinitivo}
                                    disabled={!cuentaId || (stats.nuevos + (stats.actualizables || 0)) === 0}
                                    className={`px-6 py-2 rounded-lg font-bold text-white shadow-sm transition flex items-center gap-2
                                        ${!cuentaId || (stats.nuevos + (stats.actualizables || 0)) === 0
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                >
                                    <UploadCloud size={18} />
                                    {(stats.nuevos + (stats.actualizables || 0)) > 0 ? `Cargar/Actualizar ${stats.nuevos + (stats.actualizables || 0)} Registros` : 'Nada nuevo para cargar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Modal
                    isOpen={showLocalModal}
                    onClose={() => setShowLocalModal(false)}
                    title="Seleccionar Archivo del Servidor"
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
                            Directorio: {`MovimientosPendientes`}
                        </p>
                    </div>
                </Modal>

                <Modal
                    isOpen={showSuccessModal}
                    onClose={handleCloseSuccessModal}
                    title="Resultado de la Carga"
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
                                    <p className="text-xs text-indigo-600 uppercase font-semibold">Desc. Actualizadas</p>
                                    <p className="text-2xl font-bold text-indigo-600">{result.actualizados || 0}</p>
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
