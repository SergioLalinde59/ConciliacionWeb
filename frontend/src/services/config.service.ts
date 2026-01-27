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
 * Servicio para configuración de filtros de centros de costos
 */
export const configFiltrosCentrosCostosService = {
    listar: (): Promise<any[]> =>
        fetch(`${API_BASE_URL}/api/config-filtros-centros-costos`).then(handleResponse),

    crear: (dto: { centro_costo_id: number, etiqueta: string, activo_por_defecto: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-filtros-centros-costos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    actualizar: (id: number, dto: { centro_costo_id: number, etiqueta: string, activo_por_defecto: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-filtros-centros-costos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    eliminar: (id: number): Promise<void> =>
        fetch(`${API_BASE_URL}/api/config-filtros-centros-costos/${id}`, { method: 'DELETE' }).then(handleResponse)
}

/**
 * Servicio para configuración de valores pendientes
 */
export const configValoresPendientesService = {
    listar: (): Promise<any[]> =>
        fetch(`${API_BASE_URL}/api/config-valores-pendientes`).then(handleResponse),

    listarPorTipo: (tipo: string): Promise<number[]> =>
        fetch(`${API_BASE_URL}/api/config-valores-pendientes/tipo/${tipo}`).then(handleResponse),

    crear: (dto: { tipo: string, valor_id: number, descripcion: string, activo: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-valores-pendientes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    actualizar: (id: number, dto: { tipo: string, valor_id: number, descripcion: string, activo: boolean }): Promise<any> =>
        fetch(`${API_BASE_URL}/api/config-valores-pendientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    eliminar: (id: number): Promise<void> =>
        fetch(`${API_BASE_URL}/api/config-valores-pendientes/${id}`, { method: 'DELETE' }).then(handleResponse)
}
