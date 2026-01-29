
## Capas de la Arquitectura Hexagonal

### 1. **Capa de Dominio** (`src/domain/`)

**Responsabilidad**: Contiene toda la lógica de negocio pura, independiente de frameworks y tecnologías.

#### Componentes:

- **Models**: Entidades del negocio (clases Python puras)
  - `Movimiento`, `Cuenta`, `Tercero`, `CentroCosto`, `Concepto`, etc.
  - No dependen de ORM ni tecnología específica
  
- **Ports**: Interfaces (Protocols o Abstract Base Classes)
  - `IMovimientoRepository`, `ICuentaRepository`, etc.
  - Definen contratos que deben cumplir los adaptadores
  
- **Services**: Lógica de negocio compleja
  - Reglas de validación
  - Cálculos y transformaciones de negocio
  - Orquestación entre entidades
  
- **Exceptions**: Excepciones específicas del dominio
  - `ValidationError`, `BusinessRuleViolation`, etc.

**Principios**:
- Sin dependencias externas (excepto Python estándar)
- Fácilmente testeable
- Reutilizable en diferentes contextos

### 2. **Capa de Aplicación** (`src/application/`)

**Responsabilidad**: Orquesta los casos de uso de la aplicación, coordina el flujo entre dominio e infraestructura.

#### Componentes:

- **Services**: Servicios de aplicación
  - Implementan casos de uso completos
  - Coordinan múltiples servicios de dominio
  - Gestionan transacciones
  - Transforman datos entre capas

**Ejemplos de Casos de Uso**:
- Procesar un archivo de extracto bancario
- Realizar conciliación de movimientos
- Generar reportes dashboard
- Aplicar reglas de matching

### 3. **Capa de Infraestructura** (`src/infrastructure/`)

**Responsabilidad**: Implementa los detalles técnicos y adaptadores para tecnologías concretas.

#### Componentes:

##### **API (Adaptador REST)**
- **Routers**: Endpoints organizados por módulo
  - `movimientos.py`, `cuentas.py`, `terceros.py`, etc.
  - Manejo de requests/responses HTTP
  - Validación de entrada con Pydantic
  - Serialización/deserialización JSON
  
- **Exception Handlers**: Manejo centralizado de errores
  - Convierte excepciones del dominio en respuestas HTTP
  - Logging de errores
  - Formato estandarizado de respuestas

- **Main.py**: Configuración de la aplicación
  - Inicialización de FastAPI
  - Configuración de CORS
  - Registro de routers
  - Gestión del ciclo de vida (lifespan)

##### **Database (Adaptador de Persistencia)**
- **Connection**: Gestión del connection pool
  - Pool de conexiones a PostgreSQL
  - Lazy initialization
  - Cierre controlado de conexiones
  
- **Models**: Modelos ORM (SQLAlchemy)
  - Mapeo objeto-relacional
  - Definición de tablas y relaciones
  - Migraciones (si existen)

##### **Repositories (Implementación de Ports)**
- Implementan las interfaces definidas en `domain/ports/`
- Traducen operaciones de dominio a operaciones SQL
- Manejo de transacciones
- Gestión de sesiones de SQLAlchemy

##### **Extractors**
- Parsers de archivos (CSV, Excel, PDF)
- Extracción de datos de extractos bancarios
- Normalización de datos de entrada
- Manejo de diferentes formatos por banco/cuenta

##### **Logging**
- Configuración centralizada de logs
- Diferentes niveles de logging
- Rotación de archivos de log
- Formato estandarizado

## Módulos Funcionales

Basándome en los routers registrados en `main.py`:

### Módulos Core:
1. **Movimientos**: Gestión de transacciones financieras
2. **Cuentas**: Gestión de cuentas bancarias
3. **Terceros**: Gestión de contactos/proveedores/clientes
4. **Centros de Costos**: Clasificación organizacional
5. **Conceptos**: Categorización de gastos/ingresos
6. **Monedas**: Gestión multi-moneda
7. **Tipos de Movimiento**: Clasificación de transacciones

### Módulos de Procesamiento:
8. **Archivos**: Carga y procesamiento de extractos
9. **Extractores**: Parseo de archivos bancarios
10. **Matching**: Emparejamiento de movimientos
11. **Conciliaciones**: Proceso de conciliación
12. **Reglas**: Motor de reglas de negocio

### Módulos de Configuración:
13. **Catálogos**: Gestión de datos maestros
14. **Clasificación**: Configuración de clasificaciones
15. **Config Filtros Centros Costos**: Configuración de filtros
16. **Config Valores Pendientes**: Configuración de pendientes
17. **Tercero Descripciones**: Alias y descripciones

### Módulos de Gestión:
18. **Dashboard**: Métricas y reportes
19. **Admin**: Administración del sistema
20. **Mantenimiento**: Tareas de mantenimiento

## Flujo de una Petición
