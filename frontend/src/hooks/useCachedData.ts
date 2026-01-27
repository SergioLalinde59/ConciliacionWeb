import { useState, useEffect } from 'react';
import { appCache } from '../utils/cache';

/**
 * Hook personalizado para usar datos con caché.
 * 
 * @param cacheKey - Clave única para el caché
 * @param fetchFn - Función async que obtiene los datos
 * @param options - Opciones de configuración
 * @returns Estado con datos, loading y error
 * 
 * @example
 * const { data, loading, error, refresh } = useCachedData(
 *   'terceros:list',
 *   () => apiService.terceros.listar(),
 *   { ttl: 10 * 60 * 1000 }
 * );
 */
export function useCachedData<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    options: {
        ttl?: number;
        skipCache?: boolean;
    } = {}
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchData = async (forceRefresh: boolean = false) => {
        try {
            setLoading(true);
            setError(null);

            // Intentar obtener del caché primero
            if (!forceRefresh && !options.skipCache) {
                const cached = appCache.get<T>(cacheKey);
                if (cached) {
                    setData(cached);
                    setLoading(false);
                    return;
                }
            }

            // Si no hay caché, hacer fetch
            const result = await fetchFn();

            // Guardar en caché
            if (!options.skipCache) {
                appCache.set(cacheKey, result, options.ttl);
            }

            setData(result);
        } catch (err) {
            setError(err as Error);
            console.error(`Error fetching data for ${cacheKey}:`, err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch inicial
    useEffect(() => {
        fetchData();
    }, [cacheKey]);

    // Función para refrescar manualmente
    const refresh = () => {
        fetchData(true);
    };

    return { data, loading, error, refresh };
}
