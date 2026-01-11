/**
 * Sistema simple de caché en memoria para datos del frontend.
 * 
 * Útil para datos que:
 * - Se consultan frecuentemente
 * - Cambian poco
 * - No son críticos en tiempo real
 * 
 * Ejemplo: catálogos (terceros, grupos, conceptos)
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<any>>;
    private defaultTTL: number;

    constructor(defaultTTL: number = 5 * 60 * 1000) { // 5 minutos por defecto
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    /**
     * Obtiene un valor del caché si existe y no ha expirado.
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const now = Date.now();
        const age = now - entry.timestamp;

        if (age > this.defaultTTL) {
            // Expirado, eliminar
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Guarda un valor en el caché.
     */
    set<T>(key: string, data: T, _customTTL?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Elimina un valor específico del caché.
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Invalida todo el caché.
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Invalida todas las claves que coincidan con un patrón.
     */
    invalidatePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Obtiene estadísticas del caché.
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Instancia global del caché
export const appCache = new SimpleCache(5 * 60 * 1000); // 5 minutos

// Configuración de TTL específica por tipo de dato
export const CACHE_CONFIG = {
    CATALOGOS: 10 * 60 * 1000,  // 10 minutos - cambian muy poco
    MOVIMIENTOS_LIST: 30 * 1000, // 30 segundos - cambian frecuentemente
    REPORTES: 2 * 60 * 1000,     // 2 minutos - datos calculados
};

// Claves de caché predefinidas
export const CACHE_KEYS = {
    CATALOGOS_TODOS: 'catalogos:todos',
    TERCEROS_LIST: 'terceros:list',
    GRUPOS_LIST: 'grupos:list',
    CONCEPTOS_LIST: 'conceptos:list',
    CUENTAS_LIST: 'cuentas:list',
    MONEDAS_LIST: 'monedas:list',
};
