# Scripts de Utilidad

Esta carpeta contiene scripts de utilidad para debugging, mantenimiento y verificación de la aplicación.

## movimientos_cuenta_periodo.py

Script **interactivo** para revisar el estado de las tablas de la aplicación para una cuenta y período determinado. Útil para:
- Debugging y verificación de integridad de datos por cuenta
- Monitoreo del proceso de vinculación/matching por cuenta
- Análisis de discrepancias entre sistema y extractos
- Revisión de estadísticas específicas por cuenta bancaria

### Uso

El script es interactivo y solicita los datos al usuario:

```bash
python Backend/scripts/movimientos_cuenta_periodo.py
```

El script te pedirá:
1. **ID de cuenta** (Enter para todas las cuentas)
2. **Año** (Enter para todos los años)
3. **Mes** (1-12, Enter para todos los meses)
4. **Modo debug** (s/n, para ver las consultas SQL ejecutadas)

### Salida de Ejemplo

```
======================================================================
  REPORTE DE DATOS
======================================================================
  Cuenta:  Cuenta 1 - Ahorros
  Periodo: 2025-12
======================================================================

  Movimientos:                   100
  Movimientos_Extracto:          102
  Movimiento_Vinculaciones:      102

  Porcentaje de Vinculacion:  100.00% (102/102)
  Diferencia Sistema-Extracto:     -2 registros

======================================================================
```

### Interpretación de Resultados

- **Movimientos**: Cantidad de movimientos cargados en el sistema para la cuenta
- **Movimientos_Extracto**: Cantidad de movimientos en los extractos bancarios para la cuenta
- **Movimiento_Vinculaciones**: Cantidad de matches/vinculaciones exitosas
- **Porcentaje de Vinculación**: Qué porcentaje de los extractos tienen match con el sistema
- **Diferencia Sistema-Extracto**: Diferencia entre movimientos del sistema y extractos (positivo = más en sistema, negativo = más en extractos)

### Requisitos

- Python 3.7+
- psycopg2
- Archivo `.env` en el directorio Backend con la configuración de la base de datos
- Acceso a la base de datos (puerto configurado en `.env`, por defecto 5433)

### Configuración

El script lee automáticamente la configuración desde `Backend/.env`. Asegúrate de que el archivo `.env` contenga:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=Mvtos
DB_USER=postgres
DB_PASSWORD=tu_password
```
