# Documentación de Gestión de Movimientos del Sistema

Esta documentación detalla los puntos de entrada y gestión ("lugares donde se tocan") los **Movimientos del Sistema** dentro de la aplicación ConciliaciónWeb.

La manipulación de estos datos se centraliza principalmente a través del servicio `movimientosService` (o `apiService.movimientos` en el frontend).

## Resumen de Módulos y Páginas

A continuación se listan las páginas agrupadas por el tipo de operación que realizan sobre los movimientos:

### 1. Gestión Principal (CRUD)
Páginas dedicadas a la visualización, creación y edición individual de movimientos.

| Página (Componente) | Ruta | Acciones Principales | Archivo Fuente |
| :--- | :--- | :--- | :--- |
| **MovimientosPage** | `/movimientos` | **Lectura:** Visualiza el listado general.<br>**Eliminación:** Borrado individual de registros.<br>**Navegación:** Redirige a formularios de creación/edición. | `frontend/src/pages/MovimientosPage.tsx` |
| **MovimientoFormPage** | `/movimientos/nuevo`<br>`/movimientos/editar/:id` | **Creación:** Ingresa nuevos movimientos manuales.<br>**Actualización:** Edita campos de movimientos existentes. | `frontend/src/pages/MovimientoFormPage.tsx` |

### 2. Carga y Clasificación Masiva
Páginas diseñadas para la manipulación en lote, importación de datos y clasificación masiva.

| Página (Componente) | Ruta | Acciones Principales | Archivo Fuente |
| :--- | :--- | :--- | :--- |
| **UploadMovimientosPage** | `/movimientos/cargar` | **Creación Masiva:** Importa movimientos desde archivos Excel/CSV al sistema. | `frontend/src/pages/UploadMovimientosPage.tsx` |
| **ClasificarMovimientosPage** | `/movimientos/clasificar` | **Actualización Masiva:** Modifica en lote la clasificación (Tercero, Centro de Costo, Concepto). | `frontend/src/pages/ClasificarMovimientosPage.tsx` |
| **SugerenciasReclasificacionPage** | `/movimientos/sugerencias` | **Actualización Masiva:** Aplica sugerencias de reclasificación basadas en patrones o reglas inteligentes. | `frontend/src/pages/SugerenciasReclasificacionPage.tsx` |

### 3. Conciliación y Matching
Módulos donde se ajustan los movimientos para cuadrarlos con los extractos bancarios.

| Página (Componente) | Ruta | Acciones Principales | Archivo Fuente |
| :--- | :--- | :--- | :--- |
| **ConciliacionMatchingPage** | `/conciliacion/matching` | **Creación:** Genera movimientos de sistema faltantes desde el extracto.<br>**Actualización:** Corrige movimientos para lograr el match.<br>**Eliminación:** Borra movimientos "Sin Match" sobrantes. | `frontend/src/pages/ConciliacionMatchingPage.tsx` |

### 4. Herramientas de Mantenimiento
Herramientas administrativas para la gestión profunda o limpieza de datos.

| Página (Componente) | Ruta | Acciones Principales | Archivo Fuente |
| :--- | :--- | :--- | :--- |
| **EliminarMovimientosPage** | `/herramientas/mantenimiento/eliminar-movimientos` | **Eliminación Masiva:** Borrado físico masivo de registros por rango de fechas y cuenta. | `frontend/src/pages/mantenimiento/EliminarMovimientosPage.tsx` |

---

## Detalles Técnicos

### Servicio Principal
El archivo `frontend/src/services/movements.service.ts` es el encargado de comunicar estas acciones con el Backend.

### Métodos Clave Utilizados
Las páginas mencionadas interactúan con los siguientes métodos del servicio:

*   **`listar`**: Obtención de datos filtrados.
*   **`obtenerPorId`**: Detalle de un movimiento.
*   **`crear`**: Inserción de un nuevo registro.
*   **`actualizar`**: Modificación de un registro existente.
*   **`eliminar`**: Borrado de un registro por ID.
*   **`eliminarLote`**: Borrado de múltiples registros por lista de IDs.
*   **`clasificarLote` / `reclasificarLote`**: Actualización masiva de campos de clasificación.
*   **`crearMovimientosLote`** (vía `matchingService`): Creación rápida desde extractos.
