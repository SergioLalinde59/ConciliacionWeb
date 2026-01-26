# Separación Procesador de Archivos Service

Este documento resume el análisis y el plan de acción para simplificar el proceso de carga de datos, eliminando la complejidad excesiva del archivo actual.

## 1. Situación Actual
El archivo `procesador_archivos_service.py` ha crecido hasta las ~1,000 líneas, actuando como un "God Object" que mezcla:
- Identificación de formatos (Se moverá a un componente común orquestador).
- Lectura de archivos (PDF/CSV).
- Validación matemática de saldos.
- Persistencia en múltiples tablas de la base de datos.
- Lógica de negocio específica por tipo de cuenta (MasterCard, Ahorros, Fondos).

## 2. Hallazgos Técnicos
- **Clasificación**: Se confirmó que la lógica de clasificación de movimientos **no reside en este archivo**, sino en `clasificacion_service.py`. Esto hace que el refactor sea seguro.
- **Extractores**: El procesador no lee los PDFs directamente; delega esta tarea a scripts externos (extractores) según el `cuenta_id`.
- **Problema Detectado**: Existe una validación basada en "palabras clave" (ej: "VALOR") que causa fallos en la sumatoria de saldos. Se determinó que debe ser reemplazada por una lógica basada puramente en el **signo** del movimiento.

## 3. Propuesta de Partición
Se propone dividir el bloque monolítico en dos servicios especializados con misiones claras:

### A. `CargarMovimientosService`
- **Misión**: Carga rápida y mecánica de datos crudos.
- **Archivos**: PDFs Diarios, CSV y Excel.
- **Alcance**: Solo lectura, detección de duplicados e inserción en la tabla de `movimientos`.

### B. `CargarExtractoBancarioService`
- **Misión**: Validación contable y oficial de fin de mes.
- **Archivos**: PDFs de Extracto Mensual.
- **Alcance**: Lectura de encabezados (Saldos inicial/final), validación cruzada (sumatoria de cifras) y actualización de la tabla de `conciliaciones`.
- **Importante**: También actualiza la tabla `movimientos_extracto` una vez que los movimientos han sido visualizados y confirmados/aprobados por el usuario.

## 4. Mapa de Distribución de Funciones

Para ser precisos, así se repartirán las funciones actuales del Procesador:

| Función Actual | Destino | Razón |
| :--- | :--- | :--- |
| `analizar_archivo` | `CargarMovimientosService` | Previsualización de movimientos diarios/sueltos. |
| `procesar_archivo` | `CargarMovimientosService` | Guardado de movimientos diarios. |
| `analizar_extracto` | `CargarExtractoBancarioService` | Validación de cifras y saldos mensuales (PDF). |
| `procesar_extracto` | `CargarExtractoBancarioService` | Persistencia de conciliación y extractos confirmados. |
| `_extraer_movimientos` | `CargarMovimientosService` | Lógica de lectura mecánica compartida. |
| `_obtener_modulos...` | Componente Compartido | Centraliza la configuración de extractores. |

## 5. Beneficios Esperados
1. **Simplicidad**: Archivos de máxima 300 líneas, fáciles de leer y mantener.
2. **Robustez**: Eliminación de falsos positivos en las sumatorias al usar solo signos.
3. **Mantenibilidad**: Si un banco cambia el formato diario, no se afecta el flujo de los extractos mensuales.
