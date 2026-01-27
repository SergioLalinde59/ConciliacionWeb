import { useQuery } from '@tanstack/react-query'
import { apiService } from '../services/api'
// Importamos tipos de respuesta si es necesario, o usamos los genéricos del servicio
// Importamos tipos de respuesta si es necesario, o usamos los genéricos del servicio

export const REPORTES_QUERY_KEYS = {
    all: ['reportes'] as const,
    clasificacion: (params: any) => [...REPORTES_QUERY_KEYS.all, 'clasificacion', params] as const,
    ingresosMes: (params: any) => [...REPORTES_QUERY_KEYS.all, 'ingresosMes', params] as const,
    desglose: (params: any) => [...REPORTES_QUERY_KEYS.all, 'desglose', params] as const,
    configuracionExclusion: () => [...REPORTES_QUERY_KEYS.all, 'configuracionExclusion'] as const,
} as const

/**
 * Hook para Reporte de Clasificaciones
 */
export const useReporteClasificacion = (params: any, options = {}) => {
    return useQuery({
        queryKey: REPORTES_QUERY_KEYS.clasificacion(params),
        queryFn: () => apiService.movimientos.reporteClasificacion(params),
        // No guardar en caché por mucho tiempo si los filtros cambian mucho, o sí?
        // 5 minutos de staleTime parece razonable para reportes
        staleTime: 5 * 60 * 1000,
        ...options
    })
}

/**
 * Hook para Reporte de Ingresos y Gastos por Mes
 */
export const useReporteIngresosGastosMes = (params: any, options = {}) => {
    return useQuery({
        queryKey: REPORTES_QUERY_KEYS.ingresosMes(params),
        queryFn: ({ }) => {
            // TypeScript safe cast de params desde queryKey si fuera necesario, 
            // pero podemos usar la closure 'params'
            // Nota: apiService espera ReporteIngresosMesParams
            return apiService.movimientos.reporteIngresosGastosMes(params as any)
        },
        staleTime: 5 * 60 * 1000,
        ...options
    })
}

/**
 * Hook para Reporte de Desglose (Drilldowns)
 */
export const useReporteDesgloseGastos = (params: any, enabled: boolean = true) => {
    return useQuery({
        queryKey: REPORTES_QUERY_KEYS.desglose(params),
        queryFn: () => apiService.movimientos.reporteDesgloseGastos(params as any),
        enabled, // Importante para drilldowns que solo cargan al abrir modal
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook para Configuración de Filtros de Exclusión
 */
export const useConfiguracionExclusion = () => {
    return useQuery({
        queryKey: REPORTES_QUERY_KEYS.configuracionExclusion(),
        queryFn: apiService.movimientos.obtenerConfiguracionFiltrosExclusion,
        staleTime: 60 * 60 * 1000, // Configuración muy estática
    })
}
