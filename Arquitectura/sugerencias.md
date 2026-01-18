# Plan de Mejoras y Sugerencias

Este documento detalla oportunidades de mejora para elevar la calidad, mantenibilidad y escalabilidad del código, basándose en la evolución de la solución web.

## 1. Frontend: Evolución y Diseño

### ✅ Adopción de Atomic Design (Completado)
Se ha implementado una estructura clara:
- **Atoms** (7): `Button`, `Input`, `Checkbox`, `CurrencyDisplay`, `Select`, `Card`, `Badge`
- **Molecules** (10): `DataTable`, `Modal`, `ComboBox`, `DateRangeSelector`, `Pagination`, `EditableCurrencyCell`, etc.
- **Organisms**: `Sidebar`, `FiltrosReporte`, modales especializados (9), tablas especializadas (8)
- **Templates**: `MainLayout`
- **Pages** (22): Cobertura completa de funcionalidades

### ✅ Gestión de Estado con TanStack Query (Completado)
Se migró la lógica de fetch y cache manual a `useQuery` y `useMutation`:
- Catálogos cacheados automáticamente
- Invalidación de queries tras ediciones exitosas
- Gestión automática de loading y error states
- Retry logic configurado

### ✅ Rutas Completas del Sistema (Completado - 24 rutas)
- Dashboard, 9 maestros, 7 páginas de movimientos, 2 de conciliación, 5 reportes
- Navegación fluida con React Router DOM v7

### 🔴 Sugerencia: Temas y Modo Oscuro
Aprovechar Tailwind CSS 4 para implementar un modo oscuro nativo y un sistema de temas para personalizar la estética según la cuenta o tipo de reporte.

### 🔴 Sugerencia: Pruebas de Componentes
Implementar tests unitarios para los átomos y moléculas más críticos (e.g., `CurrencyDisplay`, `DataTable`, `EditableCurrencyCell`) usando **Vitest** y **React Testing Library**.

### 🔴 Sugerencia: Lazy Loading de Rutas
Implementar code-splitting manual con `React.lazy()` para mejorar el tiempo de carga inicial, especialmente en páginas de reportes pesados con `recharts`.

### 🔴 Sugerencia: Optimización de Renderizado
- Implementar virtualización de listas con `react-window` en `MovementsTable` para manejar eficientemente miles de registros
- Uso de `React.memo()` en componentes visuales pesados
- Optimizar re-renders en `ClasificarMovimientosPage`

## 2. Backend: Robustez y Calidad

### ✅ Estandarización de Repositorios (Completado)
Se han separado las responsabilidades en múltiples archivos de repositorio en `infrastructure/database` (14 repositorios), facilitando el mantenimiento.

### ✅ Gestión Dinámica de Pendientes (Completado)
Se implementó la lógica de `config_valores_pendientes` para desacoplar el estado "pendiente" de valores `NULL` estrictos.

### ✅ Reorganización de Extractores por Institución (Completado)
- Carpeta `bancolombia/` centraliza todos los productos
- Separación clara: movimientos vs extractos
- 4 cuentas soportadas: Ahorros, FondoRenta, MasterCardPesos, MasterCardUSD
- Adapter pattern para delegación dinámica

### ✅ Soporte de Conciliaciones Bancarias (Completado)
- Modelo de dominio `Conciliacion` con validaciones
- Repositorio especializado con recálculo automático
- Endpoints API completos
- Integración con extractores de PDFs

### ✅ Manejo de Formatos Colombianos (Completado)
- Parsing correcto de comas como separador decimal
- Soporte de formatos antiguos y nuevos de extractos
- Adaptación de texto triplicado en PDFs

### 🔴 Sugerencia: Pruebas Unitarias del Dominio
El `ClasificacionService` contiene lógica de negocio crítica compleja (sugerencias multi-nivel, Fondo Renta, fuzzy matching). Se recomienda crear una suite de pruebas con **Pytest** y mocks para los repositorios:
- Test de cada nivel de sugerencia por separado
- Test de lógica específica de FondoRenta
- Test de detección de duplicados
- Test de validaciones de `Conciliacion`

### 🔴 Sugerencia: Pruebas de Integración de Extractores
Crear un conjunto de PDFs de prueba (anonimizados) para cada tipo de cuenta y formato:
- Verificar extracción correcta de movimientos
- Verificar extracción de resúmenes
- Test de regresión ante cambios de formato bancario
- Directorio: `Backend/tests/fixtures/pdfs/`

### 🔴 Sugerencia: Logging Estructurado Mejorado
Migrar el logging actual a una librería como `structlog` o `loguru` para:
- Facilitar el rastreo de errores en producción
- Auditorías de clasificación automática con metadatos
- Correlación de requests (request_id)
- Niveles de log configurables por módulo

### 🔴 Sugerencia: Caché de Catálogos en Backend
Implementar caché en memoria (Redis o simple dict) para catálogos que cambian poco:
- Terceros, Centros de Costo, Conceptos, Cuentas
- Invalidación al crear/editar
- Reducir carga en PostgreSQL

## 3. Código y Patrones (Mantenimiento Continuo)

### ✅ Componentes UI Genéricos (Completado)
- `DataTable` ahora maneja de forma genérica casi todos los listados del sistema
- `Modal` estandarizado para formularios rápidos
- `ComboBox` con búsqueda en tiempo real
- `EditableCurrencyCell` para edición inline

### ✅ Formateo Multimoneda (Completado)
- `CurrencyDisplay` centraliza formateo de COP y USD
- Badges visuales para USD
- Color coding (verde/rojo) para ingresos/egresos
- Formato colombiano con separadores de miles

### 🔴 Sugerencia: Validación Cruzada de Datos (Auditoría)
Implementar una tarea programada (o endpoint de auditoría) que verifique:
- Consistencia entre movimientos clasificados y totales de cuentas reales
- Detección de discrepancias en conciliaciones
- Alertas automáticas de movimientos sin clasificar antiguos (>30 días)
- Reporte de clasificaciones erróneas detectadas

### 🔴 Sugerencia: API de Versionado
Implementar versionado de API (`/api/v1/`) para permitir:
- Evolución sin romper clientes existentes
- Deprecación gradual de endpoints antiguos
- Documentación automática con Swagger/OpenAPI

### 🔴 Sugerencia: Documentación Automática de API
Aprovechar FastAPI para generar documentación interactiva:
- Swagger UI en `/docs`
- ReDoc en `/redoc`
- Schemas Pydantic bien documentados con `Field(..., description="...")`
- Ejemplos de requests/responses

## 4. Historial de Logros (Checklist)

1.  ✅ **Refactorizar `api.ts`**: Dividido en servicios por dominio (7 archivos).
2.  ✅ **Atomic Design**: Componentes base normalizados (7 atoms, 10 molecules, organisms).
3.  ✅ **React Query**: Implementado en toda la aplicación con cacheo inteligente.
4.  ✅ **DataTable Genérico**: Abstracción de tablas de catálogos y movimientos.
5.  ✅ **Modal Base**: Estandarización de ventanas emergentes con accesibilidad.
6.  ✅ **Tipado Estricto**: Eliminación de `any` en la mayoría de los servicios y componentes.
7.  ✅ **Soporte Multimoneda**: Formateo y visualización de USD/COP centralizado.
8.  ✅ **Reorganización de Extractores**: Estructura bancolombia/ con 7 extractores.
9.  ✅ **Sistema de Conciliaciones**: Modelo completo con comparación Extracto vs Sistema.
10. ✅ **Manejo de Formatos Colombianos**: Parsing correcto de PDFs con coma decimal.
11. ✅ **22 Páginas Funcionales**: Cobertura completa de maestros, movimientos, reportes y conciliación.
12. ✅ **Clasificación Multi-Nivel**: 5 niveles de sugerencias con contexto histórico.
13. ✅ **Carga de Extractos PDF**: Upload y procesamiento automático de 4 tipos de cuenta.
14. ✅ **Edición Inline de Conciliaciones**: `EditableCurrencyCell` con formato automático.
15. ✅ **Exportación Multi-Formato**: Excel, PDF y CSV para reportes.

## 5. Próximos Pasos Estratégicos

### Alta Prioridad

1.  **Testing End-to-End**: 
    - Implementar Playwright o Cypress
    - Flujos críticos: carga de PDFs, clasificación, conciliación
    - CI/CD con GitHub Actions

2.  **Mejoras en Extractores**:
    - Soporte para otros bancos (Davivienda, BBVA)
    - Detección automática de formato por contenido (no por tipo_cuenta)
    - Manejo robusto de PDFs corruptos con fallback

3.  **Dashboard Mejorado**:
    - Widgets con gráficos de `recharts`
    - Resumen de pendientes por cuenta
    - Tendencias mensuales de gastos
    - Alertas de movimientos sin clasificar

4.  **Búsqueda Global**:
    - Barra de búsqueda en header
    - Búsqueda full-text en descripciones, referencias
    - Navegación rápida a movimientos específicos

### Prioridad Media

5.  **Observabilidad**: 
    - Integrar Sentry para captura de errores en frontend y backend
    - Monitoreo de performance con métricas (tiempo de respuesta de extractores)
    - Alertas por email/Slack en fallos críticos

6.  **Optimización de Performance**:
    - Implementar índices en PostgreSQL para queries frecuentes
    - Connection pooling optimizado (pgbouncer)
    - Caché de resultados de reportes pesados (Redis)
    - Virtualización de listas largas en frontend

7.  **Seguridad**:
    - Revisar políticas de CORS (whitelist específico)
    - Autenticación/autorización si se vuelve multiusuario (JWT, OAuth2)
    - Rate limiting en API (slowapi)
    - Validación estricta de archivos subidos (tamaño, tipo MIME)

8.  **Backup y Recuperación**:
    - Backups automáticos diarios de PostgreSQL
    - Script de restauración documentado
    - Versionado de esquema de BD con Alembic/migrations

### Prioridad Baja (Mejoras Futuras)

9.  **Integraciones Externas**:
    - API de bancos (Open Banking) para descarga automática
    - Integración con plataformas contables (Siigo, Alegra)
    - Notificaciones por WhatsApp/Telegram

10. **Análisis Avanzado**:
    - Machine Learning para predicción de gastos
    - Detección de anomalías en movimientos
    - Recomendaciones de optimización de gastos

11. **Mobile App**:
    - Progressive Web App (PWA) para acceso móvil
    - Notificaciones push
    - Modo offline con sincronización

## 6. Métricas de Calidad Objetivo

Para considerar el proyecto en estado "production-ready":

- ✅ Cobertura de código frontend: **~40%** actual → 🎯 **>80%** objetivo
- ✅ Cobertura de código backend: **~0%** actual → 🎯 **>70%** objetivo
- ✅ Tiempo de carga inicial: **<2s** ✓
- ✅ Tiempo de respuesta API: **<500ms** ✓ (p95)
- 🔴 Disponibilidad: **N/A** → 🎯 **>99%** (con monitoreo)
- 🔴 Errores en producción: **N/A** → 🎯 **<0.1%** de requests
- ✅ Tamaño de bundle: **<1MB** ✓ (optimizado por Vite)

## 7. Documentación Pendiente

- 🔴 Manual de usuario final (screenshots, flujos)
- 🔴 Guía de contribución (CONTRIBUTING.md)
- 🔴 Documentación de API (Swagger completado)
- ✅ Arquitectura backend (actualizado)
- ✅ Arquitectura frontend (actualizado)
- 🔴 Guía de deployment (environments, secrets)
- 🔴 Runbook de operaciones (troubleshooting común)





