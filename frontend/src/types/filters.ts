/**
 * Interfaces para parámetros de filtro en la API
 * 
 * Este archivo centraliza todos los tipos de parámetros usados
 * en las llamadas a la API, eliminando el uso de Record<string, any>
 */

/**
 * Parámetros base de paginación
 */
export interface PaginationParams {
    page?: number
    page_size?: number
}

/**
 * Parámetros de filtro para movimientos
 */
export interface MovimientoFilterParams extends PaginationParams {
    // Filtros de fecha
    fecha_inicio?: string
    fecha_fin?: string

    // Filtros de clasificación
    cuenta_id?: number
    tercero_id?: number
    centro_costo_id?: number
    concepto_id?: number

    // Filtros de estado
    pendiente?: boolean
    ver_ingresos?: boolean
    ver_egresos?: boolean

    // Filtros de exclusión
    excluir_traslados?: boolean
    centros_costos_excluidos?: number[]

    // Búsqueda
    busqueda?: string

    // Paginación manual adicional
    limit?: number
}

/**
 * Parámetros de filtro para reportes
 */
export interface ReporteFilterParams {
    fecha_inicio?: string
    fecha_fin?: string
    cuenta_id?: number
    excluir_traslados?: boolean
    centros_costos_excluidos?: number[]
}

/**
 * Parámetros para el reporte de clasificación
 */
export interface ReporteClasificacionParams extends ReporteFilterParams {
    tipo?: 'tercero' | 'centro_costo' | 'concepto'
    limite?: number
}

/**
 * Parámetros para el reporte de ingresos/gastos por mes
 */
export interface ReporteIngresosMesParams extends ReporteFilterParams {
    // Parámetros adicionales específicos si los hay
}

/**
 * Parámetros para el reporte de desglose de gastos
 */
export interface ReporteDesgloseParams extends ReporteFilterParams {
    agrupar_por?: 'tercero' | 'centro_costo'
}

/**
 * DTO para reclasificación en lote
 */
export interface ReclasificarLoteParams {
    tercero_id: number
    centro_costo_id?: number
    concepto_id?: number
    fecha_inicio?: string
    fecha_fin?: string
    movimiento_ids?: number[]
}

/**
 * DTO para clasificar un movimiento
 */
export interface ClasificarMovimientoParams {
    tercero_id: number
    centro_costo_id: number
    concepto_id: number
}

/**
 * DTO para crear/actualizar centro_costo
 */
export interface CentroCostoCreateParams {
    centro_costo: string
}

/**
 * DTO para crear/actualizar tercero
 */
export interface TerceroCreateParams {
    tercero: string
    descripcion?: string
    referencia?: string
}

/**
 * DTO para crear/actualizar concepto
 */
export interface ConceptoCreateParams {
    concepto: string
    centro_costo_id: number
    clave?: string
}

/**
 * DTO para configuración de filtros de centros de costos
 */
export interface ConfigFiltroCentroCostoParams {
    centro_costo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

/**
 * DTO para crear/actualizar regla de clasificación
 */
export interface ReglaClasificacionParams {
    patron?: string
    tercero_id?: number
    centro_costo_id?: number
    concepto_id?: number
    activo?: boolean
}

/**
 * Respuesta de configuración de filtros de exclusión
 */
export interface ConfigFiltroExclusion {
    centro_costo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}
