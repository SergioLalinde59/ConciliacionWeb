import { API_BASE_URL, handleResponse, buildQueryParams } from './httpClient'
import type { PaginatedResponse } from './httpClient'
import type { Movimiento } from '../types'
import type {
    MovimientoFilterParams,
    ReporteFilterParams,
    ReclasificarLoteParams,
    ClasificarMovimientoParams,
    ConfigFiltroExclusion
} from '../types/filters'

/**
 * Servicio para operaciones de Movimientos
 */
export const movimientosService = {
    listar: (params: MovimientoFilterParams): Promise<PaginatedResponse<Movimiento>> => {
        const apiParams: Record<string, any> = { ...params }

        // Map fecha_inicio/fin to desde/hasta if valid, otherwise keep existing desde/hasta if present
        if (params.fecha_inicio) apiParams.desde = params.fecha_inicio
        if (params.fecha_fin) apiParams.hasta = params.fecha_fin

        delete apiParams.fecha_inicio
        delete apiParams.fecha_fin

        const queryParams = buildQueryParams(apiParams)
        return fetch(`${API_BASE_URL}/api/movimientos?${queryParams}`).then(handleResponse)
    },

    obtenerPendientes: (): Promise<Movimiento[]> =>
        fetch(`${API_BASE_URL}/api/movimientos/pendientes`).then(handleResponse),

    obtenerPorId: (id: number): Promise<Movimiento> =>
        fetch(`${API_BASE_URL}/api/movimientos/${id}`).then(handleResponse),

    crear: (mov: Partial<Movimiento>): Promise<Movimiento> =>
        fetch(`${API_BASE_URL}/api/movimientos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mov)
        }).then(handleResponse),

    actualizar: (id: number, mov: Partial<Movimiento>): Promise<Movimiento> =>
        fetch(`${API_BASE_URL}/api/movimientos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mov)
        }).then(handleResponse),

    autoClasificar: (): Promise<{ clasificados: number; resumen?: string }> =>
        fetch(`${API_BASE_URL}/api/movimientos/auto-clasificar`, { method: 'POST' }).then(handleResponse),

    clasificar: (id: number, datos: ClasificarMovimientoParams): Promise<void> =>
        fetch(`${API_BASE_URL}/api/movimientos/${id}/clasificacion`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }).then(handleResponse),

    // Reportes
    reporteClasificacion: (params: ReporteFilterParams): Promise<unknown[]> => {
        const apiParams: Record<string, any> = { ...params }
        if (params.fecha_inicio) apiParams.desde = params.fecha_inicio
        if (params.fecha_fin) apiParams.hasta = params.fecha_fin
        delete apiParams.fecha_inicio
        delete apiParams.fecha_fin

        const queryParams = buildQueryParams(apiParams)
        return fetch(`${API_BASE_URL}/api/movimientos/reporte/clasificacion?${queryParams}`).then(handleResponse)
    },

    reporteIngresosGastosMes: (params: ReporteFilterParams): Promise<unknown[]> => {
        const apiParams: Record<string, any> = { ...params }
        if (params.fecha_inicio) apiParams.desde = params.fecha_inicio
        if (params.fecha_fin) apiParams.hasta = params.fecha_fin
        delete apiParams.fecha_inicio
        delete apiParams.fecha_fin

        const queryParams = buildQueryParams(apiParams)
        return fetch(`${API_BASE_URL}/api/movimientos/reporte/ingresos-gastos-mes?${queryParams}`).then(handleResponse)
    },

    reporteDesgloseGastos: (params: ReporteFilterParams): Promise<unknown[]> => {
        const apiParams: Record<string, any> = { ...params }
        if (params.fecha_inicio) apiParams.desde = params.fecha_inicio
        if (params.fecha_fin) apiParams.hasta = params.fecha_fin
        delete apiParams.fecha_inicio
        delete apiParams.fecha_fin

        const queryParams = buildQueryParams(apiParams)
        return fetch(`${API_BASE_URL}/api/movimientos/reporte/desglose-gastos?${queryParams}`).then(handleResponse)
    },

    exportarDatos: (limit?: number, plain?: boolean): Promise<unknown[]> => {
        const params = new URLSearchParams()
        if (limit) params.append('limit', limit.toString())
        if (plain) params.append('plain', 'true')
        return fetch(`${API_BASE_URL}/api/movimientos/exportar/datos?${params.toString()}`).then(handleResponse)
    },

    // Sugerencias y Reclasificación
    obtenerSugerenciasReclasificacion: (desde?: string, hasta?: string): Promise<unknown[]> => {
        const queryParams = new URLSearchParams()
        if (desde) queryParams.append('desde', desde)
        if (hasta) queryParams.append('hasta', hasta)
        return fetch(`${API_BASE_URL}/api/movimientos/sugerencias/reclasificacion?${queryParams}`).then(handleResponse)
    },

    obtenerDetallesSugerencia: (tercero_id: number, grupo_id?: number, concepto_id?: number, desde?: string, hasta?: string): Promise<unknown[]> => {
        const queryParams = new URLSearchParams()
        queryParams.append('tercero_id', tercero_id.toString())
        if (grupo_id) queryParams.append('grupo_id', grupo_id.toString())
        if (concepto_id) queryParams.append('concepto_id', concepto_id.toString())
        if (desde) queryParams.append('desde', desde)
        if (hasta) queryParams.append('hasta', hasta)
        return fetch(`${API_BASE_URL}/api/movimientos/sugerencias/detalles?${queryParams}`).then(handleResponse)
    },

    reclasificarLote: (datos: ReclasificarLoteParams): Promise<{ actualizados: number }> =>
        fetch(`${API_BASE_URL}/api/movimientos/reclasificar-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        }).then(handleResponse),

    obtenerConfiguracionFiltrosExclusion: (): Promise<ConfigFiltroExclusion[]> =>
        fetch(`${API_BASE_URL}/api/movimientos/configuracion/filtros-exclusion`).then(handleResponse),
}

/**
 * Servicio para operaciones de Clasificación
 */
export const clasificacionService = {
    obtenerSugerencia: (id: number): Promise<unknown> =>
        fetch(`${API_BASE_URL}/api/clasificacion/sugerencia/${id}`).then(handleResponse),

    clasificarLote: (dto: { patron: string; tercero_id: number; grupo_id: number; concepto_id: number }): Promise<{ mensaje: string; clasificados: number }> =>
        fetch(`${API_BASE_URL}/api/clasificacion/clasificar-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse),

    previewLote: (patron: string): Promise<unknown[]> =>
        fetch(`${API_BASE_URL}/api/clasificacion/preview-lote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patron })
        }).then(handleResponse)
}
