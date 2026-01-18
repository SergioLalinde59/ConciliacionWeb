# Documentación del Backend

## Stack Tecnológico

El backend está construido sobre Python utilizando un enfoque moderno y asíncrono.

*   **Lenguaje**: Python 3.x
*   **Framework Web**: FastAPI (v0.109.2)
*   **Servidor ASGI**: Uvicorn (v0.27.1)
*   **Base de Datos**: PostgreSQL 18 (Alpine)
*   **Driver BD**: psycopg2-binary (v2.9.9)
*   **Validación de Datos**: Pydantic (v2.6.1)
*   **Configuración**: pydantic-settings (v2.1.0)

### Librerías Clave

*   **Procesamiento de PDFs**:
    *   `pdfplumber`: Librería principal para extracción de texto y datos de extractos bancarios.
*   **Utilidades**:
    *   `python-dotenv` (v1.0.1): Gestión de variables de entorno.
    *   `python-multipart` (v0.0.9): Manejo de subida de archivos.
    *   `requests` (v2.31.0): Cliente HTTP para integraciones externas.
    *   `email-validator` (v2.1.0.post1): Validación de datos.

## Arquitectura

El proyecto sigue una arquitectura limpia (**Clean Architecture**) con una clara separación de responsabilidades:

### 1. Domain (`src/domain`)
Contiene la lógica de negocio pura, entidades y contratos (puertos).

#### Modelos de Dominio (`models/`)
Entidades implementadas con `@dataclass`:
*   **`Movimiento`**: Entidad principal de movimientos bancarios con validaciones de dominio
    - Campos: moneda_id, cuenta_id, fecha, valor, descripción, referencia, usd, trm
    - Clasificación: tercero_id, centro_costo_id, concepto_id
    - Propiedades: `es_gasto()`, `necesita_clasificacion()`
*   **`Conciliacion`**: Conciliaciones bancarias mensuales
    - Campos extracto: saldo_anterior, entradas, salidas, saldo_final
    - Campos sistema: entradas, salidas, saldo_final (calculados)
    - Propiedades: `calculo_cuadra()`, `conciliacion_ok()`, `periodo_texto()`
*   **`Cuenta`**: Catálogo de cuentas bancarias
*   **`Moneda`**: Soporte multimoneda (COP, USD)
*   **`Tercero`**: Entidades/personas relacionadas con movimientos
*   **`TerceroDescripcion`**: Alias para búsqueda semántica
*   **`CentroCosto`**: Centros de costo para clasificación
*   **`Concepto`**: Conceptos contables por centro de costo
*   **`TipoMov`**: Tipos de movimiento
*   **`ReglaClasificacion`**: Reglas automáticas de clasificación
*   **`ConfigValorPendiente`**: Configuración de valores considerados "pendientes"
*   **`ConfigFiltroCentroCosto`**: Filtros personalizados por centro de costo

#### Puertos (`ports/`)
Interfaces (Abstract Base Classes) que definen contratos para repositorios:
*   `MovimientoRepository`
*   `ConciliacionRepository`
*   `CuentaRepository`, `MonedaRepository`, `TerceroRepository`
*   `CentroCostoRepository`, `ConceptoRepository`
*   `ReglasRepository`, `TerceroDescripcionRepository`
*   `ConfigValorPendienteRepository`, `ConfigFiltroCentroCostoRepository`
*   `TipoMovRepository`

#### Excepciones (`exceptions.py`)
Errores específicos del dominio para manejo adecuado de casos de negocio.

### 2. Application (`src/application/services`)
Implementa los casos de uso orquestando el dominio y la infraestructura.

*   **`ClasificacionService`**: 
    - Núcleo del sistema de clasificación inteligente
    - Métodos principales:
        - `clasificar_movimiento()`: Aplica reglas estáticas e históricas
        - `obtener_sugerencia_clasificacion()`: Algoritmo multi-nivel con contexto histórico
        - `auto_clasificar_pendientes()`: Procesamiento masivo
        - `aplicar_regla_lote()`: Clasificación por lotes con patrón

*   **`ProcesadorArchivosService`**: 
    - Orquesta procesamiento de PDFs y archivos
    - Métodos principales:
        - `procesar_archivo()`: Cargar movimientos desde PDF
        - `analizar_archivo()`: Preview sin guardar en BD
        - `procesar_extracto()`: Cargar resúmenes de extracto
        - `analizar_extracto()`: Preview de extracto sin guardar

*   **`CargarMovimientosService`**:
    - Lógica de carga masiva de movimientos

### 3. Infrastructure (`src/infrastructure`)
Implementaciones concretas de los puertos y servicios externos.

#### API (`api/`)
Basada en FastAPI con separación por routers:

**`main.py`**: 
- Configuración de CORS para frontend (localhost:5173)
- Gestión del ciclo de vida con `lifespan`
- Connection pool a PostgreSQL
- Registro de exception handlers globales

**Routers (`routers/`)**: 14 endpoints especializados
- `movimientos.py`: CRUD y filtrado de movimientos
- `catalogos.py`: Endpoint combinado de catálogos
- `clasificacion.py`: Sugerencias y clasificación automática
- `archivos.py`: Upload de PDFs (movimientos y extractos)
- `conciliaciones.py`: Gestión de conciliaciones bancarias
- `cuentas.py`, `monedas.py`, `tipos_movimiento.py`, `terceros.py`, `tercero_descripciones.py`
- `centros_costos.py`, `conceptos.py`
- `reglas.py`, `config_filtros_centros_costos.py`

**`dependencies.py`**: 
- Inyección de dependencias para repositorios y servicios

**`exception_handlers.py`**: 
- Manejo centralizado de excepciones de dominio

#### Database (`database/`)
Implementación de repositorios usando PostgreSQL con `psycopg2`:

*   **`connection.py`**: Connection pool manager con lazy initialization
*   **Repositorios PostgreSQL** (14 archivos):
    - `postgres_movimiento_repository.py`: 
        - Queries complejas con filtros dinámicos
        - Búsqueda por referencia, descripción, fecha
        - Actualizaciones por lote
        - Joins optimizados para display
    - `postgres_conciliacion_repository.py`: 
        - CRUD de conciliaciones
        - Recálculo automático de saldos del sistema
        - Validación de duplicados por cuenta/año/mes
    - `postgres_config_valor_pendiente_repository.py`:
        - Gestión flexible de "estados pendientes"
    - Otros: cuentas, monedas, terceros, centros_costos, conceptos, etc.

#### Extractors (`extractors/`)
Procesamiento de PDFs bancarios organizados por institución:

**Estructura:**
```
extractors/
├── bancolombia/              # Todos los productos de Bancolombia
│   ├── ahorros_movimientos.py
│   ├── ahorros_extracto.py
│   ├── fondorenta_movimientos.py
│   ├── fondorenta_extracto.py
│   ├── mastercard_movimientos.py
│   ├── mastercard_pesos_extracto.py
│   ├── mastercard_usd_extracto.py  # Maneja formato colombiano (,)
│   └── __init__.py           # Exporta todas las funciones
├── bancolombia_adapter.py    # Mapea tipo_cuenta → extractor
└── utils.py                  # Helpers de parsing (números, fechas)
```

**Cuentas Soportadas:**
1. **Ahorros** (Cuenta de Ahorros Bancolombia)
2. **FondoRenta** (Cibest Capital - Fondo de Inversión)
3. **MasterCardPesos** (Tarjeta de Crédito en Pesos)
4. **MasterCardUSD** (Tarjeta de Crédito en Dólares)

**Capacidades:**
- Extracción de movimientos detallados
- Extracción de resúmenes (saldo anterior, entradas, salidas, saldo final)
- Manejo de formatos colombianos (coma como separador decimal)
- Detección de duplicados por hash (fecha + valor + descripción)
- Adaptación de texto triplicado en PDFs
- Manejo de formatos antiguos y nuevos (Sept 2025+)

#### Logging (`logging/`)
Sistema de logging estructurado con configuración centralizada.

## Módulos y Lógica Clave

### Clasificación Inteligente Multi-Nivel
El `ClasificacionService` implementa un sistema sofisticado de sugerencias:

**Nivel 1 - Reglas Estáticas:**
- Patrones de texto configurables por el usuario
- Matching con prioridades

**Nivel 2 - Histórico por Referencia:**
- Si existe referencia idéntica clasificada → copia clasificación completa

**Nivel 3 - Búsqueda Semántica:**
- **Referencia Larga** (>8 dígitos): Busca en `tercero_descripciones.referencia`
- **Descripción**: Extrae primeras palabras significativas y busca en `tercero_descripciones.descripcion`
- **Fuzzy matching** con thefuzz para tolerancia de errores

**Nivel 4 - Coincidencia de Valor:**
- Si encuentra histórico del mismo tercero con valor idéntico → sugiere grupo/concepto

**Nivel 5 - Lógica Específica "Fondo Renta":**
- Para cuentas FondoRenta (id=3):
    - Movimientos "Traslado de Fondo" sin referencia
    - Búsqueda expandida en múltiples cuentas (Ahorros + FondoRenta)
    - Sugerencia de terceros específicos (e.g., Cibest Capital)
    - Auto-sugerencia de impuestos para retenciones

**Contexto Histórico:**
- Retorna hasta 5 movimientos relacionados
- Muestra clasificaciones exitosas previas
- Incluye información de cuenta origen

### Gestión de "Pendientes" Personalizada
Tabla `config_valores_pendientes` permite definir:
- Qué valores en tercero_id, centro_costo_id, concepto_id se consideran "pendientes"
- Más flexible que chequear solo `NULL`
- Ejemplo: ID=999 como "Por Definir"

### Procesamiento de Archivos PDF

**Flujo de Movimientos:**
1. Upload PDF → `ProcesadorArchivosService.procesar_archivo()`
2. Delegación a extractor específico vía `bancolombia_adapter`
3. Normalización de datos (fechas, decimales, moneda)
4. Detección de duplicados
5. Inserción masiva de nuevos registros
6. Retorno de estadísticas (insertados, duplicados, errores)

**Flujo de Extractos:**
1. Upload PDF → `ProcesadorArchivosService.procesar_extracto()`
2. Extracción de resumen (4 valores clave)
3. Validación de duplicado en `conciliaciones` (cuenta/año/mes)
4. Inserción o actualización
5. Recálculo automático de saldos del sistema

### Conciliaciones Bancarias
- Comparación automática: Extracto vs Sistema
- Cálculo de diferencias
- Soporte multimoneda
- Validaciones de integridad matemática
- Rangos de fechas para múltiples meses

## Despliegue y Configuración

### Docker Compose
- **db**: PostgreSQL 18-alpine (Timezone: America/Bogota)
- **backend**: FastAPI en puerto 8000
- **frontend**: Vite en puerto 5173 (proxy nginx en 80)

### Variables de Entorno (.env)
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
ENVIRONMENT (development/production)
TZ=America/Bogota
```

### Health Checks
- Endpoint `/`: Status básico
- Endpoint `/health`: Estado detallado con environment

## Modelo de Datos

### Tablas Principales
1. **movimientos**: Transacciones bancarias individuales
2. **conciliaciones**: Resúmenes mensuales por cuenta
3. **cuentas**: Tipos de cuenta (permite_carga, permite_conciliar)
4. **monedas**: Catálogo de monedas (COP, USD)
5. **terceros**: Entidades (personas, empresas)
6. **tercero_descripciones**: Alias para matching automático
7. **centros_costo**: Centros de costo
8. **conceptos**: Conceptos contables vinculados a centros de costo
9. **reglas_clasificacion**: Automatización de clasificaciones
10. **config_valores_pendientes**: Configuración de estados pendientes
11. **config_filtros_centros_costos**: Filtros UI personalizados
12. **tipos_movimiento**: Catálogo de tipos

### Relaciones Clave
- `movimientos.cuenta_id` → `cuentas.id`
- `movimientos.tercero_id` → `terceros.id`
- `movimientos.centro_costo_id` → `centros_costo.id`
- `movimientos.concepto_id` → `conceptos.id`
- `conceptos.centro_costo_id` → `centros_costo.id`
- `conciliaciones.cuenta_id` → `cuentas.id`

