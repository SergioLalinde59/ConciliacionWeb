# Documentación del Backend

## Stack Tecnológico

El backend está construido sobre Python utilizando un enfoque moderno y asíncrono.

*   **Lenguaje**: Python 3.x
*   **Framework Web**: FastAPI (v0.128.0)
*   **Servidor ASGI**: Uvicorn (v0.40.0)
*   **Base de Datos**: PostgreSQL
*   **Driver BD**: psycopg2-binary (v2.9.11)
*   **Validación de Datos**: Pydantic (v2.12.5)

### Librerías Clave

*   **Procesamiento de Datos**:
    *   `pandas` (v2.2.3), `numpy` (v2.2.4): Manipulación de datos y Excel.
    *   `openpyxl`: Soporte para archivos Excel (.xlsx).
*   **Procesamiento de PDFs**:
    *   `pdfplumber`, `pdfminer.six`, `pypdfium2`: Extracción de datos de extractos bancarios.
*   **Lógica Difusa (Fuzzy Matching)**:
    *   `thefuzz`, `python-Levenshtein`, `RapidFuzz`: Utilizado para la clasificación automática y búsqueda de similares.
*   **Utilidades**:
    *   `python-dotenv`: Gestión de variables de entorno.
    *   `python-multipart`: Manejo de subida de archivos.
    *   `httpx`: Cliente HTTP para posibles integraciones externas.

## Arquitectura

El proyecto sigue una arquitectura limpia (**Clean Architecture**) con una clara separación de responsabilidades:

### 1. Domain (`src/domain`)
Contiene la lógica de negocio pura, entidades y contratos (puertos).
*   `models/`: Entidades de datos (e.g., `Movimiento`, `Cuenta`, `Tercero`).
*   `ports/`: Interfaces que definen los contratos para los repositorios. Esto permite desacoplar la lógica de negocio de la implementación específica de la base de datos.
*   `exceptions.py`: Errores específicos del dominio.

### 2. Application (`src/application`)
Implementa los casos de uso orquestando el dominio y la infraestructura.
*   `services/`: Lógica de alto nivel.
    *   `ClasificacionService`: Corazón del sistema; maneja reglas, sugerencias e histórico.
    *   `ProcesadorArchivosService`: Orquesta la lectura de extractos y normalización.

### 3. Infrastructure (`src/infrastructure`)
Implementaciones concretas de los puertos y servicios externos.
*   `api/`: Routers de FastAPI, validación de schemas (Pydantic) y manejo de peticiones.
*   `database/`: Implementación de los repositorios usando PostgreSQL (`psycopg2`).
    *   `PostgresMovimientoRepository`: Maneja queries complejas de filtrado, búsqueda por referencia y actualizaciones por lote.
    *   `PostgresConfigValorPendienteRepository`: Gestiona valores específicos que deben tratarse como "pendientes" (e.g., IDs temporales).
*   `extractors/`: Lógica específica para transformar PDFs/Excels de diferentes bancos en modelos de dominio.

## Módulos y Lógica Clave

### Clasificación y Sugerencias
El sistema utiliza una estrategia de varios niveles para clasificar movimientos:
1.  **Reglas Estáticas**: Patrones de texto definidos por el usuario (e.g., "Si contiene 'TIGO', asignar a Tercero X").
2.  **Histórico por Referencia**: Si un movimiento tiene la misma referencia que uno clasificado previamente, copia su clasificación.
3.  **Sugerencias Inteligentes**:
    *   **Referencia Larga**: Si la referencia > 8 dígitos, busca en alias de terceros.
    *   **Búsqueda Semántica**: Usa las primeras palabras significativas de la descripción para encontrar coincidencias en alias.
    *   **Coincidencia de Valor**: Si encuentra un movimiento histórico del mismo tercero con el mismo valor, sugiere automáticamente el grupo y concepto correlacionados.
    *   **Fondo Renta**: Lógica específica para cuentas de fondos de inversión, sugiriendo terceros e impuestos automáticamente.

### Gestión de "Pendientes" Personalizada
A través de la tabla `config_valores_pendientes`, el administrador puede definir qué valores en las columnas de clasificación (Tercero, Grupo, Concepto) deben obligar al sistema a considerar el movimiento como "pendiente", permitiendo flujos de trabajo más flexibles que el simple chequeo de `NULL`.

### Extractores
Capacidad de procesar diversos formatos bancarios (Bancolombia, Davivienda, etc.), detectando duplicados mediante una combinación de fecha, valor (o valor USD) y descripción.

