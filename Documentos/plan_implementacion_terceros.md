# Plan de Implementación: Centralización de Tercero en Encabezado con Soporte para Splits

## Contexto y Objetivo
Actualmente, la aplicación gestiona el `tercero_id` principalmente en los detalles del movimiento. Se busca centralizar la referencia principal en `movimientos_encabezado.terceroid` para simplificar la clasificación, búsqueda y filtrado general, sin perder la capacidad de realizar desgloses (splits) con terceros diferentes por cada detalle.

**Ejemplo de uso:**
*   **Encabezado:** Pago total de Impuestos (Tercero: DIAN/Impuestos).
*   **Detalle 1:** Porción a nombre de "Tita" (Tercero: Tita).
*   **Detalle 2:** Porción a nombre de "Montoya e Hijas" (Tercero: Montoya).

---

## 1. Dominio (Domain Models)

### `src/domain/models/movimiento.py`
- [ ] Asegurar que `tercero_id` sea un campo de primer nivel en la clase `Movimiento`.
- [ ] Actualizar `necesita_clasificacion`: Un movimiento se considera identificado visualmente si tiene `tercero_id` en el encabezado.
- [ ] Ajustar propiedades de compatibilidad (`tercero_nombre`) para que lean preferiblemente del encabezado.

### `src/domain/models/movimiento_detalle.py`
- [ ] **NO ELIMINAR**: Mantener `tercero_id` en el detalle para soportar la realidad contable de los splits.

---

## 2. Infraestructura (Data Repository)

### `src/infrastructure/database/postgres_movimiento_repository.py`
- [ ] **Filtros principales**: Modificar `_construir_filtros` para que el parámetro `tercero_id` filtre por `m.terceroid` (encabezado) en lugar de `md.TerceroID`.
- [ ] **Consultas de lectura**:
    - [ ] Actualizar `obtener_por_id`, `buscar_avanzado`, etc., para hacer el JOIN de `terceros` con la tabla `movimientos_encabezado`.
- [ ] **Lógica de Persistencia (Guardado)**:
    - [ ] En el método `guardar()`, asegurar que el `tercero_id` del encabezado se guarde en `movimientos_encabezado`.
    - [ ] Mantener la lógica de guardar `tercero_id` específicos en cada fila de `movimientos_detalle`.
- [ ] **Reportes**:
    - [ ] `resumir_por_clasificacion` (Vista Tercero): Usar el tercero del encabezado para el resumen ejecutivo.
    - [ ] `obtener_desglose_gastos`: Mantener el uso del tercero del detalle para permitir ver a Tita y Montoya por separado en el análisis de gastos.

---

## 3. Servicios (Business Logic)

### `src/application/services/clasificacion_service.py`
- [ ] Actualizar el pipeline de clasificación para que las reglas automáticas (patterns) asignen primeramente el `tercero_id` al encabezado.
- [ ] En las sugerencias, priorizar la identificación de la "Identidad del Movimiento" (Encabezado).

---

## 4. API (FastAPI)

### `src/infrastructure/api/routers/movimientos.py`
- [ ] Revisar el `MovimientoDTO` para asegurar que el `tercero_id` se reciba correctamente a nivel de raíz.
- [ ] Actualizar la función `_to_response` para que el `tercero_display` y nombres de visualización vengan del encabezado en la lista principal.

---

## 5. Base de Datos (Migración)

- [ ] Crear script para poblar `movimientos_encabezado.terceroid` a partir del primer detalle existente para todos los registros históricos.
- [ ] Asegurar que la columna `terceroid` en el encabezado tenga los índices adecuados para búsquedas rápidas.

---

## Próximos Pasos (Orden de ejecución sugerido)
1.  **Migración de Datos**: Llenar los campos vacíos en el encabezado basados en los detalles.
2.  **Modelos de Dominio**: Ajustar la lógica de negocio.
3.  **Repositorio**: Cambiar la prioridad de los JOINs y filtros.
4.  **UI (Frontend)**: (Siguiente fase) Ajustar para que el selector principal de tercero afecte al encabezado.
