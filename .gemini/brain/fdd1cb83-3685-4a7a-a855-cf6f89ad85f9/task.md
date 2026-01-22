# Mejorar Lógica de Sugerencias de Clasificación

## Objetivo
Resolver el problema de movimientos sin referencia que muestran historial incorrecto de otros terceros.

## Plan de Implementación

### Backend - Lógica de Sugerencias

- [x] **Modificar `clasificacion_service.py`**
  - [x] Para movimientos SIN referencia, buscar solo movimientos SIN referencia de la misma cuenta
  - [x] Buscar por descripción similar en la misma cuenta
  - [x] NO sugerir basándose en descripción si es de tercero diferente
  - [x] **Limitar a 5 movimientos más recientes ordenados por fecha**
  - [x] **Sugerir tercero automáticamente si todos tienen el mismo tercero**

### Frontend - Historial Relacionado

- [x] **Agregar columna Cuenta**
  - [x] Modificar tabla de "Historial Relacionado" 
  - [x] Agregar columna entre Fecha y Referencia
  - [x] Formato: "id - nombre_cuenta"

### Backend - API Response

- [x] **Verificar datos de cuenta en contexto**
  - [x] Confirmar que `MovimientoResponse` incluye cuenta_display ✅
  - [x] Ya está disponible en el API

### Verificación

- [ ] **Probar con movimiento de Fondo Renta sin referencia**
  - [ ] Verificar que muestra solo 5 movimientos más recientes de Fondo Renta
  - [ ] Verificar que NO mezcla movimientos con/sin referencia
  - [ ] Verificar que columna Cuenta aparece correctamente
  - [ ] Verificar que sugiere "Fondo Renta" automáticamente (tercero común)
