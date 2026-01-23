import { API_BASE_URL, handleResponse } from './httpClient'

/**
 * Servicio para operaciones de archivos (carga y análisis)
 */
export const archivosService = {
    cargar: (file: File, tipo_cuenta: string, cuenta_id: number, actualizar_descripciones: boolean = false): Promise<any> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipo_cuenta)
        formData.append('cuenta_id', cuenta_id.toString())
        formData.append('actualizar_descripciones', actualizar_descripciones.toString())

        return fetch(`${API_BASE_URL}/api/archivos/cargar`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    },

    analizar: (file: File, tipo_cuenta: string, cuenta_id?: number): Promise<any> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipo_cuenta)
        if (cuenta_id) formData.append('cuenta_id', cuenta_id.toString())

        return fetch(`${API_BASE_URL}/api/archivos/analizar`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    },

    listarDirectorios: (tipo: 'movimientos' | 'extractos'): Promise<string[]> => {
        return fetch(`${API_BASE_URL}/api/archivos/listar-directorios?tipo=${tipo}`)
            .then(handleResponse)
    },

    procesarLocal: (
        filename: string,
        tipo: 'movimientos' | 'extractos',
        tipo_cuenta: string,
        cuenta_id?: number,
        actualizar_descripciones: boolean = false,
        year?: number,
        month?: number,
        accion: 'analizar' | 'cargar' = 'analizar'
    ): Promise<any> => {
        const formData = new FormData()
        formData.append('filename', filename)
        formData.append('tipo', tipo)
        formData.append('tipo_cuenta', tipo_cuenta)
        if (cuenta_id) formData.append('cuenta_id', cuenta_id.toString())
        formData.append('actualizar_descripciones', actualizar_descripciones.toString())
        if (year) formData.append('year', year.toString())
        if (month) formData.append('month', month.toString())
        formData.append('accion', accion)

        return fetch(`${API_BASE_URL}/api/archivos/procesar-local`, {
            method: 'POST',
            body: formData
        }).then(handleResponse)
    }
}
