import { API_BASE_URL } from '../config';

export interface DesvinculacionStats {
    cuenta_id: number;
    cuenta_nombre: string;
    conteo: number;
    ingresos: number;
    egresos: number;
    estado_periodo: string;
    bloqueado: boolean;
}

export interface DesvinculacionResult {
    mensaje: string;
    registros_desvinculados: number;
}

export const mantenimientoService = {
    analizarDesvinculacion: async (fecha: string, fechaFin?: string, cuentaId?: number): Promise<DesvinculacionStats[]> => {
        let url = `${API_BASE_URL}/api/mantenimiento/analizar-desvinculacion?fecha=${fecha}`;
        if (fechaFin) {
            url += `&fecha_fin=${fechaFin}`;
        }
        if (cuentaId) {
            url += `&cuenta_id=${cuentaId}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al analizar desvinculación');
        }
        return response.json();
    },

    desvincularMovimientos: async (fecha: string, backup: boolean, cuentaId?: number, fechaFin?: string): Promise<DesvinculacionResult> => {
        let url = `${API_BASE_URL}/api/mantenimiento/desvincular-movimientos?fecha=${fecha}&backup=${backup}`;
        if (fechaFin) {
            url += `&fecha_fin=${fechaFin}`;
        }
        if (cuentaId) {
            url += `&cuenta_id=${cuentaId}`;
        }
        const response = await fetch(url, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al desvincular movimientos');
        }
        return response.json();
    },

    desvincularLote: async (ids: number[], backup: boolean = true): Promise<DesvinculacionResult> => {
        let url = `${API_BASE_URL}/api/mantenimiento/desvincular-lote?backup=${backup}`;
        ids.forEach(id => {
            url += `&ids=${id}`;
        });

        const response = await fetch(url, {
            method: 'POST',
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al desvincular movimientos en lote');
        }
        return response.json();
    }
};
