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
    grupo_id?: number
    concepto_id?: number

    // Filtros de estado
    pendiente?: boolean
    ver_ingresos?: boolean
    ver_egresos?: boolean

    // Filtros de exclusión
    excluir_traslados?: boolean
    grupos_excluidos?: number[]

    // Búsqueda
    busqueda?: string
}

/**
 * Parámetros de filtro para reportes
 */
export interface ReporteFilterParams {
    fecha_inicio?: string
    fecha_fin?: string
    cuenta_id?: number
    excluir_traslados?: boolean
    grupos_excluidos?: number[]
}

/**
 * Parámetros para el reporte de clasificación
 */
export interface ReporteClasificacionParams extends ReporteFilterParams {
    tipo?: 'tercero' | 'grupo' | 'concepto'
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
    agrupar_por?: 'tercero' | 'grupo'
}

/**
 * DTO para reclasificación en lote
 */
export interface ReclasificarLoteParams {
    tercero_id: number
    grupo_id?: number
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
    grupo_id: number
    concepto_id: number
}

/**
 * DTO para crear/actualizar grupo
 */
export interface GrupoCreateParams {
    grupo: string
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
    grupo_id: number
    clave?: string
}

/**
 * DTO para configuración de filtros de grupos
 */
export interface ConfigFiltroGrupoParams {
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}

/**
 * DTO para crear/actualizar regla de clasificación
 */
export interface ReglaClasificacionParams {
    patron?: string
    tercero_id?: number
    grupo_id?: number
    concepto_id?: number
    activo?: boolean
}

/**
 * Respuesta de configuración de filtros de exclusión
 */
export interface ConfigFiltroExclusion {
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}
