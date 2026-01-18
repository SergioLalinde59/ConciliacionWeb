export interface Conciliacion {
    id: number | null;
    cuenta_id: number;
    year: number;
    month: number;
    fecha_corte: string;
    extracto_saldo_anterior: number;
    extracto_entradas: number;
    extracto_salidas: number;
    extracto_saldo_final: number;
    sistema_entradas: number;
    sistema_salidas: number;
    sistema_saldo_final: number;
    diferencia_saldo: number | null;
    datos_extra: Record<string, any>;
    estado: string;
    cuenta_nombre?: string;
}

export interface ConciliacionUpdate {
    cuenta_id: number;
    year: number;
    month: number;
    fecha_corte: string;
    extracto_saldo_anterior: number;
    extracto_entradas: number;
    extracto_salidas: number;
    extracto_saldo_final: number;
    datos_extra?: Record<string, any>;
}

export interface MovimientoExtracto {
    id: number;
    cuenta_id: number;
    year: number;
    month: number;
    fecha: string;
    descripcion: string;
    referencia: string | null;
    valor: number;
    usd?: number;
    trm?: number;
    numero_linea: number | null;
    cuenta: string;
}
