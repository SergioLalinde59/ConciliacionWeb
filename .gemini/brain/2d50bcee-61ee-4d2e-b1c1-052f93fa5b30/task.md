# Fase 4: Servicio de Matching y Lógica de Vinculación

## Backend - Servicio de Dominio
- [x] ~~Agregar dependencia `python-Levenshtein` a `requirements.txt`~~ (Se usa SequenceMatcher de difflib)
- [x] Crear `matching_service.py` con estructura base
- [x] Implementar método `calcular_score_similitud`
  - [x] Score de fecha
  - [x] Score de monto
  - [x] Score de descripción (SequenceMatcher)
- [x] Implementar método `ejecutar_matching` (obtener candidatos)
- [x] Implementar vinculación en endpoints API
- [x] Implementar desvinculación en endpoints API
- [x] Implementar marcar como ignorado en endpoints API
- [x] Endpoints en `matching.py` completamente funcionales

## Repositorio
- [x] `PostgresMovimientoVinculacionRepository` implementado
- [x] Todos los métodos del puerto implementados

## Verificación
- [x] Código existente revisado y validado
- [x] Arquitectura hexagonal correctamente aplicada
- [x] Todas las operaciones CRUD implementadas
