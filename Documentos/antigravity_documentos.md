# Documentación: Guardar Archivos de Conversación

Este documento explica cómo usar el script `antigravity_docs.py` para organizar y guardar archivos de documentación de conversaciones con Antigravity.

## Propósito

El script `antigravity_docs.py` permite crear automáticamente un directorio organizado en `Documentos/Conversaciones` y copiar archivos específicos de documentación (como planes de implementación, tareas, walkthroughs, etc.) desde las conversaciones almacenadas en Antigravity.

## Requisitos Previos

- Python 3.x instalado
- Estar ubicado en la raíz del proyecto `ConciliacionWeb`
- Tener conversaciones con archivos de documentación generados en `F:\.gemini\antigravity\brain`

## ¿Cómo Funciona?

El script funciona de manera **interactiva** y sigue estos pasos:

1. **Busca automáticamente** los archivos de documentación en `F:\.gemini\antigravity\brain`
2. **Solicita un nombre** para la conversación (agrega automáticamente prefijo `yyyy-mm-dd`)
3. **Muestra una lista** de los archivos encontrados para que selecciones cuáles copiar
4. **Copia los archivos seleccionados** al directorio `Documentos/Conversaciones/yyyy-mm-dd [nombre]`

## Archivos que el Script Puede Detectar

### Con ID de Conversación Específica
Encuentra **todos los archivos `.md`** en esa conversación.

### Sin ID de Conversación
Busca solo archivos comunes en todas las conversaciones:
- `task.md` - Lista de tareas y checklist del proyecto
- `walkthrough.md` - Documentación de pruebas y validación
- `implementation_plan.md` - Plan técnico de implementación

## Instrucciones de Uso

### Opción 1: Buscar Conversación Específica (Recomendado)

Si conoces el ID de la conversación que quieres archivar:

```powershell
python antigravity_docs.py 3e2b0708-3c8a-46e5-b5b2-9bbb55b79dfc
```

El script:
1. Buscará archivos en `F:\.gemini\antigravity\brain\3e2b0708-3c8a-46e5-b5b2-9bbb55b79dfc`
2. Encontrará **todos** los archivos `.md` en ese directorio
3. Te pedirá un nombre para el directorio de destino

### Opción 2: Buscar en Todas las Conversaciones

```powershell
python antigravity_docs.py
```

El script buscará solo archivos comunes (`task.md`, `walkthrough.md`, `implementation_plan.md`) en todas las conversaciones.

## Flujo Interactivo

### Paso 1: Ingresar Nombre de la Conversación

```
============================================================
ANTIGRAVITY - GESTOR DE DOCUMENTACION
============================================================

[*] Buscando archivos de la conversacion: 3e2b0708-3c8a-46e5-b5b2-9bbb55b79dfc

[?] Ingresa el nombre para esta conversacion:
    (Presiona ENTER para usar timestamp automatico)

Nombre: Fase 1 y 2 - Matching Inteligente
```

**Importante:** El script agregará automáticamente el prefijo `2026-01-18` al nombre que ingreses.

**Opciones:**
- **Nombre personalizado:** Escribe `Fase 1 y 2 - Matching` → Resultado: `2026-01-18 Fase 1 y 2 - Matching`
- **Timestamp automático:** Presiona ENTER → Resultado: `Conversacion_2026-01-18_143022`

### Paso 2: Seleccionar Archivos

```
============================================================
ARCHIVOS DISPONIBLES PARA COPIAR
============================================================
  [1] Reconciliation_Matching_Fase_1_y_2.md    (6.2 KB)
  [2] implementation_plan.md                   (8.7 KB)
  [3] walkthrough.md                           (5.1 KB)
============================================================

[*] Ingresa los numeros separados por comas (ej: 1,2,3)
    O presiona ENTER para copiar todos

Tu seleccion:
```

**Opciones de selección:**
- **Copiar todos:** Presiona ENTER
- **Seleccionar específicos:** Escribe `1,3` (copia archivos 1 y 3)
- **Seleccionar uno solo:** Escribe `2` (copia solo el archivo 2)

### Paso 3: Verificar el Resultado

```
[*] Copiando archivos a: Documentos\Conversaciones\2026-01-18 Fase 1 y 2 - Matching Inteligente
------------------------------------------------------------
  [OK] Reconciliation_Matching_Fase_1_y_2.md
------------------------------------------------------------

[OK] 1 archivo(s) copiado(s) exitosamente!
[*] Ubicacion: F:\1. Cloud\4. AI\1. Antigravity\ConciliacionWeb\Documentos\Conversaciones\2026-01-18 Fase 1 y 2 - Matching Inteligente
```

## Estructura de Directorios Resultante

```
ConciliacionWeb/
└── Documentos/
    └── Conversaciones/
        ├── 2026-01-18 Fase 1 y 2 - Matching Inteligente/
        │   └── Reconciliation_Matching_Fase_1_y_2.md
        ├── 2026-01-18 Fase 4 Frontend - Atomic Design/
        │   ├── task.md
        │   ├── walkthrough.md
        │   └── implementation_plan.md
        └── Conversacion_2026-01-19_143022/
            └── task.md
```

## Casos de Uso Comunes

### Archivar una conversación específica por ID

```powershell
python antigravity_docs.py 3e2b0708-3c8a-46e5-b5b2-9bbb55b79dfc
# Nombre: Fase 1 y 2 - Matching Inteligente
# Selección: [ENTER] (copiar todos)
# Resultado: 2026-01-18 Fase 1 y 2 - Matching Inteligente/
```

### Guardar solo archivos específicos

```powershell
python antigravity_docs.py 99aad868-d1df-4450-ba05-c7d2255004aa
# Nombre: API Endpoints
# Selección: 1,2 (solo los primeros dos archivos)
```

### Buscar en todas las conversaciones

```powershell
python antigravity_docs.py
# Nombre: Resumen General
# Selección: [ENTER] (copiar todos los archivos comunes encontrados)
```

## Configuración del Disco F:

El script está configurado para buscar archivos en `F:\.gemini\antigravity\brain`. Si tienes tus archivos en otra ubicación, edita la línea 21 del script:

```python
brain_dir = Path("F:/.gemini/antigravity/brain")
```

## Solución de Problemas

### [!] "No se encontro el directorio brain"

**Causa:** El directorio `F:\.gemini\antigravity\brain` no existe.

**Solución:** 
- Verifica que Antigravity esté configurado para usar `F:\` 
- Verifica que existe el enlace simbólico: `Get-Item "C:\Users\Slb\.gemini" | Select-Object LinkType, Target`
- Ajusta la ruta en el script si es necesario

### [!] "No se encontraron archivos de documentación abiertos"

**Causa:** No hay archivos `.md` en la conversación especificada.

**Solución:** 
- Verifica el ID de la conversación
- Asegúrate de que la conversación tenga archivos de documentación generados
- Usa `Get-ChildItem "F:\.gemini\antigravity\brain\[ID]"` para ver qué archivos existen

### [X] "Seleccion invalida"

**Causa:** Formato incorrecto en la selección de archivos.

**Solución:** 
- Usa números separados por comas: `1,2,3`
- No uses espacios adicionales
- Verifica que los números estén dentro del rango mostrado

### Cancelar la operación

Presiona `Ctrl+C` en cualquier momento para cancelar:

```
[!] Operacion cancelada por el usuario.
```

## Notas Importantes

- ✅ El script **agrega automáticamente** el prefijo `yyyy-mm-dd` al nombre del directorio
- ✅ El script **crea automáticamente** el directorio `Documentos/Conversaciones` si no existe
- ✅ Los archivos se **copian** (no se mueven), los originales permanecen intactos
- ✅ Si el directorio de destino ya existe, los archivos se sobrescriben
- ✅ El script preserva las fechas de modificación originales de los archivos
- ✅ Compatible con Windows (sin emojis, codificación UTF-8)

## Encontrar IDs de Conversaciones

Para ver todas las conversaciones disponibles:

```powershell
Get-ChildItem "F:\.gemini\antigravity\brain" | Select-Object Name
```

Para ver los archivos de una conversación específica:

```powershell
Get-ChildItem "F:\.gemini\antigravity\brain\[ID]" -Filter *.md | Select-Object Name, Length
```

---

**Última actualización:** 2026-01-18
