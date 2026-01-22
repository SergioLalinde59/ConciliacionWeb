# Refactorización de Extractores por Institución Financiera

## Contexto
Reorganizar los extractores de PDF separando por:
- **Institución financiera** (Bancolombia/Cibest Capital)
- **Tipo de producto** (Ahorros, MasterCard, FondoRenta)
- **Tipo de archivo** (Movimientos vs Extractos)

## Tareas

### [x] 1. Diseño de la Estructura
- [x] Definir estructura de carpetas final con usuario
- [x] Documentar convenciones de nombres
- [x] Validar que cubre productos futuros

### [x] 2. Creación de Nueva Estructura
- [x] Crear carpeta `bancolombia/` en extractors
- [x] Crear archivos separados para movimientos y extractos
- [x] Mover utilidades compartidas a ubicación apropiada

### [x] 3. Migración de Código
- [x] Dividir `bancolombia.py` → `ahorros_movimientos.py` + `ahorros_extracto.py`
- [x] Dividir `fondorenta.py` → `fondorenta_movimientos.py` + `fondorenta_extracto.py`
- [x] Separar `creditcard.py` → `mastercard_movimientos.py`
- [x] Crear archivos extracto para tarjetas (placeholder para futuro)

### [x] 4. Actualización de Dependencias
- [x] Actualizar imports en `procesador_archivos_service.py`
- [x] Crear archivos `__init__.py` apropiados para exports limpios

### [/] 5. Verificación
- [ ] Probar carga de movimientos Bancolombia Ahorros
- [ ] Probar carga de extracto Bancolombia Ahorros
- [ ] Probar carga de movimientos FondoRenta
- [ ] Probar carga de extracto FondoRenta
- [ ] Probar carga de movimientos MasterCard (ambas monedas)
- [x] Eliminar archivos antiguos

### [x] 6. Documentación
- [x] Crear guía para agregar nuevos bancos/productos
- [ ] Actualizar README si existe
