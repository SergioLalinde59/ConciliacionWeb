import { useQuery, useQueryClient } from '@tanstack/react-query'
import { catalogosService } from '../services/catalogs.service'

/**
 * Query keys para catálogos - Centralizados para fácil invalidación
 */
export const CATALOG_QUERY_KEYS = {
    all: ['catalogos'] as const,
    todos: () => [...CATALOG_QUERY_KEYS.all, 'todos'] as const,
} as const

/**
 * Hook para obtener todos los catálogos usando React Query
 * 
 * Ventajas sobre la implementación anterior:
 * - Cacheo automático (configurable en QueryClient)
 * - Estados de loading/error integrados
 * - Revalidación automática al volver a la app
 * - Deduplicación de peticiones simultáneas
 * - Fácil invalidación con queryClient.invalidateQueries
 */
export const useCatalogos = () => {
    const queryClient = useQueryClient()

    const {
        data,
        isLoading,
        isError,
        error,
        refetch
    } = useQuery({
        queryKey: CATALOG_QUERY_KEYS.todos(),
        queryFn: catalogosService.obtenerTodos,
        // Los catálogos cambian poco, mantener frescos por más tiempo
        staleTime: 10 * 60 * 1000, // 10 minutos
    })

    /**
     * Invalida el caché de catálogos (llamar después de crear/editar entidades)
     */
    const invalidar = () => {
        queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.all })
    }

    return {
        // Datos desestructurados para compatibilidad con useCatalogo anterior
        cuentas: data?.cuentas ?? [],
        terceros: data?.terceros ?? [],
        grupos: data?.grupos ?? [],
        conceptos: data?.conceptos ?? [],
        monedas: data?.monedas ?? [],

        // Estados
        loading: isLoading,
        error: isError ? (error instanceof Error ? error.message : 'Error desconocido') : null,

        // Acciones
        refresh: refetch,
        invalidar,
    }
}

/**
 * Hook de compatibilidad - alias para useCatalogos
 * @deprecated Usar useCatalogos directamente
 */
export const useCatalogo = useCatalogos
