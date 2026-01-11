# Documentación del Frontend

## Stack Tecnológico

El frontend es una Single Page Application (SPA) moderna construida con el ecosistema de React.

*   **Core**: React 19 (v19.0.0)
*   **Lenguaje**: TypeScript
*   **Empaquetador/Build Tool**: Vite (v7.2.4)
*   **Estilos**: Tailwind CSS (v4.1.18)
*   **Enrutamiento**: React Router DOM (v7.11.0)
*   **Estado y Data Fetching**: TanStack Query (v5.90.16)

### Librerías Clave

*   **UI/Iconos**: `lucide-react`
*   **Visualización de Datos**: `recharts` (Gráficos estadísticos y dashboards)
*   **Manejo de Archivos**:
    *   `xlsx`: Exportación a Excel.
    *   `jspdf`, `jspdf-autotable`: Generación de reportes PDF.
*   **Notificaciones**: `react-hot-toast`

## Arquitectura (Atomic Design)

El proyecto ha adoptado una estructura modular basada en **Atomic Design** para mejorar la reutilización y mantenibilidad.

### Estructura de Directorios (`src/`)

*   **`pages/`**: Vistas completas que orquestan el estado (e.g., `MovimientosPage`, `DashboardPage`).
*   **`components/`**: Organizador de componentes por nivel de complejidad.
    *   **`atoms/`**: Componentes base indivisibles (`Button`, `Input`, `Checkbox`, `CurrencyDisplay`).
    *   **`molecules/`**: Combinaciones de átomos con lógica simple (`DataTable`, `Modal`, `ComboBox`, `DateRangeSelector`).
    *   Componentes específicos de dominio residen en la raíz de `components/`.
*   **`services/`**: Capa de comunicación con el Backend.
    *   `api.ts`: Cliente HTTP centralizado.
    *   `movements.service.ts`, `catalogs.service.ts`, etc.: Servicios divididos por dominio.
*   **`hooks/`**: Custom React Hooks. Destaca el uso de `useQuery` y `useMutation` de TanStack Query para simplificar la gestión de estados asíncronos y caché.
*   **`types/`**: Definiciones de tipos TypeScript centralizadas.

## Integración y Estado

### TanStack Query
Se utiliza para toda la comunicación con la API.
*   **Cacheo Automático**: Los catálogos (Cuentas, Terceros) se cachean automáticamente, reduciendo peticiones redundantes.
*   **Sincronización**: Las mutaciones (crear/editar) invalidan las queries relacionadas, asegurando que la UI esté siempre actualizada.

### Componentes Genéricos
*   **`DataTable`**: Un componente molecular potente que abstrae el renderizado de tablas, paginación, filtros y acciones para todas las entidades del sistema.
*   **`Modal`**: Un wrapper estandarizado que maneja portales, accesibilidad y animaciones.
*   **`ComboBox`**: Un selector avanzado con búsqueda integrada y soporte para teclado, crucial para la clasificación rápida de terceros.

## Internacionalización y Formato
*   **`CurrencyDisplay`**: Componente atómico que centraliza el formateo de monedas, con soporte nativo para **COP y USD**. Maneja badges visuales para destacar transacciones en dólares.
*   **Fechas**: Gestión consistente de fechas para asegurar que los filtros coincidan entre el frontend y el huso horario del servidor (PostgreSQL).

