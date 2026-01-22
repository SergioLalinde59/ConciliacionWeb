import { API_BASE_URL, handleResponse } from './httpClient';
import type { Conciliacion, ConciliacionUpdate } from '../types/Conciliacion';

export const conciliacionService = {
    getByPeriod: async (cuentaId: number, year: number, month: number): Promise<Conciliacion> => {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/${cuentaId}/${year}/${month}`);
        return handleResponse(response);
    },

    save: async (data: ConciliacionUpdate): Promise<Conciliacion> => {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    recalculate: async (cuentaId: number, year: number, month: number): Promise<Conciliacion> => {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/${cuentaId}/${year}/${month}/recalcular`, {
            method: 'POST'
        });
        return handleResponse(response);
    },

    async analizarExtracto(file: File, tipoCuenta: string, cuentaId?: number | null) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipoCuenta)
        if (cuentaId) formData.append('cuenta_id', cuentaId.toString())

        // Assuming httpClient is imported or defined elsewhere, and handleResponse is used for fetch.
        // If httpClient is a different client (e.g., axios), the import and usage would need adjustment.
        // For consistency with existing code, we'll use fetch and handleResponse.
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/analizar-extracto`, {
            method: 'POST',
            headers: {
                // 'Content-Type': 'multipart/form-data' is automatically set by fetch when using FormData
            },
            body: formData
        })
        return handleResponse(response)
    },

    async cargarExtracto(file: File, tipoCuenta: string, cuentaId: number, year: number | undefined, month: number | undefined) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('tipo_cuenta', tipoCuenta)
        formData.append('cuenta_id', cuentaId.toString())
        if (year) formData.append('year', year.toString())
        if (month) formData.append('month', month.toString())

        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/cargar-extracto`, {
            method: 'POST',
            body: formData
        })
        return handleResponse(response)
    },

    async obtenerMovimientosExtracto(cuentaId: number, year: number, month: number) {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/${cuentaId}/${year}/${month}/movimientos-extracto`);
        return handleResponse(response);
    },

    async obtenerMovimientosSistema(cuentaId: number, year: number, month: number) {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/${cuentaId}/${year}/${month}/movimientos-sistema`);
        return handleResponse(response);
    },


    async compararMovimientos(cuentaId: number, year: number, month: number) {
        const response = await fetch(`${API_BASE_URL}/api/conciliaciones/${cuentaId}/${year}/${month}/comparacion`);
        return handleResponse(response);
    },

    async obtenerMatches(cuentaId: number, year: number, month: number) {
        const response = await fetch(`${API_BASE_URL}/api/matching/${cuentaId}/${year}/${month}`);
        return handleResponse(response);
    }

};
