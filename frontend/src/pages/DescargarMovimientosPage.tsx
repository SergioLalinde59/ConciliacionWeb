import React, { useState, useEffect, useMemo } from 'react'
import { apiService } from '../services/api'
import { Download, Table, FileSpreadsheet, FileText, Printer, Settings, CheckSquare, Square } from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { FiltrosReporte } from '../components/FiltrosReporte'
import { useCatalogo } from '../hooks/useCatalogo'
import { useSessionStorage } from '../hooks/useSessionStorage'
import { getMesActual } from '../utils/dateUtils'
import type { Movimiento } from '../types'

interface ExportColumn {
    key: string;
    label: string;
    fieldDisplay: keyof Movimiento;
    fieldId?: keyof Movimiento; // Optional, defaults to fieldDisplay if not present, or custom logic
}

const AVAILABLE_COLUMNS: ExportColumn[] = [
    { key: 'id', label: 'ID', fieldDisplay: 'id' },
    { key: 'fecha', label: 'Fecha', fieldDisplay: 'fecha' },
    { key: 'cuenta', label: 'Cuenta', fieldDisplay: 'cuenta_display', fieldId: 'cuenta_id' },
    { key: 'tercero', label: 'Tercero', fieldDisplay: 'tercero_display', fieldId: 'tercero_id' },
    { key: 'grupo', label: 'Grupo', fieldDisplay: 'grupo_display', fieldId: 'grupo_id' },
    { key: 'concepto', label: 'Concepto', fieldDisplay: 'concepto_display', fieldId: 'concepto_id' },
    { key: 'valor', label: 'Valor', fieldDisplay: 'valor' },
    { key: 'moneda', label: 'Moneda', fieldDisplay: 'moneda_display', fieldId: 'moneda_id' },
    { key: 'usd', label: 'Valor USD', fieldDisplay: 'usd' },
    { key: 'trm', label: 'TRM', fieldDisplay: 'trm' },
    { key: 'detalle', label: 'Detalle', fieldDisplay: 'detalle' },
    { key: 'descripcion', label: 'Descripción', fieldDisplay: 'descripcion' },
    { key: 'referencia', label: 'Referencia', fieldDisplay: 'referencia' },
    { key: 'created_at', label: 'Creación', fieldDisplay: 'created_at' },
]

export const DescargarMovimientosPage: React.FC = () => {
    // Filtros State
    const [desde, setDesde] = useSessionStorage('desc_filtro_desde', getMesActual().inicio)
    const [hasta, setHasta] = useSessionStorage('desc_filtro_hasta', getMesActual().fin)
    const [cuentaId, setCuentaId] = useSessionStorage('desc_filtro_cuentaId', '')
    const [terceroId, setTerceroId] = useSessionStorage('desc_filtro_terceroId', '')
    const [grupoId, setGrupoId] = useSessionStorage('desc_filtro_grupoId', '')
    const [conceptoId, setConceptoId] = useSessionStorage('desc_filtro_conceptoId', '')

    // Dynamic Exclusion
    const [configuracionExclusion, setConfiguracionExclusion] = useState<Array<{ grupo_id: number; etiqueta: string; activo_por_defecto: boolean }>>([])
    const [gruposExcluidos, setGruposExcluidos] = useSessionStorage<number[]>('desc_filtro_gruposExcluidos', [])
    const actualGruposExcluidos = gruposExcluidos

    // Export Options
    const [plainFormat, setPlainFormat] = useState(false)
    const [filename, setFilename] = useState(() => {
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        return `${yyyy}-${mm}-${dd} movimientos`
    })

    // Initial columns: select all by default
    const [selectedColumns, setSelectedColumns] = useState<string[]>(
        AVAILABLE_COLUMNS.map(c => c.key)
    )
    const [showColumnSelector, setShowColumnSelector] = useState(false)

    // Data State
    const [movimientos, setMovimientos] = useState<Movimiento[]>([])
    const [loading, setLoading] = useState(false)
    const { cuentas, terceros, grupos, conceptos } = useCatalogo()

    // Load Exclusion Config
    useEffect(() => {
        apiService.movimientos.obtenerConfiguracionFiltrosExclusion()
            .then(data => {
                setConfiguracionExclusion(data)
                // No defaults - user must choose which groups to exclude
            })
            .catch(err => console.error("Error fetching filter config", err))
    }, [])

    // Fetch Data
    const cargarDatos = () => {
        setLoading(true)

        const parsedCuentaId = cuentaId && cuentaId !== '' ? parseInt(cuentaId) : undefined
        const parsedTerceroId = terceroId && terceroId !== '' ? parseInt(terceroId) : undefined
        const parsedGrupoId = grupoId && grupoId !== '' ? parseInt(grupoId) : undefined
        const parsedConceptoId = conceptoId && conceptoId !== '' ? parseInt(conceptoId) : undefined

        const filterParams = {
            desde,
            hasta,
            cuenta_id: parsedCuentaId,
            tercero_id: parsedTerceroId,
            grupo_id: parsedGrupoId,
            concepto_id: parsedConceptoId,
            grupos_excluidos: actualGruposExcluidos.length > 0 ? actualGruposExcluidos : undefined,
        }

        apiService.movimientos.listar(filterParams)
            .then(response => {
                setMovimientos(response.items || [])
                setLoading(false)
            })
            .catch(err => {
                console.error("Error cargando datos para exportar:", err)
                toast.error("Error cargando datos")
                setLoading(false)
            })
    }

    // Effect to reload when filters change
    useEffect(() => {
        cargarDatos()
    }, [desde, hasta, cuentaId, terceroId, grupoId, conceptoId, actualGruposExcluidos])

    const handleLimpiar = () => {
        const mesActual = getMesActual()
        setDesde(mesActual.inicio)
        setHasta(mesActual.fin)
        setCuentaId('')
        setTerceroId('')
        setGrupoId('')
        setConceptoId('')
        if (configuracionExclusion.length > 0) {
            const defaults = configuracionExclusion.filter(d => d.activo_por_defecto).map(d => d.grupo_id)
            setGruposExcluidos(defaults)
        } else {
            setGruposExcluidos([])
        }
    }

    const toggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        )
    }

    const selectAllColumns = () => {
        setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key))
    }

    const deselectAllColumns = () => {
        setSelectedColumns([])
    }

    // Export Logic
    const handleExport = async (format: 'csv' | 'excel' | 'sheets' | 'pdf') => {
        if (!movimientos.length) {
            toast.error('No hay datos para exportar')
            return
        }

        if (selectedColumns.length === 0) {
            toast.error('Debe seleccionar al menos una columna')
            return
        }



        // Get actual headers and data extractors based on selection
        const activeCols = AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key))

        // Build headers: when plainFormat is OFF and column has fieldId, split into ID + Name columns
        const headers: string[] = []
        activeCols.forEach(col => {
            if (!plainFormat && col.fieldId) {
                // Split into two columns: ID and Name
                headers.push(`${col.label} ID`)
                headers.push(col.label)
            } else {
                headers.push(col.label)
            }
        })

        const getRowData = (m: Movimiento) => {
            const rowData: (string | number)[] = []
            activeCols.forEach(col => {
                if (!plainFormat && col.fieldId) {
                    // Split into two values: ID and Display Name
                    const idVal = m[col.fieldId]
                    let displayVal = m[col.fieldDisplay] as string | null | undefined

                    // For fields with ID prefix format (e.g., "29 - Mercado" -> "Mercado"), strip the prefix
                    if (displayVal && typeof displayVal === 'string') {
                        const parts = displayVal.split('-')
                        if (parts.length > 1) {
                            displayVal = parts.slice(1).join('-').trim()
                        }
                    }

                    rowData.push(idVal ?? '')
                    rowData.push(displayVal ?? '')
                } else {
                    const fieldName = (plainFormat && col.fieldId) ? col.fieldId : col.fieldDisplay
                    let val = m[fieldName]

                    // Handle nulls/undefined
                    if (val === null || val === undefined) {
                        rowData.push('')
                        return
                    }

                    // Format created_at to yyyy-mm-ddThh:mm:ss
                    if (col.key === 'created_at' && typeof val === 'string') {
                        rowData.push(val.substring(0, 19))
                        return
                    }

                    if (format === 'pdf' && (col.key === 'valor' || col.key === 'usd')) {
                        const num = Number(val || 0)
                        if (col.key === 'valor') {
                            rowData.push(num.toLocaleString('es-CO'))
                            return
                        }
                        if (col.key === 'usd') {
                            rowData.push(num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                            return
                        }
                    }

                    rowData.push(val as string | number)
                }
            })
            return rowData
        }

        // Prepare Totals Row - must match the header structure
        const totalsRowData: (string | number)[] = []
        activeCols.forEach(col => {
            if (!plainFormat && col.fieldId) {
                // Two columns for this field (ID + Name), add empty values
                totalsRowData.push('')
                totalsRowData.push('')
            } else if (col.key === 'valor') {
                if (format === 'pdf') {
                    totalsRowData.push(totals.valor.toLocaleString('es-CO'))
                } else {
                    totalsRowData.push(totals.valor)
                }
            } else if (col.key === 'usd') {
                if (format === 'pdf') {
                    totalsRowData.push(totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
                } else {
                    totalsRowData.push(totals.usd)
                }
            } else if (col.key === 'id') {
                totalsRowData.push('TOTAL')
            } else {
                totalsRowData.push('')
            }
        })

        let blob: Blob
        let validExtension = ''
        let mimeType = ''

        if (format === 'csv') {
            const separator = ','
            const rows = movimientos.map(m => {
                const rowData = getRowData(m)
                const escaped = rowData.map(val => {
                    const s = '' + (val ?? '')
                    if (s.includes(separator) || s.includes('"') || s.includes('\n')) {
                        return `"${s.replace(/"/g, '""')}"`
                    }
                    return s
                })
                return escaped.join(separator)
            }).join('\n')

            // TSV/CSV Totals
            const totalsRowCSV = totalsRowData.join(separator)

            const csvContent = headers.join(separator) + '\n' + rows + '\n' + totalsRowCSV
            blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            validExtension = 'csv'
            mimeType = 'text/csv'
        } else if (format === 'pdf') {
            const doc = new jsPDF()

            doc.setFontSize(14)
            doc.text(`Movimientos - ${filename || 'Export'}`, 14, 15)
            doc.setFontSize(10)
            doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22)

            const tableData = movimientos.map(m => getRowData(m))
            // Add totals row
            tableData.push(totalsRowData)

            autoTable(doc, {
                head: [headers],
                body: tableData,
                startY: 25,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185], textColor: 255 },
                // Highlight totals row
                didParseCell: (data: any) => {
                    // Highlight totals row
                    if (data.row.index === tableData.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [240, 240, 240];
                    }

                    // Color logic for Valor and USD columns
                    if (data.section === 'body' || data.section === 'head') {
                        const header = headers[data.column.index]
                        if (header === 'Valor' || header === 'Valor USD') {
                            data.cell.styles.halign = 'right'; // Right align numbers

                            if (data.section === 'body') {
                                const text = data.cell.raw as string
                                if (text) {
                                    // Check for negative sign or parenthesis depending on format, usually just '-' for standard
                                    // We strip non-numeric chars to check value if needed, but simple string check might suffice if format is consistent
                                    if (text.toString().includes('-')) {
                                        data.cell.styles.textColor = [220, 53, 69]; // Red
                                    } else {
                                        // Check if it's not zero (to avoid coloring 0.00 green if preferred, but user said "postive green")
                                        // Let's try to parse simple check
                                        const isZero = text === '0' || text === '0,00' || text === '0.00'
                                        if (!isZero) {
                                            data.cell.styles.textColor = [25, 135, 84]; // Green
                                        } else {
                                            if (header === 'Valor USD') data.cell.styles.textColor = [13, 110, 253]; // Blue for zero USD (matching UI)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })

            blob = doc.output('blob')
            validExtension = 'pdf'
            mimeType = 'application/pdf'
        } else {
            // Excel & Sheets -> Real XLSX
            const data = movimientos.map(m => getRowData(m))
            // Add headers
            const wsData = [headers, ...data, totalsRowData]

            const ws = XLSX.utils.aoa_to_sheet(wsData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Movimientos")
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

            blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            validExtension = 'xlsx'
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }

        // Save File Logic
        const finalFilename = `${filename || 'export'}.${validExtension}`

        try {
            // @ts-ignore - ShowSaveFilePicker is not yet in all TS definitions
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: finalFilename,
                    types: [{
                        description: format === 'csv' ? 'Archivo CSV' : 'Libro de Excel',
                        accept: { [mimeType]: [`.${validExtension}`] },
                    }],
                })
                // @ts-ignore
                const writable = await handle.createWritable()
                await writable.write(blob)
                await writable.close()
                toast.success('Archivo guardado exitosamente')
            } else {
                // Fallback
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = finalFilename
                link.click()
                toast.success('Archivo descargado')
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error("Error saving file:", err)
                toast.error("Error al guardar el archivo")
            }
        }
    }


    const totals = useMemo(() => {
        return movimientos.reduce((acc, curr) => ({
            valor: acc.valor + Number(curr.valor || 0),
            usd: acc.usd + Number(curr.usd || 0)
        }), { valor: 0, usd: 0 })
    }, [movimientos])

    return (
        <div className="flex flex-col h-screen bg-gray-100 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Download className="h-8 w-8 text-blue-600" />
                        Descargar Movimientos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Filtra, selecciona campos y exporta tus transacciones</p>
                </div>

                <div className="flex flex-col items-end gap-2 bg-white p-2 rounded-lg shadow-sm border no-print">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col justify-center px-2">
                            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer select-none" title="Exportar IDs en lugar de nombres">
                                <input
                                    type="checkbox"
                                    checked={plainFormat}
                                    onChange={(e) => setPlainFormat(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                                Formato ID (Plano)
                            </label>
                        </div>
                        <div className="border-l px-3">
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                className="px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 outline-none w-40"
                                placeholder="Nombre archivo"
                            />
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setShowColumnSelector(!showColumnSelector)} className={`p-2 rounded transition-colors ${showColumnSelector ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`} title="Seleccionar Columnas">
                                <Settings size={18} />
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded border border-green-200 transition-colors" title="Excel / Google Sheets (.xlsx)">
                                <FileSpreadsheet size={18} />
                                <span className="text-xs font-medium">Excel</span>
                            </button>
                            <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 transition-colors" title="Exportar CSV">
                                <FileText size={18} />
                                <span className="text-xs font-medium">CSV</span>
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-1"></div>
                            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 transition-colors" title="Exportar PDF">
                                <Printer size={18} />
                                <span className="text-xs font-medium">PDF</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-4">
                <FiltrosReporte
                    desde={desde}
                    hasta={hasta}
                    onDesdeChange={setDesde}
                    onHastaChange={setHasta}
                    cuentaId={cuentaId}
                    onCuentaChange={setCuentaId}
                    cuentas={cuentas}
                    terceroId={terceroId}
                    onTerceroChange={setTerceroId}
                    grupoId={grupoId}
                    onGrupoChange={(val) => {
                        setGrupoId(val)
                        setConceptoId('')
                    }}
                    conceptoId={conceptoId}
                    onConceptoChange={setConceptoId}
                    terceros={terceros}
                    grupos={grupos}
                    conceptos={conceptos}
                    showClasificacionFilters={true}
                    configuracionExclusion={configuracionExclusion}
                    gruposExcluidos={actualGruposExcluidos}
                    onGruposExcluidosChange={setGruposExcluidos}
                    onLimpiar={handleLimpiar}
                />
            </div>

            {/* Column Selector Panel */}
            {showColumnSelector && (
                <div className="bg-white p-4 rounded-lg shadow-md border mb-4 animate-in fade-in slide-in-from-top-2 no-print">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-gray-700">Seleccionar Campos a Exportar</h3>
                        <div className="flex gap-2">
                            <button onClick={selectAllColumns} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Seleccionar Todos</button>
                            <button onClick={deselectAllColumns} className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors">Deseleccionar Todos</button>
                            <div className="w-px h-4 bg-gray-200 mx-1"></div>
                            <button onClick={() => setShowColumnSelector(false)} className="text-xs text-blue-600 hover:underline">Ocultar</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {AVAILABLE_COLUMNS.map(col => (
                            <button
                                key={col.key}
                                onClick={() => toggleColumn(col.key)}
                                className={`flex items-center gap-2 text-xs px-3 py-2 rounded border transition-colors ${selectedColumns.includes(col.key)
                                    ? 'bg-blue-50 border-blue-200 text-blue-800 font-medium'
                                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                {selectedColumns.includes(col.key) ? <CheckSquare size={14} /> : <Square size={14} />}
                                {col.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Table size={16} />
                        Vista Previa ({movimientos.length} registros encontrados)
                    </h3>
                    <span className="text-xs text-gray-500">
                        {movimientos.length > 100 ? 'Mostrando primeros 100 registros. La exportación incluirá todos.' : 'Mostrando todos los registros.'}
                    </span>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="h-full flex items-center justify-center text-gray-500">Cargando datos...</div>
                    ) : (
                        <table className="min-w-full text-xs divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => (
                                        <th key={col.key} className={`px-3 py-2 font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 ${(col.key === 'valor' || col.key === 'usd') ? 'text-right' : 'text-left'}`}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                                {/* Totals Row */}
                                {movimientos.length > 0 && (
                                    <tr className="bg-blue-50/50 font-semibold border-t border-gray-200">
                                        {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => {
                                            if (col.key === 'valor') {
                                                return (
                                                    <td key={`total-${col.key}`} className={`px-3 py-2 whitespace-nowrap text-right ${totals.valor < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                        {totals.valor.toLocaleString('es-CO')}
                                                    </td>
                                                )
                                            }
                                            if (col.key === 'usd') {
                                                const val = totals.usd
                                                let colorClass = 'text-blue-600'
                                                if (val < 0) colorClass = 'text-red-600'
                                                if (val > 0) colorClass = 'text-green-600'

                                                return (
                                                    <td key={`total-${col.key}`} className={`px-3 py-2 whitespace-nowrap text-right ${colorClass}`}>
                                                        {totals.usd !== 0 ? totals.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                                    </td>
                                                )
                                            }
                                            return <td key={`total-${col.key}`} className="px-3 py-2"></td>
                                        })}
                                    </tr>
                                )}
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {movimientos.slice(0, 100).map((m) => (
                                    <tr key={m.id} className="hover:bg-gray-50">
                                        {AVAILABLE_COLUMNS.filter(c => selectedColumns.includes(c.key)).map(col => {
                                            const fieldName = (plainFormat && col.fieldId) ? col.fieldId : col.fieldDisplay
                                            const val = m[fieldName]
                                            let displayVal: React.ReactNode = val as any

                                            if (col.key === 'valor' || col.key === 'trm') {
                                                const num = Number(val || 0)
                                                displayVal = <span className={num < 0 ? 'text-red-500' : 'text-gray-700'}>{num.toLocaleString('es-CO')}</span>
                                            }
                                            if (col.key === 'usd') {
                                                const num = Number(val || 0)
                                                let colorClass = 'text-blue-600'
                                                if (num < 0) colorClass = 'text-red-500'
                                                if (num > 0) colorClass = 'text-green-600'
                                                displayVal = <span className={colorClass}>{num.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            }

                                            if (col.key === 'created_at' && val) {
                                                displayVal = <span className="text-gray-600 font-mono text-xs">{(val as string).substring(0, 19)}</span>
                                            }

                                            return (
                                                <td key={col.key} className={`px-3 py-2 text-gray-700 whitespace-nowrap ${(col.key === 'valor' || col.key === 'usd') ? 'text-right' : 'text-left'}`}>
                                                    {displayVal}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
