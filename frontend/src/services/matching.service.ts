/**
 * Servicio API para el sistema de Matching Inteligente
 * 
 * Proporciona métodos para interactuar con los endpoints de matching
 * del backend, incluyendo ejecución del algoritmo, vinculaciones manuales,
 * y gestión de configuración.
 */

import { API_BASE_URL, handleResponse } from './httpClient'
import type {
    MatchingResult,
    MovimientoMatch,
    ConfiguracionMatching,
    ConfiguracionMatchingUpdate,
    VincularRequest,
    DesvincularRequest,
    IgnorarRequest
} from '../types/Matching'

const BASE_URL = '/api/matching'

/**
 * Servicio de Matching
 */
export const matchingService = {
    /**
     * Ejecuta el algoritmo de matching para un periodo específico
     * 
     * @param cuentaId - ID de la cuenta bancaria
     * @param year - Año del periodo
     * @param month - Mes del periodo (1-12)
     * @returns Resultado del matching con vinculaciones y estadísticas
     */
    async ejecutarMatching(
        cuentaId: number,
        year: number,
        month: number
    ): Promise<MatchingResult> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/${cuentaId}/${year}/${month}`
        )
        return handleResponse(response)
    },

    /**
     * Vincula manualmente un movimiento del extracto con uno del sistema
     * 
     * @param data - Datos de la vinculación manual
     * @returns Vinculación creada
     */
    async vincularManual(data: VincularRequest): Promise<MovimientoMatch> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/vincular`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }
        )
        return handleResponse(response)
    },

    /**
     * Elimina una vinculación existente
     * 
     * @param movimientoExtractoId - ID del movimiento del extracto
     * @returns Confirmación de eliminación
     */
    async desvincular(movimientoExtractoId: number): Promise<{ mensaje: string, movimiento_extracto_id: number }> {
        const data: DesvincularRequest = {
            movimiento_extracto_id: movimientoExtractoId
        }
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/desvincular`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }
        )
        return handleResponse(response)
    },

    /**
     * Marca un movimiento del extracto como ignorado
     * 
     * @param movimientoExtractoId - ID del movimiento del extracto
     * @param usuario - Usuario que marca como ignorado
     * @param razon - Razón opcional para ignorar
     * @returns Vinculación creada con estado IGNORADO
     */
    async ignorar(
        movimientoExtractoId: number,
        usuario: string,
        razon?: string
    ): Promise<MovimientoMatch> {
        const data: IgnorarRequest = {
            movimiento_extracto_id: movimientoExtractoId,
            usuario,
            razon
        }
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/ignorar`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }
        )
        return handleResponse(response)
    },

    /**
     * Obtiene la configuración activa del algoritmo de matching
     * 
     * @returns Configuración activa
     */
    async obtenerConfiguracion(): Promise<ConfiguracionMatching> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/configuracion`
        )
        return handleResponse(response)
    },

    /**
     * Actualiza la configuración del algoritmo de matching
     * 
     * @param config - Nuevos valores de configuración
     * @returns Configuración actualizada
     */
    async actualizarConfiguracion(
        config: ConfiguracionMatchingUpdate
    ): Promise<ConfiguracionMatching> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/configuracion`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            }
        )
        return handleResponse(response)
    },

    /**
     * Crea movimientos en lote desde items del extracto (Sin Match)
     */
    async crearMovimientosLote(items: { movimiento_extracto_id: number, descripcion?: string }[]): Promise<{ creados: number, errores: string[] }> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/crear-movimientos-lote`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(items)
            }
        )
        return handleResponse(response)
    },

    // --- Alias methods ---

    async obtenerAliases(cuentaId: number): Promise<import('../types/Matching').MatchingAlias[]> {
        const response = await fetch(`${API_BASE_URL}${BASE_URL}/alias/${cuentaId}`)
        return handleResponse(response)
    },

    async crearAlias(data: import('../types/Matching').MatchingAliasCreate): Promise<import('../types/Matching').MatchingAlias> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/alias`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }
        )
        return handleResponse(response)
    },

    async actualizarAlias(id: number, data: import('../types/Matching').MatchingAliasUpdate): Promise<import('../types/Matching').MatchingAlias> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/alias/${id}`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }
        )
        return handleResponse(response)
    },

    async eliminarAlias(id: number): Promise<{ mensaje: string }> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/alias/${id}`,
            {
                method: 'DELETE'
            }
        )
        return handleResponse(response)
    },

    // --- Validación 1-a-Muchos ---

    /**
     * Detecta movimientos del sistema vinculados a múltiples extractos
     * 
     * @param cuentaId - ID de la cuenta
     * @param year - Año
     * @param month - Mes
     * @returns Detalle de casos problemáticos
     */
    async detectarMatches1aMuchos(
        cuentaId: number,
        year: number,
        month: number
    ): Promise<{
        casos_problematicos: Array<{
            sistema_id: number
            sistema_descripcion: string
            sistema_valor: number
            sistema_fecha: string
            num_vinculaciones: number
            extracto_ids: number[]
            extracto_descripciones: string[]
            extracto_valores: number[]
            extracto_fechas: string[]
        }>
        total_movimientos_sistema_afectados: number
        total_extractos_afectados: number
    }> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/detectar-1-a-muchos`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuenta_id: cuentaId, year, month })
            }
        )
        return handleResponse(response)
    },

    /**
     * Elimina vinculaciones incorrectas donde 1 sistema → múltiples extractos
     * 
     * @param cuentaId - ID de la cuenta
     * @param year - Año
     * @param month - Mes
     * @returns Resumen de cambios realizados
     */
    async invalidarMatches1aMuchos(
        cuentaId: number,
        year: number,
        month: number
    ): Promise<{
        vinculaciones_eliminadas: number
        movimientos_sistema_afectados: number
        extractos_ahora_sin_match: number
        mensaje: string
        casos_corregidos: any[]
    }> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/invalidar-1-a-muchos`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cuenta_id: cuentaId, year, month })
            }
        )
        return handleResponse(response)
    },

    /**
     * Elimina TODAS las vinculaciones de un periodo
     */
    async desvincularTodo(cuentaId: number, year: number, month: number): Promise<{ mensaje: string, eliminados: number }> {
        const response = await fetch(
            `${API_BASE_URL}${BASE_URL}/desvincular-todo/${cuentaId}/${year}/${month}`,
            {
                method: 'POST'
            }
        )
        return handleResponse(response)
    }
}
