import React, { useState, useEffect } from 'react'
import { apiService } from '../services/api'
import type { Cuenta } from '../types'
import { ExtractDetailsTable } from '../components/organisms/ExtractDetailsTable'
import type { ExtractDetailRow } from '../components/organisms/ExtractDetailsTable'
import { UploadCloud, FileText, CheckCircle, AlertCircle, BarChart3, FolderOpen, ChevronDown, ChevronUp, Edit2, RotateCcw, Info } from 'lucide-react'
import { Modal } from '../components/molecules/Modal'
import { Button } from '../components/atoms/Button'
import { ExtractoResumenCinta } from '../components/molecules/ExtractoResumenCinta'
import { EditExtractMovementModal } from '../components/organisms/modals/EditExtractMovementModal'

interface ResumenExtracto {
    saldo_anterior: number
    entradas: number
    rendimientos?: number
    salidas: number
    retenciones?: number
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
    movimientos?: ExtractDetailRow[]
    validacion_cruzada?: {
        es_valido: boolean
        diferencia_entradas: number
        diferencia_salidas: number
        diferencia_rendimientos: number
        diferencia_retenciones: number
        movimientos_entradas: number
        movimientos_salidas: number
        movimientos_rendimientos: number
        movimientos_retenciones: number
    }
}

export const UploadExtractoPage: React.FC = () => {
    // --- State: File & Account ---
    const [file, setFile] = useState<File | null>(null)
    const [tipoCuenta, setTipoCuenta] = useState('')
    const [cuentaId, setCuentaId] = useState<number | null>(null)
    const [cuentas, setCuentas] = useState<Cuenta[]>([])
    const [localFilename, setLocalFilename] = useState<string | null>(null)

    // --- State: Analysis & Data ---
    const [loading, setLoading] = useState(false)
    const [analyzed, setAnalyzed] = useState(false)
    const [resumen, setResumen] = useState<ResumenExtracto | null>(null)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // --- State: Editing ---
    const [isEditing, setIsEditing] = useState(false)
    const [editedValues, setEditedValues] = useState<{
        saldo_anterior: number
        entradas: number
        rendimientos: number
        salidas: number
        retenciones: number
        saldo_final: number
    } | null>(null)

    const [showEditModal, setShowEditModal] = useState(false)
    const [editingMovement, setEditingMovement] = useState<{ record: ExtractDetailRow, index: number } | null>(null)
    const [showDetailsManually, setShowDetailsManually] = useState(false) // Toggle to show details even if valid

    // --- State: Modals ---
    const [showLocalModal, setShowLocalModal] = useState(false)
    const [localFiles, setLocalFiles] = useState<string[]>([])
    const [loadingFiles, setLoadingFiles] = useState(false)
    const [showSuccessModal, setShowSuccessModal] = useState(false)


    useEffect(() => {
        apiService.cuentas.listar()
            .then(setCuentas)
            .catch(err => console.error(err))
    }, [])

    // --- Handlers: File Selection ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            resetState()
            setFile(e.target.files[0])
        }
    }

    const resetState = () => {
        setFile(null)
        setLocalFilename(null)
        setResult(null)
        setError(null)
        setAnalyzed(false)
        setResumen(null)
        setShowSuccessModal(false)
        setShowDetailsManually(false)
        setIsEditing(false)
        setEditedValues(null)
    }

    const handleOpenLocalPicker = async () => {
        setLoadingFiles(true)
        setShowLocalModal(true)
        try {
            const files = await apiService.archivos.listarDirectorios('extractos')
            setLocalFiles(files)
        } catch (err: any) {
            setError("Error al listar archivos del servidor")
        } finally {
            setLoadingFiles(false)
        }
    }

    const handleLocalFileSelect = async (filename: string) => {
        setShowLocalModal(false)
        resetState()
        setLocalFilename(filename)
        // Trigger analysis immediately
        await processAnalysis(filename, true)
    }

    // --- Handlers: Analysis ---

    const handleAnalizar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return
        await processAnalysis(file, false)
    }

    const processAnalysis = async (fileOrName: File | string, isLocal: boolean) => {
        setLoading(true)
        setError(null)
        setAnalyzed(false)
        setResumen(null)

        try {
            let data;
            if (isLocal) {
                data = await apiService.archivos.procesarLocal(
                    fileOrName as string,
                    'extractos',
                    tipoCuenta,
                    cuentaId || undefined,
                    false,
                    undefined, undefined,
                    'analizar'
                )
            } else {
                data = await apiService.conciliacion.analizarExtracto(fileOrName as File, tipoCuenta, cuentaId)
            }
            console.log("DEBUG: Resumen recibido:", data)
            setResumen(data)
            setAnalyzed(true)

            // Auto open details if invalid
            if (data.validacion_cruzada && !data.validacion_cruzada.es_valido) {
                setShowDetailsManually(true)
            }

        } catch (err: any) {
            setError(err.message || "Error al analizar archivo")
        } finally {
            setLoading(false)
        }
    }

    // --- Handlers: Editing Global Totals (Legacy/Manual Override) ---
    const startEditingTotals = () => {
        if (resumen) {
            setEditedValues({
                saldo_anterior: resumen.saldo_anterior,
                entradas: resumen.entradas,
                rendimientos: resumen.rendimientos || 0,
                salidas: resumen.salidas,
                retenciones: resumen.retenciones || 0,
                saldo_final: resumen.saldo_final
            })
            setIsEditing(true)
        }
    }

    const cancelEditingTotals = () => {
        setIsEditing(false)
        setEditedValues(null)
    }

    const handleTotalChange = (field: 'saldo_anterior' | 'entradas' | 'rendimientos' | 'salidas' | 'retenciones' | 'saldo_final', value: string) => {
        if (!editedValues) return
        const numVal = parseFloat(value)
        setEditedValues({
            ...editedValues,
            [field]: isNaN(numVal) ? 0 : numVal
        })
    }

    const autoAdjustToCalculated = () => {
        if (!resumen || !resumen.validacion_cruzada) return
        setEditedValues({
            saldo_anterior: resumen.saldo_anterior,
            entradas: resumen.validacion_cruzada.movimientos_entradas,
            rendimientos: 0,
            salidas: resumen.validacion_cruzada.movimientos_salidas,
            retenciones: 0,
            // Formula: Anterior + Entradas + Rendimientos - Salidas - Retenciones
            saldo_final: resumen.saldo_anterior + resumen.validacion_cruzada.movimientos_entradas - resumen.validacion_cruzada.movimientos_salidas
        })
        setIsEditing(true)
    }


    // --- Handlers: Editing Movements (Modal) ---

    const handleEditMovement = (record: ExtractDetailRow, index: number) => {
        setEditingMovement({ record, index })
        setShowEditModal(true)
    }

    const handleSaveMovement = (updatedRecord: ExtractDetailRow) => {
        if (!resumen || !resumen.movimientos || !editingMovement) return

        // Identificar el registro original para reemplazarlo.
        // Como no tenemos un ID único persistente en todos los casos antes de guardar,
        // usamos la combinación de raw_text y el índice original capturado al abrir el modal.
        // Pero mejor aún, buscamos el registro que sea idéntico al original 'editingMovement.record'.

        const newMovimientos = resumen.movimientos.map((m, idx) => {
            if (idx === editingMovement.index) {
                return updatedRecord
            }
            return m
        })

        // Update local state and Recalculate Totals
        const { entradas, salidas, rendimientos, retenciones } = calculateTotals(newMovimientos)

        setResumen(prev => {
            if (!prev) return null
            const updated = {
                ...prev,
                movimientos: newMovimientos,
                validacion_cruzada: prev.validacion_cruzada ? {
                    ...prev.validacion_cruzada,
                    movimientos_entradas: entradas,
                    movimientos_salidas: salidas,
                    movimientos_rendimientos: rendimientos,
                    movimientos_retenciones: retenciones,
                    diferencia_entradas: prev.entradas - entradas,
                    diferencia_salidas: prev.salidas - salidas,
                    diferencia_rendimientos: (prev.rendimientos || 0) - rendimientos,
                    diferencia_retenciones: (prev.retenciones || 0) - retenciones,
                    // Approx check for validity
                    es_valido:
                        Math.abs(prev.entradas - entradas) < 1.0 &&
                        Math.abs(prev.salidas - salidas) < 1.0 &&
                        Math.abs((prev.rendimientos || 0) - rendimientos) < 1.0 &&
                        Math.abs((prev.retenciones || 0) - retenciones) < 1.0
                } : undefined
            }
            return updated
        })
    }

    const calculateTotals = (movs: ExtractDetailRow[]) => {
        let entradas = 0
        let salidas = 0
        let rendimientos = 0
        let retenciones = 0

        movs.forEach(m => {
            const val = Number(m.valor)
            const desc = (m.descripcion || '').toUpperCase()

            // Categorization logic based on description keywords
            if (desc.includes('RETEFTE') || desc.includes('RTEFTE')) {
                retenciones += Math.abs(val)
            } else if (desc.includes('ADICION') || desc.includes('ABONO')) {
                entradas += val
            } else if (desc.includes('RETIRO') || desc.includes('DISPOSICION')) {
                salidas += Math.abs(val)
            } else if (desc.includes('REND') || desc.includes('VALOR')) {
                rendimientos += val
            } else {
                // Fallback to sign-based if no keyword matches
                if (val > 0) entradas += val
                else salidas += Math.abs(val)
            }
        })
        return { entradas, salidas, rendimientos, retenciones }
    }


    // --- Handlers: Confirmation ---

    const handleCargarDefinitivo = async () => {
        if (!cuentaId || !resumen || !resumen.year || !resumen.month) return

        setLoading(true)
        try {
            // Priority: Edited Totals > Resumen Totals
            const overrides = editedValues ? { ...editedValues } : undefined

            // We pass the CONFIRMED movements to the backend
            const movimientosConfirmados = resumen.movimientos

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
                    'cargar',
                    overrides,
                    movimientosConfirmados
                )
            } else if (file) {
                data = await apiService.conciliacion.cargarExtracto(
                    file,
                    tipoCuenta,
                    cuentaId,
                    resumen.year,
                    resumen.month,
                    overrides,
                    movimientosConfirmados
                )
            }

            setResult(data)
            setShowSuccessModal(true)
        } catch (err: any) {
            setError(err.message || "Error al cargar extracto")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val)


    // --- UI Helpers ---

    const displayValues = editedValues && isEditing ? editedValues : resumen

    // Check if we should block the upload (Descuadre > Logic)
    // We update logic to trust the USER if they are editing totals manually
    const hasDescuadre = !!(resumen && resumen.validacion_cruzada && !resumen.validacion_cruzada.es_valido)

    // If user is Manually Editing totals, we trust them (allow upload)
    // If not editing, we block if Descuadre exists
    // BUT we also have to check if the recalc matches the totals.
    const isDescuadreBlocking = hasDescuadre && !isEditing

    const canUpload = !!(cuentaId && resumen?.year && resumen?.month && !loading)

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
            {/* Header Compacto */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <UploadCloud className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-800 leading-tight">Cargar Extracto Bancario</h1>
                    <p className="text-xs text-gray-500">Suba el PDF, verifique las cifras y confirme la carga.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* 1. Selección de Archivo y Cuenta */}
                <div className="p-5 border-b border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-gray-50/50">
                    <div className="md:col-span-4">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cuenta</label>
                        <select
                            value={cuentaId || ''}
                            onChange={(e) => {
                                const id = Number(e.target.value)
                                setCuentaId(id)
                                resetState()
                                const cuenta = cuentas.find(c => c.id === id)
                                if (cuenta) setTipoCuenta(cuenta.nombre)
                            }}
                            className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            <option value="">Seleccione...</option>
                            {cuentas.filter(c => c.permite_conciliar).map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-6">
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Archivo PDF</label>
                        <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-sm text-gray-600 transition-colors">
                                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                                <div className="truncate flex items-center gap-2">
                                    {file ? <FileText size={16} className="text-blue-500" /> : <UploadCloud size={16} />}
                                    <span className="truncate max-w-[200px]">
                                        {file ? file.name : localFilename ? localFilename : "Seleccionar PDF..."}
                                    </span>
                                </div>
                            </label>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleOpenLocalPicker}
                                title="Buscar en Servidor"
                                icon={FolderOpen}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        {!analyzed && !result && (
                            <Button
                                onClick={handleAnalizar}
                                disabled={loading || (!file && !localFilename)}
                                className="w-full justify-center"
                                isLoading={loading}
                            >
                                Analizar
                            </Button>
                        )}
                        {analyzed && (
                            <Button
                                variant="secondary"
                                onClick={resetState}
                                className="w-full justify-center text-xs"
                            >
                                Reiniciar
                            </Button>
                        )}
                    </div>
                </div>

                {/* 2. Resultados del Análisis */}
                {resumen && displayValues && analyzed && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        {/* Cinta de Resumen (Totales) */}
                        <div className="p-4 bg-white">
                            {resumen.total_leidos !== undefined && (
                                <ExtractoResumenCinta
                                    totalLeidos={resumen.total_leidos}
                                    totalDuplicados={resumen.total_duplicados || 0}
                                    totalNuevos={resumen.total_nuevos || 0}
                                />
                            )}

                            {/* Panel de Validación Cruzada */}
                            <div className="mt-4 border rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <BarChart3 size={16} className="text-gray-500" />
                                        Validación de Cifras
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {!isEditing ? (
                                            <Button variant="ghost-warning" size="sm" onClick={startEditingTotals} className="h-6 text-xs px-2">
                                                <Edit2 size={12} className="mr-1" />
                                                Corregir Totales
                                            </Button>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={autoAdjustToCalculated} className="h-6 text-xs px-2">
                                                    <RotateCcw size={12} className="mr-1" />
                                                    Auto-Ajustar
                                                </Button>
                                                <Button variant="ghost-danger" size="sm" onClick={cancelEditingTotals} className="h-6 text-xs px-2">
                                                    Cancelar
                                                </Button>
                                            </div>
                                        )}
                                        {resumen.periodo_texto && (
                                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded uppercase">
                                                {resumen.periodo_texto}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 divide-x divide-gray-100 text-sm">
                                    {/* HEADERS */}
                                    <div className="px-2 py-0.5 bg-gray-50 font-bold text-[10px] text-gray-500 uppercase leading-tight">Concepto</div>
                                    <div className="px-2 py-0.5 bg-gray-50 font-bold text-[10px] text-gray-500 uppercase text-right leading-tight">Extracto (PDF)</div>
                                    <div className="px-2 py-0.5 bg-gray-50 font-bold text-[10px] text-gray-500 uppercase text-right leading-tight">Calculado (Sumatoria)</div>
                                    <div className="px-2 py-0.5 bg-gray-50 font-bold text-[10px] text-gray-500 uppercase text-right leading-tight">Diferencia</div>

                                    {/* 1. SALDO INICIAL */}
                                    <div className="px-2 py-0.5 border-t border-gray-100 font-medium leading-tight">Saldo Inicial</div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right font-mono leading-tight">
                                        <span className={`${resumen.saldo_anterior > 0 ? 'text-green-700' : (resumen.saldo_anterior < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                            {formatCurrency(resumen.saldo_anterior)}
                                        </span>
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-gray-400 italic leading-tight">-</div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-gray-400 italic leading-tight">-</div>

                                    {/* 2. ENTRADAS */}
                                    <div className="px-2 py-0.5 border-t border-gray-100 font-medium flex items-center gap-1.5 leading-tight">
                                        Entradas
                                        {tipoCuenta === 'FondoRenta' && (
                                            <div title="En Fondo Renta, las Entradas corresponden a las 'Adiciones' del extracto." className="cursor-help text-blue-400">
                                                <Info size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editedValues?.entradas}
                                                onChange={e => handleTotalChange('entradas', e.target.value)}
                                                className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none p-0 text-sm"
                                            />
                                        ) : (
                                            <span className={`font-mono ${resumen.entradas > 0 ? 'text-green-700' : (resumen.entradas < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                {formatCurrency(resumen.entradas)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-blue-600 font-medium font-mono leading-tight">
                                        {formatCurrency(resumen.validacion_cruzada?.movimientos_entradas || 0)}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                        {(() => {
                                            const val = (isEditing && editedValues ? editedValues.entradas : resumen.entradas)
                                            const diff = val - (resumen.validacion_cruzada?.movimientos_entradas || 0)
                                            return (
                                                <span className={`font-bold font-mono ${Math.abs(diff) > 1.0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(diff)}
                                                </span>
                                            )
                                        })()}
                                    </div>

                                    {/* 3. RENDIMIENTOS (Only FondoRenta) */}
                                    {tipoCuenta === 'FondoRenta' && (
                                        <>
                                            <div className="px-2 py-0.5 border-t border-gray-100 font-medium leading-tight">Rendimientos</div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editedValues?.rendimientos}
                                                        onChange={e => handleTotalChange('rendimientos', e.target.value)}
                                                        className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none p-0 text-sm"
                                                    />
                                                ) : (
                                                    <span className={`font-mono ${(resumen.rendimientos || 0) > 0 ? 'text-green-700' : ((resumen.rendimientos || 0) < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                        {formatCurrency(resumen.rendimientos || 0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right text-blue-600 font-medium font-mono leading-tight">
                                                {formatCurrency(resumen.validacion_cruzada?.movimientos_rendimientos || 0)}
                                            </div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                                {(() => {
                                                    const val = (isEditing && editedValues ? editedValues.rendimientos : (resumen.rendimientos || 0))
                                                    const diff = val - (resumen.validacion_cruzada?.movimientos_rendimientos || 0)
                                                    return (
                                                        <span className={`font-bold font-mono ${Math.abs(diff) > 1.0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(diff)}
                                                        </span>
                                                    )
                                                })()}
                                            </div>
                                        </>
                                    )}

                                    {/* 4. SALIDAS */}
                                    <div className="px-2 py-0.5 border-t border-gray-100 font-medium flex items-center gap-1.5 leading-tight">
                                        Salidas
                                        {tipoCuenta === 'FondoRenta' && (
                                            <div title="En Fondo Renta, las Salidas corresponden a los 'Retiros' del extracto." className="cursor-help text-blue-400">
                                                <Info size={12} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editedValues?.salidas}
                                                onChange={e => handleTotalChange('salidas', e.target.value)}
                                                className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none p-0 text-sm"
                                            />
                                        ) : (
                                            <span className={`font-mono ${resumen.salidas > 0 ? 'text-green-700' : (resumen.salidas < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                {formatCurrency(resumen.salidas)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-blue-600 font-medium font-mono leading-tight">
                                        {formatCurrency(resumen.validacion_cruzada?.movimientos_salidas || 0)}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                        {(() => {
                                            const val = (isEditing && editedValues ? editedValues.salidas : resumen.salidas)
                                            const diff = val - (resumen.validacion_cruzada?.movimientos_salidas || 0)
                                            return (
                                                <span className={`font-bold font-mono ${Math.abs(diff) > 1.0 ? 'text-red-600' : 'text-green-600'}`}>
                                                    {formatCurrency(diff)}
                                                </span>
                                            )
                                        })()}
                                    </div>

                                    {/* 5. RETENCIONES (Only FondoRenta) */}
                                    {tipoCuenta === 'FondoRenta' && (
                                        <>
                                            <div className="px-2 py-0.5 border-t border-gray-100 font-medium leading-tight">Retenciones</div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        value={editedValues?.retenciones}
                                                        onChange={e => handleTotalChange('retenciones', e.target.value)}
                                                        className="w-full text-right border-b border-gray-300 focus:border-blue-500 outline-none p-0 text-sm"
                                                    />
                                                ) : (
                                                    <span className={`font-mono ${(resumen.retenciones || 0) > 0 ? 'text-green-700' : ((resumen.retenciones || 0) < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                        {formatCurrency(resumen.retenciones || 0)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right text-blue-600 font-medium font-mono leading-tight">
                                                {formatCurrency(resumen.validacion_cruzada?.movimientos_retenciones || 0)}
                                            </div>
                                            <div className="px-2 py-0.5 border-t border-gray-100 text-right leading-tight">
                                                {(() => {
                                                    const val = (isEditing && editedValues ? editedValues.retenciones : (resumen.retenciones || 0))
                                                    const diff = val - (resumen.validacion_cruzada?.movimientos_retenciones || 0)
                                                    return (
                                                        <span className={`font-bold font-mono ${Math.abs(diff) > 1.0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(diff)}
                                                        </span>
                                                    )
                                                })()}
                                            </div>
                                        </>
                                    )}

                                    {/* 6. SALDO FINAL */}
                                    <div className="px-2 py-0.5 border-t border-gray-100 font-medium leading-tight">Saldo Final</div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right font-bold font-mono leading-tight">
                                        {isEditing ? (
                                            <span className={`${((editedValues?.saldo_anterior || 0) + (editedValues?.entradas || 0) + (editedValues?.rendimientos || 0) - (editedValues?.salidas || 0) - (editedValues?.retenciones || 0)) > 0 ? 'text-green-700' : (((editedValues?.saldo_anterior || 0) + (editedValues?.entradas || 0) + (editedValues?.rendimientos || 0) - (editedValues?.salidas || 0) - (editedValues?.retenciones || 0)) < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                {formatCurrency(
                                                    (editedValues?.saldo_anterior || 0) +
                                                    (editedValues?.entradas || 0) +
                                                    (editedValues?.rendimientos || 0) -
                                                    (editedValues?.salidas || 0) -
                                                    (editedValues?.retenciones || 0)
                                                )}
                                            </span>
                                        ) : (
                                            <span className={`${resumen.saldo_final > 0 ? 'text-green-700' : (resumen.saldo_final < 0 ? 'text-red-700' : 'text-gray-800')}`}>
                                                {formatCurrency(resumen.saldo_final)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-gray-400 italic leading-tight">-</div>
                                    <div className="px-2 py-0.5 border-t border-gray-100 text-right text-gray-400 italic leading-tight">-</div>
                                </div>
                            </div>

                            {/* Alertas y Botones */}
                            {/* Botones de Acción */}
                            <div className="mt-4 flex justify-end items-center gap-3">
                                <button
                                    onClick={() => setShowDetailsManually(!showDetailsManually)}
                                    className="text-gray-500 hover:text-blue-600 text-sm font-medium flex items-center gap-1 transition-colors px-2"
                                >
                                    {showDetailsManually ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    {showDetailsManually ? 'Ocultar Detalle' : 'Ver Detalle'}
                                </button>

                                <Button
                                    onClick={handleCargarDefinitivo}
                                    disabled={loading || !canUpload || isDescuadreBlocking}
                                    className={`px-6 ${(!canUpload || isDescuadreBlocking) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'}`}
                                >
                                    <UploadCloud size={18} className="mr-2" />
                                    Confirmar y Cargar
                                </Button>
                            </div>
                        </div>

                        {/* 3. Tabla de Detalles (Condicional) */}
                        {(hasDescuadre || showDetailsManually) && resumen.movimientos && (
                            <div className="border-t border-gray-200 bg-gray-50/50 p-4 animate-in slide-in-from-top-2">
                                <ExtractDetailsTable
                                    records={resumen.movimientos}
                                    onEdit={handleEditMovement}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Error Global */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle size={20} />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            {/* Modals */}
            <EditExtractMovementModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                movimiento={editingMovement?.record}
                onSave={handleSaveMovement}
            />

            <Modal
                isOpen={showLocalModal}
                onClose={() => setShowLocalModal(false)}
                title="Archivos en Servidor"
                size="md"
            >
                <div className="p-2 space-y-1">
                    {loadingFiles && <p className="text-gray-500 text-center py-4">Cargando...</p>}
                    {!loadingFiles && localFiles.length === 0 && <p className="text-gray-500 text-center py-4">No hay archivos.</p>}
                    {localFiles.map(f => (
                        <button
                            key={f}
                            onClick={() => handleLocalFileSelect(f)}
                            className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm text-gray-700 flex items-center gap-2 group"
                        >
                            <FileText size={14} className="text-gray-400 group-hover:text-blue-500" />
                            {f}
                        </button>
                    ))}
                </div>
            </Modal>

            <Modal
                isOpen={showSuccessModal}
                onClose={() => { setShowSuccessModal(false); resetState() }}
                title="Carga Exitosa"
                size="md"
            >
                <div className="text-center py-4 space-y-4">
                    <div className="bg-green-100 p-3 rounded-full inline-block">
                        <CheckCircle className="text-green-600 w-10 h-10" />
                    </div>

                    <div className="space-y-0.5">
                        <h3 className="text-xl font-bold text-gray-800">
                            {cuentaId ? cuentas.find(c => c.id === cuentaId)?.nombre : 'Cuenta'}
                        </h3>
                        <p className="text-gray-500 font-semibold uppercase tracking-tighter text-sm">
                            {result?.periodo || 'Periodo Procesado'}
                        </p>
                    </div>

                    {/* Dashboard de Stats (Img2 Style) */}
                    <div className="bg-gray-50 rounded-2xl p-6 grid grid-cols-2 gap-y-6 gap-x-4 border border-gray-100 shadow-inner mt-2">
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Leídos</span>
                            <span className="text-3xl font-black text-gray-800 tabular-nums leading-none">
                                {result?.stats?.leidos || 0}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Nuevos Cargados</span>
                            <span className="text-3xl font-black text-blue-600 tabular-nums leading-none">
                                {result?.stats?.nuevos || 0}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Duplicados Ignorados</span>
                            <span className="text-3xl font-black text-orange-600 tabular-nums leading-none">
                                {result?.stats?.duplicados || 0}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Errores</span>
                            <span className="text-3xl font-black text-red-600 tabular-nums leading-none">
                                {result?.stats?.errores || 0}
                            </span>
                        </div>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={() => { setShowSuccessModal(false); resetState() }}
                            className="w-full justify-center h-11 text-base font-bold shadow-md bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                        >
                            Entendido
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
