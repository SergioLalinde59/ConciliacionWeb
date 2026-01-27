import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { adminService } from '../services/admin.service'
import {
    Database,
    Download,
    Upload,
    History,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    FileText,
    Shield,
    Settings,
    HardDrive
} from 'lucide-react'
import { toast } from 'react-hot-toast'

const TABLES_CONFIG = {
    maestros: {
        label: 'Maestros',
        icon: Shield,
        description: 'Gestión de tablas maestras del sistema (Cuentas, Terceros, CC, etc.)',
        tables: [
            { id: 'cuentas', label: 'Cuentas', description: 'Cuentas bancarias configuradas.' },
            { id: 'monedas', label: 'Monedas', description: 'Monedas y tasas de cambio.' },
            { id: 'tipomov', label: 'Tipos de Movimiento', description: 'Categorización contable de movimientos.' },
            { id: 'terceros', label: 'Terceros', description: 'Clientes, proveedores y entidades.' },
            { id: 'tercero_descripciones', label: 'Alias Terceros', description: 'Mapeo de descripciones de extracto a terceros.' },
            { id: 'centro_costos', label: 'Centros de Costos', description: 'Estructura organizacional de costos.' },
            { id: 'conceptos', label: 'Conceptos', description: 'Conceptos de gasto o ingreso.' },
        ]
    },
    configuracion: {
        label: 'Configuración',
        icon: Settings,
        description: 'Parámetros del motor de matching y reglas automáticas',
        tables: [
            { id: 'config_filtros_centro_costos', label: 'Filtros de Exclusión CC', description: 'Filtros aplicados por centro de costo.' },
            { id: 'config_valores_pendientes', label: 'Config. Valores Pendientes', description: 'Configuración para ignorar valores pendientes.' },
            { id: 'reglas_clasificacion', label: 'Reglas de Clasificación', description: 'Reglas para auto-clasificar registros contables.' },
            { id: 'matching_alias', label: 'Reglas Normalización', description: 'Alias para limpiar descripciones de extractos.' },
            { id: 'cuenta_extractores', label: 'Config. Extractores', description: 'Mapeo de formatos de archivo por cuenta.' },
            { id: 'configuracion_matching', label: 'Parámetros Matching', description: 'Pesos y tolerancias del algoritmo.' },
        ]
    },
    backups: { // El ID en la URL sigue siendo 'backups' por consistencia con el Sidebar, pero mostramos 'Datos'
        label: 'Datos',
        icon: Database,
        description: 'Resúmenes de conciliación y movimientos procesados',
        tables: [
            { id: 'conciliaciones', label: 'Conciliaciones', description: 'Resúmenes de periodos y estados de cuadre.' },
            { id: 'movimientos_encabezado', label: 'Movimientos (Encabezado)', description: 'Datos básicos de registros contables.' },
            { id: 'movimientos_detalle', label: 'Movimientos (Detalle)', description: 'Clasificaciones y valores del sistema.' },
            { id: 'movimientos_extracto', label: 'Movimientos del Extracto', description: 'Datos cargados desde los bancos.' },
            { id: 'movimiento_vinculaciones', label: 'Vinculaciones (Matches)', description: 'Links entre extracto y sistema.' },
        ]
    },
    sistema: {
        label: 'Sistema Completo',
        icon: HardDrive,
        description: 'Operaciones de Respaldo y Restauración de toda la Base de Datos',
        tables: [] as { id: string; label: string; description: string }[]
    }
}

// Llenar "sistema" con todas las tablas
TABLES_CONFIG.sistema.tables = [
    ...TABLES_CONFIG.maestros.tables,
    ...TABLES_CONFIG.configuracion.tables,
    ...TABLES_CONFIG.backups.tables
]

export const CentroControlDatosPage: React.FC = () => {
    const { categoria } = useParams<{ categoria: string }>()
    const activeCategory = (categoria && TABLES_CONFIG[categoria as keyof typeof TABLES_CONFIG])
        ? (categoria as keyof typeof TABLES_CONFIG)
        : 'backups'

    const config = TABLES_CONFIG[activeCategory]
    const IconPrincipal = config.icon
    const isSystem = activeCategory === 'sistema'

    const [snapshots, setSnapshots] = useState<any[]>([])
    const [importing, setImporting] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState<{ table: string | 'category' | 'full'; file: File; isBulk?: boolean } | null>(null)

    const cargarSnapshots = async () => {
        try {
            const data = await adminService.listSnapshots()
            setSnapshots(data.sort((a: any, b: any) => b.date.localeCompare(a.date)))
        } catch (err) {
            console.error("Error cargando snapshots", err)
        }
    }

    useEffect(() => {
        cargarSnapshots()
    }, [])

    const handleExport = (tableName: string) => {
        toast.promise(
            Promise.resolve(adminService.exportTable(tableName)),
            {
                loading: `Generando backup de ${tableName}...`,
                success: `Backup de ${tableName} iniciado.`,
                error: 'Error al generar backup'
            }
        )
        setTimeout(cargarSnapshots, 2000)
    }

    const handleBulkExport = async (all = false) => {
        const tables = all
            ? TABLES_CONFIG.sistema.tables.map(t => t.id)
            : config.tables.map(t => t.id)

        const label = all ? 'Sistema Completo' : config.label

        toast.promise(
            (async () => {
                const blob = await adminService.bulkExport(tables)
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `backup_${label.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().split('T')[0]}.zip`
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
            })(),
            {
                loading: `Generando backup masivo de ${label}...`,
                success: `Backup de ${label} descargado.`,
                error: 'Error en el backup masivo'
            }
        )
        setTimeout(cargarSnapshots, 2000)
    }

    const handleFileSelect = (target: string | 'category' | 'full', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setShowConfirm({ table: target, file, isBulk: target === 'category' || target === 'full' })
        e.target.value = ''
    }

    const ejecutarImportacion = async () => {
        if (!showConfirm) return

        const { table, file, isBulk } = showConfirm
        setImporting(table)
        setShowConfirm(null)

        try {
            if (isBulk) {
                const result = await adminService.bulkImport(file)
                toast.success(result.mensaje)
            } else {
                const result = await adminService.importTable(table, file)
                toast.success(result.mensaje)
            }
            cargarSnapshots()
        } catch (err: any) {
            console.error("Error en importación", err)
            toast.error(err.response?.data?.detail || "Error fatal en la restauración")
        } finally {
            setImporting(null)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-sm border ${isSystem ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'}`}>
                        <IconPrincipal className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            Mantenimiento: {config.label}
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">{config.description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={cargarSnapshots}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors bg-white rounded-lg border shadow-sm"
                        title="Actualizar lista de archivos"
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Sección de Tablas */}
                <div className="lg:col-span-2 flex flex-col gap-4 overflow-auto pr-2 pb-8">

                    {/* Toolbar de Operaciones */}
                    <div className={`${isSystem ? 'bg-indigo-50 border-indigo-200' : 'bg-white'} p-4 rounded-xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 mb-2`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-8 rounded-full ${isSystem ? 'bg-indigo-600' : 'bg-slate-600'}`} />
                            <h2 className={`font-bold ${isSystem ? 'text-indigo-900' : 'text-gray-800'}`}>
                                {isSystem ? 'Operaciones Globales del Sistema' : `Operaciones de ${config.label}`}
                            </h2>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleBulkExport(isSystem)}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all ${isSystem
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                                    : 'bg-slate-800 text-white hover:bg-slate-900'
                                    }`}
                            >
                                <Download size={16} /> {isSystem ? 'Backup Completo' : 'Backup Categoría'}
                            </button>
                            <label className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm cursor-pointer transition-all ${isSystem
                                ? 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
                                : 'bg-amber-500 text-white hover:bg-amber-600'
                                }`}>
                                <Upload size={16} /> {isSystem ? 'Restaurar Sistema' : 'Restau. Categoría'}
                                <input type="file" accept=".zip" className="hidden" onChange={(e) => handleFileSelect(isSystem ? 'full' : 'category', e)} />
                            </label>
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3 mb-2">
                        <AlertTriangle className="text-red-600 h-6 w-6 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-red-900">Advertencia Crítica</h3>
                            <p className="text-xs text-red-800 mt-1">
                                Las operaciones de restauración **eliminan todos los datos actuales** de las tablas correspondientes antes de insertar los nuevos. Asegúrese de tener un backup reciente.
                            </p>
                        </div>
                    </div>

                    {!isSystem && (
                        <div className="grid grid-cols-1 gap-3">
                            {config.tables.map(table => (
                                <div key={table.id} className="bg-white rounded-lg shadow-sm border p-4 flex justify-between items-center hover:shadow-md transition-shadow group">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-indigo-50 transition-colors text-gray-400 group-hover:text-indigo-600">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-800">
                                                {table.label}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{table.description}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleExport(table.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 text-indigo-700 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                                            title="Descargar Backup Individual"
                                        >
                                            <Download size={14} /> Backup
                                        </button>

                                        <label className={`flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${importing === table.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <Upload size={14} />
                                            {importing === table.id ? 'Importando...' : 'Restaurar'}
                                            <input
                                                type="file"
                                                accept=".csv"
                                                className="hidden"
                                                onChange={(e) => handleFileSelect(table.id, e)}
                                                disabled={!!importing}
                                            />
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Historial de Snapshots */}
                <div className="bg-white rounded-xl shadow-sm border flex flex-col overflow-hidden mb-8">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <History size={18} className="text-indigo-600" />
                            Historial en Servidor
                        </h3>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                            {snapshots.length} backups
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                        {snapshots.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-50/50 rounded-xl border-2 border-dashed border-gray-100">
                                <History size={48} className="opacity-10 mb-2" />
                                <p className="text-xs font-medium uppercase tracking-widest opacity-40">Sin archivos</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {snapshots.map((s, idx) => {
                                    const isBulk = s.name.includes('bulk_')
                                    const isRestore = s.name.includes('restore_')
                                    return (
                                        <div key={idx} className={`p-3 rounded-xl border transition-all hover:shadow-sm ${isRestore ? 'bg-red-50/20 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`font-mono text-[10px] font-bold ${isRestore ? 'text-red-700' : isBulk ? 'text-indigo-700' : 'text-gray-600'} truncate mr-2`} title={s.name}>
                                                    {s.name}
                                                </span>
                                                <span className="text-[9px] font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border">
                                                    {(s.size / 1024).toFixed(0)} KB
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-gray-500">{new Date(s.date).toLocaleString()}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${isRestore ? 'bg-red-100 text-red-700' : isBulk ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                                                    {isRestore ? 'Restaura' : isBulk ? 'Masivo' : 'Copia'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Confirmación Crítico */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border-none max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-red-600 p-6 text-white flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-full animate-pulse">
                                <AlertTriangle className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-xl">¿Confirmar Acción Crítica?</h3>
                                <p className="text-red-100 text-xs font-medium tracking-wide border-t border-white/20 mt-1 pt-1 opacity-80">ESTA OPERACIÓN ES IRREVERSIBLE</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-slate-500 text-sm font-medium">Se reemplazarán los datos de:</p>
                                    <p className="mt-1 font-black text-indigo-900 text-lg uppercase tracking-tight">
                                        {showConfirm.table === 'full' ? '⚡ TODA LA BASE DE DATOS' :
                                            showConfirm.table === 'category' ? `📁 CATEGORÍA: ${config.label}` :
                                                TABLES_CONFIG[activeCategory].tables.find(t => t.id === showConfirm.table)?.label}
                                    </p>
                                </div>
                                <div className="flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100 text-xs">
                                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
                                    <p className="font-medium leading-relaxed">
                                        Se recomienda encarecidamente que haya descargado un backup completo antes de proceder con una restauración masiva.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setShowConfirm(null)}
                                    className="flex-1 px-4 py-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 font-bold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={ejecutarImportacion}
                                    className="flex-[2] px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-gray-900 font-black shadow-lg shadow-red-200 transition-all uppercase tracking-widest text-sm"
                                >
                                    Confirmar Restauración
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
