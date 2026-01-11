export interface ItemCatalogo {
    id: number
    nombre: string
    grupo_id?: number // Solo para conceptos
}

export interface ClasificacionManual {
    tercero_id: number
    grupo_id: number
    concepto_id: number
}

export interface Cuenta {
    id: number
    nombre: string
    permite_carga: boolean
}

export interface Moneda {
    id: number
    isocode: string
    nombre: string
}

export interface TipoMovimiento {
    id: number
    nombre: string
}

export interface Tercero {
    id: number
    nombre: string
}

export interface TerceroDescripcion {
    id: number
    terceroid: number
    descripcion?: string
    referencia?: string
    activa: boolean
}

export interface Grupo {
    id: number
    nombre: string
}

export interface Concepto {
    id: number
    nombre: string
    grupo_id?: number
}

export interface Movimiento {
    id: number
    fecha: string
    descripcion: string
    referencia: string
    valor: number
    usd?: number | null
    trm?: number | null
    moneda_id: number
    cuenta_id: number
    tercero_id?: number | null
    grupo_id?: number | null
    concepto_id?: number | null
    created_at?: string | null
    // Campos de visualización en formato "id - descripción"
    cuenta_display: string
    moneda_display: string
    tercero_display?: string
    grupo_display?: string
    concepto_display?: string
    detalle?: string // Campo adicional de BD
}

export interface SugerenciaClasificacion {
    tercero_id: number | null
    grupo_id: number | null
    concepto_id: number | null
    razon: string | null
    tipo_match: string | null
}

export interface ContextoClasificacionResponse {
    movimiento_id: number
    sugerencia: SugerenciaClasificacion
    contexto: Movimiento[]
    referencia_no_existe: boolean
    referencia?: string | null
}

export interface ClasificacionLoteDTO {
    patron: string
    tercero_id: number
    grupo_id: number
    concepto_id: number
}

export interface ReglaClasificacion {
    id?: number
    patron?: string
    patron_descripcion?: string
    tercero_id?: number
    grupo_id?: number
    concepto_id?: number
    activa?: boolean
    prioridad?: number
    tipo_match?: string
}

export interface ConfigFiltroGrupo {
    id: number
    grupo_id: number
    etiqueta: string
    activo_por_defecto: boolean
}


// Force module compilation
export const _types_module = true
