# Plan de Mejoras y Sugerencias

Este documento detalla oportunidades de mejora para elevar la calidad, mantenibilidad y escalabilidad del código, basándose en la evolución de la solución web.

## 1. Frontend: Evolución y Diseño

### ✅ Adopción de Atomic Design (Completado)
Se ha implementado una estructura clara:
- **Atoms**: `Button`, `Input`, `Checkbox`, `CurrencyDisplay`.
- **Molecules**: `DataTable`, `Modal`, `ComboBox`, `DateRangeSelector`.
- **Organisms**: `Sidebar`, `FiltrosReporte`.

### ✅ Gestión de Estado con TanStack Query (Completado)
Se migró la lógica de fetch y cache manual a `useQuery` y `useMutation`.
- Catálogos cacheados automáticamente.
- Invalidación de queries tras ediciones exitosas.

### 🔴 Sugerencia: Temas y Modo Oscuro
Aprovechar Tailwind CSS 4 para implementar un modo oscuro nativo y un sistema de temas para personalizar la estética según la cuenta o tipo de reporte.

### 🔴 Sugerencia: Pruebas de Componentes
Implementar tests unitarios para los átomos y moléculas más críticos (e.g., `CurrencyDisplay`, `DataTable`) usando **Vitest** y **React Testing Library**.

## 2. Backend: Robustez y Calidad

### ✅ Estandarización de Repositorios (Completado)
Se han separado las responsabilidades en múltiples archivos de repositorio en `infrastructure/database`, facilitando el mantenimiento.

### ✅ Gestión Dinámica de Pendientes (Completado)
Se implementó la lógica de `config_valores_pendientes` para desacoplar el estado "pendiente" de valores `NULL` estrictos.

### 🔴 Sugerencia: Pruebas Unitarias del Dominio
El `ClasificacionService` contiene lógica de negocio crítica compleja (sugerencias, Fondo Renta, etc.). Se recomienda crear una suite de pruebas con **Pytest** y mocks para los repositorios.

### 🔴 Sugerencia: Logging Estructurado
Migrar el logging actual a una librería como `structlog` o `loguru` para facilitar el rastreo de errores en producción y auditorías de clasificación automática.

## 3. Código y Patrones (Mantenimiento Continuo)

### ✅ Componentes UI Genéricos (Completado)
- `DataTable` ahora maneja de forma genérica casi todos los listados del sistema.
- `Modal` estandarizado para formularios rápidos.

### 🔴 Sugerencia: Validación Cruzada de Datos
Implementar una tarea programada (o endpoint de auditoría) que verifique la consistencia entre los movimientos clasificados y los totales de las cuentas reales, detectando discrepancias o clasificaciones erróneas.

## 4. Historial de Logros (Checklist)

1.  ✅ **Refactorizar `api.ts`**: Dividido en servicios por dominio.
2.  ✅ **Atomic Design**: Componentes base normalizados.
3.  ✅ **React Query**: Implementado en toda la aplicación.
4.  ✅ **DataTable Genérico**: Abstracción de tablas de catálogos y movimientos.
5.  ✅ **Modal Base**: Estandarización de ventanas emergentes.
6.  ✅ **Tipado Estricto**: Eliminación de `any` en la mayoría de los servicios y componentes.
7.  ✅ **Soporte Multimoneda**: Formateo y visualización de USD/COP centralizado.

## 5. Próximos Pasos Estratégicos

1.  **Observabilidad**: Integrar un sistema de seguimiento de errores (e.g., Sentry) para capturar fallos en el proceso de extracción de PDFs.
2.  **Rendimiento**: Implementar virtualización de listas (e.g., `react-window`) en la `MovementsTable` para manejar eficientemente miles de registros sin degradar la UI.
3.  **Seguridad**: Revisar políticas de CORS y añadir autenticación/autorización robusta si la aplicación se vuelve multiusuario.





