import { API_BASE_URL, handleResponse } from './httpClient'
import { invalidateCatalogos } from '../utils/queryClient'
import type { CentroCosto, Tercero, Cuenta, Moneda, Concepto } from '../types'

/**
 * Tipo de datos retornados por el endpoint de catálogos
 */
export interface CatalogosData {
    cuentas: Cuenta[]
    monedas: Moneda[]
    terceros: Tercero[]
    centros_costos: CentroCosto[]
    conceptos: Concepto[]
}

/**
 * Servicio para catálogos unificados
 * 
 * NOTA: El cacheo ahora es manejado por React Query a través del hook useCatalogos.
 * Este servicio provee las funciones de fetch puras que React Query consume.
 */
export const catalogosService = {
    /**
     * Obtiene todos los catálogos. React Query se encarga del caching.
     */
    obtenerTodos: async (): Promise<CatalogosData> => {
        const data = await fetch(`${API_BASE_URL}/api/catalogos`).then(handleResponse)
        return data as CatalogosData
    },

    /**
     * Invalida el caché de catálogos en React Query
     */
    invalidarCache: invalidateCatalogos
}

/**
 * Servicio para Centros de Costos
 */
export const centrosCostosService = {
    listar: async (): Promise<CentroCosto[]> => {
        const data = await fetch(`${API_BASE_URL}/api/catalogos/centros-costos`).then(handleResponse)
        return data as CentroCosto[]
    },

    crear: async (nombre: string): Promise<CentroCosto> => {
        const result = await fetch(`${API_BASE_URL}/api/centros-costos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ centro_costo: nombre })
        }).then(handleResponse)
        invalidateCatalogos()
        return result
    },

    actualizar: async (id: number, nombre: string): Promise<CentroCosto> => {
        const result = await fetch(`${API_BASE_URL}/api/centros-costos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ centro_costo: nombre })
        }).then(handleResponse)
        invalidateCatalogos()
        return result
    },

    eliminar: async (id: number): Promise<void> => {
        await fetch(`${API_BASE_URL}/api/centros-costos/${id}`, { method: 'DELETE' }).then(handleResponse)
        invalidateCatalogos()
    }
}

/**
 * Servicio para Cuentas
 */
export const cuentasService = {
    listar: async (): Promise<Cuenta[]> => {
        const data = await fetch(`${API_BASE_URL}/api/cuentas`).then(handleResponse)
        return data as Cuenta[]
    }
}

/**
 * Servicio para Terceros
 */
export const tercerosService = {
    listar: async (): Promise<Tercero[]> => {
        const data = await fetch(`${API_BASE_URL}/api/terceros`).then(handleResponse)
        return data as Tercero[]
    },

    buscar: (query: string): Promise<Tercero[]> =>
        fetch(`${API_BASE_URL}/api/terceros/buscar?q=${encodeURIComponent(query)}`).then(handleResponse),

    crear: async (dto: { tercero: string }): Promise<Tercero> => {
        const result = await fetch(`${API_BASE_URL}/api/terceros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse)
        invalidateCatalogos()
        return result
    },

    listarDescripciones: async (): Promise<any[]> => {
        const data = await fetch(`${API_BASE_URL}/api/terceros/descripciones`).then(handleResponse)
        return data
    },

    crearDescripcion: async (dto: any): Promise<any> => {
        const result = await fetch(`${API_BASE_URL}/api/terceros/descripciones`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse)
        return result
    },

    actualizarDescripcion: async (id: number, dto: any): Promise<any> => {
        const result = await fetch(`${API_BASE_URL}/api/terceros/descripciones/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dto)
        }).then(handleResponse)
        return result
    },

    eliminarDescripcion: async (id: number): Promise<void> => {
        await fetch(`${API_BASE_URL}/api/terceros/descripciones/${id}`, { method: 'DELETE' }).then(handleResponse)
    }
}

/**
 * Servicio para Conceptos
 */
export const conceptosService = {
    listar: async (centroCostoId?: number): Promise<Concepto[]> => {
        let url = `${API_BASE_URL}/api/conceptos`
        if (centroCostoId) {
            url += `?centro_costo_id=${centroCostoId}`
        }
        const data = await fetch(url).then(handleResponse)
        return data as Concepto[]
    },

    crear: async (payload: any): Promise<Concepto> => {
        const result = await fetch(`${API_BASE_URL}/api/conceptos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(handleResponse)
        invalidateCatalogos()
        return result
    },

    actualizar: async (id: number, payload: any): Promise<Concepto> => {
        const result = await fetch(`${API_BASE_URL}/api/conceptos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(handleResponse)
        invalidateCatalogos()
        return result
    },

    eliminar: async (id: number): Promise<void> => {
        await fetch(`${API_BASE_URL}/api/conceptos/${id}`, { method: 'DELETE' }).then(handleResponse)
        invalidateCatalogos()
    }
}
