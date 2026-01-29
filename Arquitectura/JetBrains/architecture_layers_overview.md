
## Arquitectura de Capas

### 1. **Capa de Presentación** (`pages/` y `components/`)

#### Pages (Páginas)
Páginas completas que representan rutas de la aplicación:
- Dashboard principal
- Gestión de movimientos
- Conciliación
- Configuración de cuentas
- Administración de terceros
- Reportes y estadísticas
- Configuración del sistema

#### Components (Componentes Reutilizables)
Componentes UI modulares y reutilizables:
- **Layout Components**: Navbar, Sidebar, Footer
- **Form Components**: Input, Select, DatePicker, etc.
- **Data Display**: Tables, Cards, Lists
- **Feedback**: Modals, Toasts, Alerts
- **Charts**: Visualizaciones con Recharts
- **Export**: Botones de exportación (PDF, Excel)

**Principios de Componentes**:
- Un componente, una responsabilidad
- Props tipadas con TypeScript
- Componentes controlados para forms
- Composición sobre herencia

### 2. **Capa de Lógica de Cliente** (`hooks/` y `services/`)

#### Custom Hooks
Hooks personalizados que encapsulan lógica reutilizable:
- `useMovimientos`: Gestión de movimientos
- `useCuentas`: Gestión de cuentas
- `useTerceros`: Gestión de terceros
- `useConciliacion`: Lógica de conciliación
- `useAuth`: Autenticación (si existe)
- `useExport`: Exportación de datos

**Ventajas de Custom Hooks**:
- Separación de lógica y presentación
- Reutilización de código
- Testeo independiente
- Composición de comportamientos

#### Services
Capa de servicios del cliente:
- Transformación de datos
- Validaciones del cliente
- Lógica de negocio local
- Formateo y cálculos

### 3. **Capa de Comunicación** (`api/`)

Módulos responsables de la comunicación con el backend:
