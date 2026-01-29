# Plan de Implementación: Centralización de Tercero en Encabezado con Soporte para Splits

## Contexto y Objetivo
Se requiere centralizar la referencia principal del `tercero_id` en la tabla `movimientos_encabezado` para estandarizar la identificación, búsqueda y filtrado de transacciones. A su vez, se debe preservar la capacidad de manejar múltiples terceros en los detalles de un mismo movimiento para casos de transacciones divididas (splits).

### Relación de Campos y Clasificación
Un movimiento se considera **clasificado y completo** cuando se cumplen estas condiciones:
1.  **Identificación (Encabezado):** Tiene un `tercero_id` definido.
2.  **Imputación (Detalles):** Todos sus detalles tienen `centro_costo_id` y `concepto_id`.
3.  **Consistencia:** Cada detalle tiene un `tercero_id` (por defecto el del encabezado, o uno específico en caso de split).

---

## 1. Dominio (Domain Models)

### `src/domain/models/movimiento.py`
- [ ] **Validación de Identidad:** El campo `tercero_id` en el encabezado es obligatorio para que el movimiento no figure como "Pendiente".
- [ ] **Propiedad `necesita_clasificacion`:** Actualizar la lógica:
    ```python
    def necesita_clasificacion(self) -> bool:
        if self.tercero_id is None: return True # Falta identidad general
        for d in self.detalles:
            if d.centro_costo_id is None or d.concepto_id is None:
                return True # Falta imputación contable
        return False
    ```
- [ ] **Getters/Setters de Compatibilidad:**
    - Al asignar un `tercero_id` al movimiento (si no hay split activo), se debe propagar opcionalmente al primer detalle para mantener sincronía.

### `src/domain/models/movimiento_detalle.py`
- [ ] **Persistencia de Tercero:** Mantener `tercero_id` para soportar beneficiarios específicos por cada línea de gasto.

---

## 2. Infraestructura (Data Repository)

### `src/infrastructure/database/postgres_movimiento_repository.py`
- [ ] **Filtros Globales:** Modificar `_construir_filtros` para que la búsqueda por tercero use `m.terceroid`.
- [ ] **Consultas de Datos:**
    - [ ] Ajustar `obtener_por_id`, `buscar_avanzado`, `obtener_todos` para que el JOIN con la tabla `terceros` se haga desde `movimientos_encabezado`.
- [ ] **Lógica de Persistencia (`guardar`):**
    - [ ] Asegurar el guardado correcto del campo en la tabla `movimientos_encabezado`.
    - [ ] Garantizar que los detalles guarden su propio `terceroid`.
- [ ] **Reportes:**
    - [ ] **Resumen Ejecutivo:** Agrupar por el tercero del encabezado.
    - [ ] **Desglose de Gastos:** Permitir la agrupación por el tercero del detalle para visualizar splits (Tita/Montoya).

---

## 3. Servicios (Business Logic)

### `src/application/services/clasificacion_service.py`
- [ ] **Pipeline de Auto-clasificación:** Las reglas de patrones (regex/keywords) deben asignar el tercero directamente al encabezado.
- [ ] **Sugerencias:** El motor de búsqueda histórica debe proponer el tercero para el encabezado basándose en la descripción del movimiento bancario.

---

## 4. API y DTOs

### `src/infrastructure/api/routers/movimientos.py`
- [ ] **`MovimientoDTO`:** Validar que el `tercero_id` de la raíz sea procesado como el ID del encabezado.
- [ ] **Formatos de Respuesta:** Asegurar que el campo `tercero_nombre` devuelto para la lista principal provenga del JOIN del encabezado.

---

## 5. Base de Datos (Migración)

- [ ] **Script de Sincronización:** Ejecutar `UPDATE movimientos_encabezado m SET terceroid = (SELECT md.terceroid FROM movimientos_detalle md WHERE md.movimiento_id = m.id LIMIT 1) WHERE m.terceroid IS NULL;`
- [ ] **Índices:** Crear índice en `movimientos_encabezado(terceroid)` para optimización de filtros.

---

## Pasos Inmediatos
1.  **Ejecutar Migración de Datos** (Sincronizar históricos).
2.  **Actualizar `MovimientoRepository`** (Cambiar prioridad de filtros y joins).
3.  **Refactorizar `ClasificacionService`** (Asignación orientada a encabezado).
