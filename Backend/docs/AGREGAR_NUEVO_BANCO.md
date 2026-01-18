# Guía para Agregar Nuevos Bancos o Productos

## Estructura de Extractores

Los extractores de PDF están organizados por institución financiera. Actualmente tenemos:

```
infrastructure/extractors/
├── utils.py                         # Utilidades compartidas (parsear_fecha, parsear_valor)
└── bancolombia/                     # Productos de Bancolombia / Cibest Capital
    ├── __init__.py                  # Exports centralizados
    ├── ahorros_movimientos.py       # Movimientos de Cuenta de Ahorros
    ├── ahorros_extracto.py          # Extracto mensual de Ahorros
    ├── fondorenta_movimientos.py    # Movimientos de FondoRenta
    ├── fondorenta_extracto.py       # Extracto mensual de FondoRenta
    ├── mastercard_movimientos.py    # Movimientos de MasterCard (COP y USD)
    ├── mastercard_pesos_extracto.py # Placeholder para futuro
    └── mastercard_usd_extracto.py   # Placeholder para futuro
```

## Tipos de Extractores

### 1. Extractor de Movimientos

Procesa PDFs de movimientos diarios/mensuales. Retorna una lista de movimientos:

```python
def extraer_movimientos(file_obj: Any) -> List[Dict]:
    """
    Args:
        file_obj: Archivo PDF (SpooledTemporaryFile o stream)
    
    Returns:
        Lista de diccionarios con estructura:
        {
            'fecha': date,           # datetime.date
            'descripcion': str,      # Descripción del movimiento
            'referencia': str,       # Referencia bancaria (puede ser "")
            'valor': Decimal,        # Valor positivo (entrada) o negativo (salida)
            'moneda': str           # 'COP' o 'USD' (opcional, default COP)
        }
    """
```

### 2. Extractor de Resumen/Extracto

Procesa PDFs de extractos mensuales. Retorna datos de resumen:

```python
def extraer_resumen(file_obj: Any) -> Dict[str, Any]:
    """
    Args:
        file_obj: Archivo PDF de extracto mensual
    
    Returns:
        Diccionario con estructura:
        {
            'saldo_anterior': Decimal,  # Saldo al inicio del periodo
            'entradas': Decimal,         # Total de entradas del mes
            'salidas': Decimal,          # Total de salidas del mes
            'saldo_final': Decimal,      # Saldo al final del periodo
            'year': int,                 # Año del periodo
            'month': int,                # Mes del periodo (1-12)
            'periodo_texto': str        # Ej: "2026 - Enero" (opcional)
        }
    """
```

## Cómo Agregar un Nuevo Banco

### Paso 1: Crear Directorio del Banco

```bash
mkdir backend/src/infrastructure/extractors/nuevo_banco
```

### Paso 2: Crear Extractores

Crea archivos para cada producto:

```
nuevo_banco/
├── __init__.py
├── cuenta_corriente_movimientos.py
├── cuenta_corriente_extracto.py
├── tarjeta_debito_movimientos.py
└── tarjeta_debito_extracto.py
```

### Paso 3: Implementar Funciones

Cada archivo debe exportar funciones estándar:

**Para movimientos:**
```python
# producto_movimientos.py
import pdfplumber
from ..utils import parsear_fecha, parsear_valor

def extraer_movimientos(file_obj):
    # 1. Abrir PDF con pdfplumber
    # 2. Extraer texto de cada página
    # 3. Parsear con regex según formato del banco
    # 4. Retornar lista de diccionarios
    pass
```

**Para extractos:**
```python
# producto_extracto.py
import pdfplumber

def extraer_resumen(file_obj):
    # 1. Extraer texto del PDF
    # 2. Buscar secciones de resumen con regex
    # 3. Parsear valores numéricos
    # 4. Retornar diccionario con campos requeridos
    pass
```

### Paso 4: Crear __init__.py

```python
# nuevo_banco/__init__.py
from .cuenta_corriente_movimientos import extraer_movimientos as extraer_movimientos_cc
from .cuenta_corriente_extracto import extraer_resumen as extraer_resumen_cc
from .tarjeta_debito_movimientos import extraer_movimientos as extraer_movimientos_td
from .tarjeta_debito_extracto import extraer_resumen as extraer_resumen_td

__all__ = [
    'extraer_movimientos_cc',
    'extraer_resumen_cc',
    'extraer_movimientos_td',
    'extraer_resumen_td',
]
```

### Paso 5: Registrar en el Servicio

Actualizar `procesador_archivos_service.py`:

```python
# Agregar import
from src.infrastructure.extractors import nuevo_banco

# Actualizar método _extraer_movimientos
def _extraer_movimientos(self, file_obj, tipo_cuenta):
    # ... código existente ...
    elif tipo_cuenta == 'nuevo_banco_cc':
        raw_movs = nuevo_banco.extraer_movimientos_cc(file_obj)
    # ...

# Actualizar método analizar_extracto
def analizar_extracto(self, file_obj, filename, tipo_cuenta):
    # ... código existente ...
    elif tipo_cuenta == 'NuevoBancoCC':
        datos = nuevo_banco.extraer_resumen_cc(file_obj)
    # ...
```

### Paso 6: Registrar Producto en Base de Datos

Agregar el nuevo producto a la tabla `cuentas`:

```sql
INSERT INTO cuentas (nombre_cuenta, tipo_cuenta, moneda_id, permite_conciliar)
VALUES ('Nuevo Banco - Cuenta Corriente', 'nuevo_banco_cc', 1, TRUE);
```

## Cómo Agregar un Nuevo Producto a un Banco Existente

Si solo necesitas agregar un nuevo producto a Bancolombia (o cualquier banco existente):

### Paso 1: Crear Archivos del Producto

```bash
cd backend/src/infrastructure/extractors/bancolombia/
touch producto_nuevo_movimientos.py
touch producto_nuevo_extracto.py
```

### Paso 2: Implementar Extractores

Sigue la estructura de los extractores existentes como referencia.

### Paso 3: Exportar en __init__.py

```python
# bancolombia/__init__.py
from .producto_nuevo_movimientos import extraer_movimientos as extraer_movimientos_producto_nuevo
from .producto_nuevo_extracto import extraer_resumen as extraer_resumen_producto_nuevo

__all__ = [
    # ... exports existentes ...
    'extraer_movimientos_producto_nuevo',
    'extraer_resumen_producto_nuevo',
]
```

### Paso 4: Registrar en Servicio

Actualizar los métodos en `procesador_archivos_service.py`.

## Utilidades Disponibles

### parsear_fecha(fecha_str: str) -> Optional[date]

Parsea fechas en formato español:
- "27 dic 2025" → date(2025, 12, 27)
- "13 Ene 2026" → date(2026, 1, 13)

### parsear_valor(valor_str: str) -> Optional[Decimal]

Parsea valores monetarios en formato español:
- "$ 1.500.000,50" → Decimal('1500000.50')
- "-$ 250,00" → Decimal('-250.00')
- "1,500.50" → Decimal('1500.50') (también soporta formato US)

## Best Practices

1. **Usa pdfplumber**: Es la librería estándar del proyecto para PDFs
2. **Normaliza texto**: Usa `.upper()` o `.lower()` antes de buscar con regex
3. **Maneja excepciones**: Siempre envuelve en try/except y lanza errores descriptivos
4. **Log debug**: Usa logger para debugging durante desarrollo
5. **Valida datos**: Verifica que los valores parseados tienen sentido (saldos positivos, fechas válidas)
6. **Testing**: Prueba con múltiples PDFs del mismo banco (pueden variar entre meses)

## Ejemplo Completo

Ver `bancolombia/ahorros_movimientos.py` y `bancolombia/ahorros_extracto.py` como referencia completa de implementación.
