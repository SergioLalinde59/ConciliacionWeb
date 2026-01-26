import { API_BASE_URL, handleResponse } from './httpClient'

export const adminService = {
    exportTable: (tableName: string) => {
        const url = `${API_BASE_URL}/api/admin/export/${tableName}`
        window.open(url, '_blank')
    },

    importTable: async (tableName: string, file: File): Promise<{ mensaje: string; registros_importados: number; archivo_backup: string }> => {
        const formData = new FormData()
        formData.append('file', file)
        return fetch(`${API_BASE_URL}/api/admin/import/${tableName}`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    },

    listSnapshots: async (): Promise<Array<{ name: string; size: number; date: string }>> => {
        return fetch(`${API_BASE_URL}/api/admin/snapshots`).then(handleResponse)
    },

    bulkExport: async (tables: string[]): Promise<Blob> => {
        return fetch(`${API_BASE_URL}/api/admin/bulk-export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tables })
        }).then(res => {
            if (!res.ok) throw new Error('Error al generar backup masivo')
            return res.blob()
        })
    },

    bulkImport: async (file: File): Promise<{ mensaje: string; registros: any }> => {
        const formData = new FormData()
        formData.append('file', file)
        return fetch(`${API_BASE_URL}/api/admin/bulk-import`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    }
}
