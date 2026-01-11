import { QueryClient } from '@tanstack/react-query'

/**
 * Instancia global del QueryClient para uso fuera de componentes React
 * Se inicializa en main.tsx y se exporta para uso en servicios
 */
let queryClient: QueryClient | null = null

export const setQueryClient = (client: QueryClient) => {
    queryClient = client
}

export const getQueryClient = (): QueryClient | null => {
    return queryClient
}

/**
 * Query keys centralizados para toda la aplicación
 */
export const QUERY_KEYS = {
    // Catálogos
    catalogos: {
        all: ['catalogos'] as const,
        todos: () => [...QUERY_KEYS.catalogos.all, 'todos'] as const,
    },
    // Movimientos
    movimientos: {
        all: ['movimientos'] as const,
        list: (filters?: Record<string, any>) => [...QUERY_KEYS.movimientos.all, 'list', filters] as const,
        detail: (id: number) => [...QUERY_KEYS.movimientos.all, 'detail', id] as const,
        pendientes: () => [...QUERY_KEYS.movimientos.all, 'pendientes'] as const,
    },
    // Reportes
    reportes: {
        all: ['reportes'] as const,
        clasificacion: (params?: Record<string, any>) => [...QUERY_KEYS.reportes.all, 'clasificacion', params] as const,
        ingresosMes: (params?: Record<string, any>) => [...QUERY_KEYS.reportes.all, 'ingresos-mes', params] as const,
        desglose: (params?: Record<string, any>) => [...QUERY_KEYS.reportes.all, 'desglose', params] as const,
    },
} as const

/**
 * Helper para invalidar queries desde servicios (fuera de React)
 */
export const invalidateQueries = (queryKey: readonly unknown[]) => {
    if (queryClient) {
        queryClient.invalidateQueries({ queryKey })
    }
}

/**
 * Helper para invalidar todos los catálogos
 */
export const invalidateCatalogos = () => {
    invalidateQueries(QUERY_KEYS.catalogos.all)
}
