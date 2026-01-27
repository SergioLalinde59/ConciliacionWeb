import { API_BASE_URL, handleResponse } from './httpClient'
import type { CuentaExtractor } from '../types'

export const extractoresService = {
    listar: (): Promise<CuentaExtractor[]> =>
        fetch(`${API_BASE_URL}/api/extractores`).then(handleResponse),

    crear: (extractor: CuentaExtractor): Promise<CuentaExtractor> =>
        fetch(`${API_BASE_URL}/api/extractores`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extractor)
        }).then(handleResponse),

    actualizar: (id: number, extractor: CuentaExtractor): Promise<CuentaExtractor> =>
        fetch(`${API_BASE_URL}/api/extractores/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extractor)
        }).then(handleResponse),

    eliminar: (id: number): Promise<void> =>
        fetch(`${API_BASE_URL}/api/extractores/${id}`, { method: 'DELETE' }).then(handleResponse)
}
