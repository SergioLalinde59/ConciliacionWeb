# Estrategia de Carga y Mantenimiento de Extractos

Este documento describe la arquitectura de procesamiento de archivos del sistema y la estrategia para su mantenimiento y evolución.

## 1. Arquitectura de Procesamiento
Para mantener la simplicidad y robustez, el procesamiento de archivos se divide en dos grandes flujos:

### A. Carga de Movimientos (Mecánica)
- **Objetivo**: Volcado rápido de transacciones diarias o históricas.
- **Fuentes**: PDFs de movimientos diarios, archivos CSV o Excel.
- **Lógica**: Lectura simple e inserción en la base de datos de movimientos.

### B. Carga de Extractos (Contable/Validación)
- **Objetivo**: Carga del extracto oficial mensual con validación de saldos.
- **Fuentes**: PDFs de Extracto Bancario Mensual.
- **Lógica**: 
  - Extracción de saldos de control (Anterior, Final, Abonos, Cargos).
  - **Validación por Signo**: Sumatoria matemática de los movimientos leídos (Positivos vs. Negativos) para asegurar que el contenido coincide con los totales del banco.
  - Generación de la Conciliación Mensual.

## 2. Guía de Mantenimiento: Cambios en Formatos Bancarios
Una de las mayores ventajas de esta estructura es que los servicios de carga son independientes del formato visual del PDF.

Si un banco cambia su formato (por ejemplo, mueve una columna o cambia un nombre), el procedimiento es:

1.  **Actualizar el Extractor**: Se modifica o crea un nuevo script especializado en `src/infrastructure/extractors/bancolombia/`. Este script es el único que "conoce" la estructura del PDF.
2.  **Configurar en Base de Datos**: Se actualiza la tabla `cuenta_extractor` para indicarle al sistema que use el nuevo script para la cuenta afectada.

**Resultado**: El "motor" del sistema no sufre cambios; el mantenimiento se hace de forma aislada y segura.

## 3. Clasificación de Movimientos
Es importante recordar que la **Clasificación** (asignación de Terceros, Conceptos, etc.) es un proceso posterior y totalmente independiente de la carga. Vive en su propio servicio ocupándose únicamente del análisis de las descripciones originales una vez que ya están guardadas en el sistema.
