import { API_BASE_URL, handleResponse } from './httpClient'
import type { ReglaClasificacion } from '../types'

/**
 * Servicio para reglas de clasificación
 */
export const reglasService = {
    listar: (): Promise<ReglaClasificacion[]> =>
        fetch(`${API_BASE_URL}/api/reglas`).then(handleResponse),

    crear: (regla: ReglaClasificacion): Promise<ReglaClasificacion> =>
        fetch(`${API_BASE_URL}/api/reglas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regla)
        }).then(handleResponse),

    actualizar: (id: number, regla: ReglaClasificacion): Promise<ReglaClasificacion> =>
        fetch(`${API_BASE_URL}/api/reglas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regla)
        }).then(handleResponse),

    eliminar: (id: number): Promise<void> =>
        fetch(`${API_BASE_URL}/api/reglas/${id}`, { method: 'DELETE' }).then(handleResponse)
}

/**
 * Servicio para configuración de filtros de grupos
 */
export const configFiltrosGruposService = {
    listar: (): Promise<any[]> =>
        fetch(`${API_BASE_URL}/api/config-filtros-grupos`).then(handleResponse),

    crear: (dto: { grupo_id: number, etiqueta: string, activo_por_defecto: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-filtros-grupos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    actualizar: (id: number, dto: { grupo_id: number, etiqueta: string, activo_por_defecto: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-filtros-grupos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    eliminar: (id: number): Promise<void> =>
        fetch(`${API_BASE_URL}/api/config-filtros-grupos/${id}`, { method: 'DELETE' }).then(handleResponse)
}
