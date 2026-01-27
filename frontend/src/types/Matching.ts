/**
 * Tipos TypeScript para el sistema de Matching Inteligente
 * 
 * Define las interfaces y tipos para la vinculación automática
 * de movimientos del extracto bancario con movimientos del sistema.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Estados posibles de una vinculación de matching
 */
export const MatchEstado = {
    OK: 'OK',
    PROBABLE: 'PROBABLE',
    SIN_MATCH: 'SIN_MATCH',
    MANUAL: 'MANUAL',
    IGNORADO: 'IGNORADO'
} as const

export type MatchEstado = typeof MatchEstado[keyof typeof MatchEstado]

// ============================================================================
// Movimientos
// ============================================================================

/**
 * Movimiento del extracto bancario
 */
export interface MovimientoExtracto {
    id: number
    fecha: string
    descripcion: string
    referencia: string | null
    valor: number
    usd: number | null
    trm: number | null
    cuenta_id: number
}

/**
 * Movimiento del sistema
 */
export interface MovimientoSistema {
    id: number
    fecha: string
    descripcion: string
    referencia: string | null
    valor: number
    usd: number | null
    trm: number | null
    cuenta_id: number
    tercero_id: number | null
    tercero_nombre: string | null
    centro_costo_id: number | null
    centro_costo_nombre: string | null
    concepto_id: number | null
    concepto_nombre: string | null
}

// ============================================================================
// Matching
// ============================================================================

/**
 * Vinculación entre un movimiento del extracto y uno del sistema
 */
export interface MovimientoMatch {
    id: number | null
    mov_extracto: MovimientoExtracto
    mov_sistema: MovimientoSistema | null
    estado: MatchEstado
    score_total: number
    score_fecha: number
    score_valor: number
    score_descripcion: number
    confirmado_por_usuario: boolean
    created_by: string | null
    notas: string | null
}

/**
 * Estadísticas del resultado del matching
 */
export interface DetailedStat {
    cantidad: number
    total: number
    ingresos: number
    egresos: number
}

export interface MatchingEstadisticas {
    total_extracto: DetailedStat
    total_sistema: DetailedStat
    ok: DetailedStat
    probables: DetailedStat
    sin_match: DetailedStat
    ignorados: DetailedStat
}

/**
 * Indicadores de integridad para el cuadre
 */
export interface MatchingIntegridad {
    balance_ingresos: boolean
    balance_egresos: boolean
    igualdad_registros: boolean
    todo_vinculado: boolean
    sin_pendientes: boolean
    relacion_1_a_1: boolean
    es_cuadrado: boolean
}

/**
 * Resultado completo del matching para un periodo
 */
export interface MatchingResult {
    matches: MovimientoMatch[]
    estadisticas: MatchingEstadisticas
    integridad: MatchingIntegridad
    movimientos_sistema_sin_match: MovimientoSistema[] // Array de movimientos del sistema no emparejados
}

// ============================================================================
// Configuración
// ============================================================================

/**
 * Configuración del algoritmo de matching
 */
export interface ConfiguracionMatching {
    id: number | null
    tolerancia_valor: number
    similitud_descripcion_minima: number
    peso_fecha: number
    peso_valor: number
    peso_descripcion: number
    score_minimo_exacto: number
    score_minimo_probable: number
    activo: boolean
    created_at: string | null
    updated_at: string | null
}

/**
 * Datos para actualizar la configuración
 */
export interface ConfiguracionMatchingUpdate {
    tolerancia_valor: number
    similitud_descripcion_minima: number
    peso_fecha: number
    peso_valor: number
    peso_descripcion: number
    score_minimo_exacto: number
    score_minimo_probable: number
}

// ============================================================================
// Requests
// ============================================================================

/**
 * Request para vincular manualmente dos movimientos
 */
export interface VincularRequest {
    movimiento_extracto_id: number
    movimiento_id: number
    usuario: string
    notas?: string
}

/**
 * Request para desvincular un movimiento
 */
export interface DesvincularRequest {
    movimiento_extracto_id: number
}

/**
 * Request para ignorar un movimiento del extracto
 */
export interface IgnorarRequest {
    movimiento_extracto_id: number
    usuario: string
    razon?: string
}

// ============================================================================
// Alias (Normalización)
// ============================================================================

export interface MatchingAlias {
    id: number
    cuenta_id: number
    patron: string
    reemplazo: string
    created_at: string | null
}

export interface MatchingAliasCreate {
    cuenta_id: number
    patron: string
    reemplazo: string
}

export interface MatchingAliasUpdate {
    patron: string
    reemplazo: string
}
