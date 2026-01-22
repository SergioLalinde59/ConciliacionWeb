/**
 * API Service - Punto de entrada unificado
 * 
 * Este archivo re-exporta todos los servicios individuales para mantener
 * compatibilidad con el código existente que importa desde 'services/api'.
 * 
 * Para nuevos desarrollos, se recomienda importar directamente desde
 * los servicios específicos:
 * - import { movimientosService } from './movements.service'
 * - import { catalogosService } from './catalogs.service'
 * - etc.
 */

// Re-exportar tipos compartidos
export type { PaginatedResponse } from './httpClient'

// Importar servicios individuales
import { movimientosService, clasificacionService } from './movements.service'
import { catalogosService, centrosCostosService, cuentasService, tercerosService, conceptosService } from './catalogs.service'
import { archivosService } from './files.service'
import { reglasService, configFiltrosCentrosCostosService } from './config.service'
import { conciliacionService } from './conciliacionService'
import { extractoresService } from './extractores.service'
import { matchingService } from './matching.service'
import { dashboardService } from './dashboard.service'

/**
 * Objeto apiService unificado para compatibilidad con código existente
 * 
 * @deprecated Preferir importar servicios individuales directamente
 */
export const apiService = {
    // Movimientos y clasificación
    movimientos: movimientosService,
    clasificacion: clasificacionService,

    // Catálogos
    catalogos: catalogosService,
    centrosCostos: centrosCostosService,
    // Alias opcional para compatibilidad si se desea, o eliminar
    // grupos: centrosCostosService, 
    cuentas: cuentasService,
    terceros: tercerosService,
    conceptos: conceptosService,

    // Archivos
    archivos: archivosService,

    // Configuración
    reglas: reglasService,
    configFiltrosCentrosCostos: configFiltrosCentrosCostosService,

    // New Terceros methods
    getTerceros: tercerosService.listar,
    getTerceroDescripciones: tercerosService.listarDescripciones,
    createTerceroDescripcion: tercerosService.crearDescripcion,
    updateTerceroDescripcion: tercerosService.actualizarDescripcion,
    deleteTerceroDescripcion: tercerosService.eliminarDescripcion,

    // Conciliacion
    conciliacion: conciliacionService,
    extractores: extractoresService,

    // Matching
    matching: matchingService,

    // Dashboard
    dashboard: dashboardService
}

// Exportar servicios individuales para uso directo
export {
    movimientosService,
    clasificacionService,
    catalogosService,
    centrosCostosService,
    cuentasService,
    tercerosService,
    conceptosService,
    archivosService,
    reglasService,
    configFiltrosCentrosCostosService,
    conciliacionService,
    extractoresService,
    matchingService,
    dashboardService
}
