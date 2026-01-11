import { FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Column<T> {
    key: keyof T | string
    label: string
    accessor?: (item: T) => string | number | boolean | null | undefined
}

interface CsvExportButtonProps<T> {
    data: T[]
    columns: Column<T>[]
    filenamePrefix: string
    disabled?: boolean
}

export function CsvExportButton<T>({ data, columns, filenamePrefix, disabled }: CsvExportButtonProps<T>) {
    const handleExport = async () => {
        if (!data.length) {
            toast.error('No hay datos para exportar')
            return
        }

        // Generate filename with date
        const today = new Date()
        const yyyy = today.getFullYear()
        const mm = String(today.getMonth() + 1).padStart(2, '0')
        const dd = String(today.getDate()).padStart(2, '0')
        const filename = `${yyyy}-${mm}-${dd} ${filenamePrefix}.csv`

        // Build CSV content
        const separator = ','
        const headers = columns.map(c => c.label).join(separator)

        const rows = data.map(item => {
            return columns.map(col => {
                let val: any
                if (col.accessor) {
                    val = col.accessor(item)
                } else {
                    val = (item as any)[col.key]
                }

                // Handle nulls/undefined
                if (val === null || val === undefined) return ''

                // Handle booleans
                if (typeof val === 'boolean') return val ? 'Sí' : 'No'

                // Escape CSV values
                const s = String(val)
                if (s.includes(separator) || s.includes('"') || s.includes('\n')) {
                    return `"${s.replace(/"/g, '""')}"`
                }
                return s
            }).join(separator)
        }).join('\n')

        const csvContent = headers + '\n' + rows
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })

        try {
            // @ts-ignore - showSaveFilePicker is not in all TS definitions
            if (window.showSaveFilePicker) {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Archivo CSV',
                        accept: { 'text/csv': ['.csv'] },
                    }],
                })
                // @ts-ignore
                const writable = await handle.createWritable()
                await writable.write(blob)
                await writable.close()
                toast.success('Archivo guardado exitosamente')
            } else {
                // Fallback for browsers without File System Access API
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = filename
                link.click()
                URL.revokeObjectURL(url)
                toast.success('Archivo descargado')
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err)
                toast.error('Error al guardar el archivo')
            }
        }
    }

    return (
        <button
            onClick={handleExport}
            disabled={disabled || data.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar a CSV"
        >
            <FileText size={18} />
            <span className="text-sm font-medium">CSV</span>
        </button>
    )
}
