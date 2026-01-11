import { API_BASE_URL, handleResponse } from './httpClient'

/**
 * Servicio para operaciones de archivos (carga y análisis)
 */
export const archivosService = {
    cargar: (file: File, tipo_cuenta: string, cuenta_id: number): Promise<any> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipo_cuenta)
        formData.append('cuenta_id', cuenta_id.toString())

        return fetch(`${API_BASE_URL}/api/archivos/cargar`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    },

    analizar: (file: File, tipo_cuenta: string): Promise<any> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipo_cuenta)

        return fetch(`${API_BASE_URL}/api/archivos/analizar`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    }
}
