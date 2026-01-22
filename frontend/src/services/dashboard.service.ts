import { API_BASE_URL, handleResponse } from './httpClient'

export interface DashboardStats {
    periodo: string
    cuenta_id: number
    cuenta_nombre: string
    centro_costo_id: number | null
    centro_costo_nombre: string
    conteo: number
    ingresos: number
    egresos: number
}

export const dashboardService = {
    obtenerEstadisticas: (desde?: string, hasta?: string): Promise<DashboardStats[]> => {
        const params = new URLSearchParams()
        if (desde) params.append('desde', desde)
        if (hasta) params.append('hasta', hasta)

        return fetch(`${API_BASE_URL}/api/dashboard/estadisticas?${params.toString()}`).then(handleResponse)
    }
}
