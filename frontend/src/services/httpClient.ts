import { API_BASE_URL } from '../config'

/**
 * Tipo para respuesta paginada del API
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    totales?: {
        ingresos: number;
        egresos: number;
        saldo: number;
    };
}

/**
 * Manejador centralizado de respuestas HTTP
 */
export const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error en la petición: ${response.status}`)
    }
    return response.json()
}

/**
 * Construye query params a partir de un objeto, manejando arrays
 */
export const buildQueryParams = (params: Record<string, unknown>): URLSearchParams => {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                value.forEach(v => queryParams.append(key, String(v)))
            } else {
                queryParams.append(key, String(value))
            }
        }
    })
    return queryParams
}

export { API_BASE_URL }
