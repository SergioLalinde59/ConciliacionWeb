# Documentación del Frontend

## Stack Tecnológico

El frontend es una Single Page Application (SPA) moderna construida con el ecosistema de React.

*   **Core**: React 19 (v19.2.3)
*   **Lenguaje**: TypeScript (~5.9.3)
*   **Empaquetador/Build Tool**: Vite (v7.2.4)
*   **Estilos**: Tailwind CSS (v4.1.18) con plugin Vite
*   **Enrutamiento**: React Router DOM (v7.11.0)
*   **Estado y Data Fetching**: TanStack Query (v5.90.16)

### Librerías Clave

*   **UI/Iconos**: `lucide-react` (v0.562.0)
*   **Visualización de Datos**: `recharts` (v3.6.0) - Gráficos estadísticos y dashboards
*   **Manejo de Archivos**:
    *   `xlsx` (v0.18.5): Exportación a Excel
    *   `jspdf` (v4.0.0), `jspdf-autotable` (v5.0.7): Generación de reportes PDF
*   **Notificaciones**: `react-hot-toast` (v2.6.0)

## Arquitectura (Atomic Design)

El proyecto ha adoptado una estructura modular basada en **Atomic Design** para mejorar la reutilización y mantenibilidad.

### Estructura de Directorios (`src/`)

*   **`pages/`** (22 archivos): Vistas completas que orquestan el estado
    - **Dashboard**: `DashboardPage.tsx`
    - **Maestros**: `CuentasPage`, `MonedasPage`, `TiposMovimientoPage`, `TercerosPage`, `TerceroDescripcionesPage`, `CentrosCostosPage`, `ConceptosPage`, `ConfigFiltrosCentrosCostosPage`, `ReglasPage`
    - **Movimientos**: `MovimientosPage`, `MovimientoFormPage`, `ClasificarMovimientosPage`, `UploadMovimientosPage`
    - **Conciliación**: `ConciliacionPage`, `UploadExtractoPage`
    - **Reportes**: `ReporteClasificacionesPage`, `ReporteIngresosGastosMesPage`, `ReporteEgresosTerceroPage`, `ReporteEgresosCentroCostoPage`, `DescargarMovimientosPage`, `SugerenciasReclasificacionPage`

*   **`components/`**: Organizador de componentes por nivel de complejidad
    *   **`atoms/`** (7 componentes): Componentes base indivisibles
        - `Button.tsx`: Botones con variantes (primary, secondary, danger, ghost)
        - `Input.tsx`: Inputs de formulario con validación
        - `Checkbox.tsx`: Checkboxes estilizados
        - `CurrencyDisplay.tsx`: Display de valores monetarios (COP/USD)
        - `Select.tsx`: Selectores nativos estilizados
        - `Card.tsx`: Tarjetas contenedoras
        - `Badge.tsx`: Etiquetas de estado
    
    *   **`molecules/`** (10 componentes): Combinaciones de átomos con lógica
        - `DataTable.tsx`: Tabla genérica con paginación y acciones
        - `Modal.tsx`: Ventanas modales con portal
        - `ComboBox.tsx`: Selector avanzado con búsqueda
        - `DateRangeSelector.tsx`: Selector de rango de fechas
        - `Pagination.tsx`: Controles de paginación
        - `ClassificationFilters.tsx`: Filtros de clasificación
        - `FilterToggles.tsx`: Toggles de filtros múltiples
        - `CsvExportButton.tsx`: Exportación a CSV
        - `CurrencyInput.tsx`: Input especializado para monedas
        - `EditableCurrencyCell.tsx`: Celda editable con formato monetario
    
    *   **`organisms/`**: Componentes complejos de dominio
        - **`modals/`** (9 archivos): Modales especializados
            - `ClassificationModal.tsx`: Modal de clasificación masiva
            - `MovimientoModal.tsx`: CRUD de movimientos
            - `TerceroModal.tsx`, `CentroCostoModal.tsx`, `ConceptoModal.tsx`
            - `CuentaModal.tsx`, `MonedaModal.tsx`, `TipoMovimientoModal.tsx`
            - `ConfigFiltroCentroCostoModal.tsx`
        - **`tables/`** (8 archivos): Tablas especializadas
            - `MovementsTable.tsx`: Tabla principal de movimientos
            - `TercerosTable.tsx`, `CentrosCostosTable.tsx`, `ConceptosTable.tsx`
            - `CuentasTable.tsx`, `MonedasTable.tsx`, `TiposMovimientoTable.tsx`
            - `ConfigFiltrosCentrosCostosTable.tsx`
        - **Otros**: `Sidebar.tsx`, `FiltrosReporte.tsx`, `EstadisticasTotales.tsx`
    
    *   **`templates/`**: Layouts de página
        - `MainLayout.tsx`: Layout principal con sidebar

*   **`services/`** (7 archivos): Capa de comunicación con el Backend
    *   `httpClient.ts`: Configuración base de fetch con manejo de errores
    *   `api.ts`: Cliente HTTP centralizado con tipos genéricos
    *   `movements.service.ts`: Operaciones de movimientos
    *   `catalogs.service.ts`: Carga de catálogos (cuentas, terceros, etc.)
    *   `conciliacionService.ts`: Conciliaciones bancarias
    *   `config.service.ts`: Configuraciones del sistema
    *   `files.service.ts`: Upload de archivos

*   **`hooks/`** (4 archivos): Custom React Hooks
    - Uso extensivo de `useQuery` y `useMutation` de TanStack Query
    - Gestión de estados asíncronos y caché
    - Invalidación automática de queries

*   **`types/`** (3 archivos): Definiciones de tipos TypeScript
    *   `types.ts`: Interfaces principales del dominio
        - `Movimiento`, `Cuenta`, `Moneda`, `Tercero`, `CentroCosto`, `Concepto`
        - `SugerenciaClasificacion`, `ContextoClasificacionResponse`
        - `ReglaClasificacion`, `TerceroDescripcion`
        - `ConfigFiltroCentroCosto`, `ClasificacionManual`

*   **`utils/`** (3 archivos): Funciones utilitarias
    - Formateo de fechas, números y monedas
    - Helpers de validación y transformación

## Rutas de Navegación

El sistema cuenta con **24 rutas principales** organizadas por módulos:

### Dashboard
- `/` → DashboardPage

### Maestros
- `/maestros/monedas` → MonedasPage
- `/maestros/cuentas` → CuentasPage
- `/maestros/tipos-movimiento` → TiposMovimientoPage
- `/maestros/terceros` → TercerosPage
- `/maestros/terceros-descripciones` → TerceroDescripcionesPage
- `/maestros/centros-costos` → CentrosCostosPage
- `/maestros/conceptos` → ConceptosPage
- `/maestros/config-filtros` → ConfigFiltrosCentrosCostosPage
- `/maestros/reglas` → ReglasPage

### Movimientos
- `/movimientos` → MovimientosPage (Lista y filtrado)
- `/movimientos/cargar` → UploadMovimientosPage
- `/movimientos/nuevo` → MovimientoFormPage
- `/movimientos/editar/:id` → MovimientoFormPage (modo edición)
- `/movimientos/clasificar` → ClasificarMovimientosPage
- `/movimientos/reporte` → ReporteClasificacionesPage
- `/movimientos/sugerencias` → SugerenciasReclasificacionPage

### Conciliación
- `/conciliacion` → ConciliacionPage
- `/conciliacion/cargar-extracto` → UploadExtractoPage

### Reportes
- `/reportes/egresos-tercero` → ReporteEgresosTerceroPage
- `/reportes/egresos-centro-costo` → ReporteEgresosCentroCostoPage
- `/reportes/ingresos-gastos` → ReporteIngresosGastosMesPage
- `/reportes/descargar` → DescargarMovimientosPage

## Integración y Estado

### TanStack Query
Se utiliza para toda la comunicación con la API:
*   **Cacheo Automático**: Los catálogos (Cuentas, Terceros, Centros de Costo, Conceptos) se cachean automáticamente, reduciendo peticiones redundantes
*   **Sincronización**: Las mutaciones (crear/editar) invalidan las queries relacionadas, asegurando que la UI esté siempre actualizada
*   **Loading States**: Gestión automática de estados de carga y error
*   **Retry Logic**: Reintentos automáticos en caso de fallo de red

### Componentes Genéricos Reutilizables

*   **`DataTable`**: 
    - Componente molecular potente para renderizado de tablas
    - Paginación automática
    - Ordenamiento de columnas
    - Filtros inline
    - Acciones por fila (editar, eliminar)
    - Usado en todas las páginas de catálogos

*   **`Modal`**: 
    - Wrapper estandarizado con portales de React
    - Gestión de accesibilidad (ESC para cerrar, trap focus)
    - Animaciones suaves de entrada/salida
    - Overlay con blur background
    - Usado en todos los formularios de creación/edición

*   **`ComboBox`**: 
    - Selector avanzado con búsqueda integrada
    - Soporte completo de teclado (arrow keys, enter)
    - Filtrado en tiempo real
    - Crucial para clasificación rápida en `ClasificarMovimientosPage`
    - Usado para selección de terceros, centros de costo y conceptos

*   **`DateRangeSelector`**:
    - Selector de rango de fechas con validación
    - Soporte para presets (último mes, últimos 3 meses, etc.)
    - Integración con filtros de reportes

*   **`EditableCurrencyCell`**:
    - Celda editable inline con formato monetario
    - Validación de entrada numérica
    - Guardado automático al blur
    - Usado en `ConciliacionPage` para edición de valores de extracto

## Características de UI/UX

### Formateo de Monedas
*   **`CurrencyDisplay`**: Componente atómico que centraliza el formateo
    - Soporte nativo para **COP** (peso colombiano) y **USD** (dólar)
    - Formato: `$1.234.567` (COP) o `USD $1,234.56`
    - Badges visuales para destacar transacciones en dólares
    - Color coding: verde para ingresos, rojo para egresos
    - Usado en todas las tablas y visualizaciones de valores

### Gestión de Fechas
*   Formato consistente: `YYYY-MM-DD` para API
*   Display: `DD/MM/YYYY` o texto legible
*   Timezone: America/Bogota (sincronizado con PostgreSQL)
*   Validación de rangos en filtros

### Notificaciones
*   **react-hot-toast** para feedback al usuario
*   Notificaciones de éxito, error y advertencia
*   Auto-dismiss configurable
*   Posicionamiento top-right

### Exportación de Datos
*   **Excel**: Exportación de reportes completos con `xlsx`
*   **PDF**: Generación de reportes imprimibles con `jspdf`
*   **CSV**: Exportación rápida de tablas con `CsvExportButton`

## Flujos de Usuario Principales

### 1. Carga de Movimientos
1. Usuario sube PDF en `/movimientos/cargar`
2. Backend extrae datos y retorna preview
3. Usuario revisa duplicados y nuevos registros
4. Confirma carga
5. Modal muestra estadísticas (insertados, duplicados, errores)

### 2. Clasificación de Movimientos
1. Usuario entra a `/movimientos/clasificar`
2. Sistema carga movimientos pendientes
3. Por cada movimiento:
   - Sistema muestra sugerencia automática
   - Muestra contexto histórico (últimos 5 relacionados)
   - Usuario acepta sugerencia o clasifica manualmente
   - Opción de crear nuevo tercero inline
4. Guardado individual o por lotes

### 3. Conciliación Bancaria
1. Usuario sube extracto PDF en `/conciliacion/cargar-extracto`
2. Sistema extrae saldos (anterior, entradas, salidas, final)
3. Guarda en tabla `conciliaciones`
4. Usuario entra a `/conciliacion`
5. Selecciona cuenta y rango de fechas
6. Sistema muestra comparación: Extracto vs Sistema
7. Usuario puede editar valores de extracto inline
8. Cálculo automático de diferencias
9. Recálculo de saldos del sistema al presionar botón

### 4. Generación de Reportes
1. Usuario selecciona tipo de reporte
2. Aplica filtros (fechas, cuentas, centros de costo)
3. Sistema genera visualización con `recharts`
4. Opción de exportar a Excel/PDF/CSV
5. Datos paginados para grandes volúmenes

## Configuración y Build

### Desarrollo
```bash
npm run dev  # Puerto 5173
```

### Producción
```bash
npm run build  # Genera dist/ con assets optimizados
npm run preview  # Preview de build local
```

### Docker
- Imagen de producción con nginx
- Puerto 80 expuesto
- Configuración en `nginx.conf`

## Mejores Prácticas Implementadas

1. **Separación de Responsabilidades**: Atomic Design estricto
2. **Tipado Fuerte**: TypeScript en todos los archivos
3. **Cacheo Inteligente**: TanStack Query para reducir llamadas a API
4. **Reutilización**: Componentes genéricos (`DataTable`, `Modal`, `ComboBox`)
5. **Accesibilidad**: Uso de HTML semántico, ARIA labels
6. **Responsive Design**: Tailwind CSS con breakpoints móviles
7. **Error Handling**: Try-catch en servicios, mensajes amigables
8. **Performance**: Lazy loading de rutas (pendiente)
9. **Code Splitting**: Por ruta automática de Vite
10. **SEO**: Meta tags en `index.html`

