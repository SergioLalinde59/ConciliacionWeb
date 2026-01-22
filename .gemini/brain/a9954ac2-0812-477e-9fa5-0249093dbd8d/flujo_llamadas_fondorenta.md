# Flujo de Llamadas: Analizar Archivo FondoRenta

## 📋 Resumen
Trazado completo de las llamadas cuando se presiona el botón **"Analizar Archivo"** en la página "Cargar Movimientos Bancarios" para la cuenta FondoRenta.

---

## 🔄 Flujo Completo

### 1️⃣ Frontend - UploadMovimientosPage.tsx
**Archivo**: `Frontend/src/pages/UploadMovimientosPage.tsx`

**Acción**: Usuario presiona botón "Analizar Archivo"
- **Handler**: `handleAnalizar()` (línea 43)
- **Tipo Cuenta**: `'fondo_renta'` (línea 127)
- **Llamada**: `apiService.archivos.analizar(file, tipoCuenta)`

```typescript
// Línea 54
const data = await apiService.archivos.analizar(file, tipoCuenta)
// tipoCuenta = 'fondo_renta'
```

---

### 2️⃣ Frontend - files.service.ts
**Archivo**: `Frontend/src/services/files.service.ts`

**Acción**: Service envía petición HTTP
- **Método**: `POST`
- **Endpoint**: `/api/archivos/analizar`
- **Parámetros FormData**:
  - `file`: PDF file
  - `tipo_cuenta`: `'fondo_renta'`

```typescript
// Línea 19-27
analizar: (file: File, tipo_cuenta: string): Promise<any> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('tipo_cuenta', tipo_cuenta)  // 'fondo_renta'
    
    return fetch(`${API_BASE_URL}/api/archivos/analizar`, {
        method: 'POST',
        body: formData
    }).then(handleResponse)
}
```

---

### 3️⃣ Backend - archivos.py (Router)
**Archivo**: `Backend/src/infrastructure/api/routers/archivos.py`

**Acción**: Endpoint recibe la petición
- **Endpoint**: `@router.post("/analizar")` (línea 50)
- **Parámetros recibidos**:
  - `file`: UploadFile
  - `tipo_cuenta`: `'fondo_renta'` (str)

**Llamada al servicio**:
```python
# Línea 63
resultado = service.analizar_archivo(file.file, file.filename, tipo_cuenta)
# tipo_cuenta = 'fondo_renta'
```

---

### 4️⃣ Backend - ProcesadorArchivosService
**Archivo**: `Backend/src/application/services/procesador_archivos_service.py`

#### Método: `analizar_archivo()`
**Línea**: 85

**Acción**: Extrae movimientos del PDF
```python
# Línea 90
raw_movs = self._extraer_movimientos(file_obj, tipo_cuenta)
# tipo_cuenta = 'fondo_renta'
```

#### Método privado: `_extraer_movimientos()`
**Línea**: 67

**🔴 PROBLEMA IDENTIFICADO AQUÍ**:
```python
# Línea 67-76
def _extraer_movimientos(self, file_obj: Any, tipo_cuenta: str) -> List[Dict[str, Any]]:
    raw_movs = []
    if tipo_cuenta == 'bancolombia_ahorro':
        raw_movs = extraer_movimientos_bancolombia(file_obj)
    elif tipo_cuenta == 'credit_card':
        raw_movs = extraer_movimientos_credito(file_obj)
    elif tipo_cuenta == 'fondo_renta':       # ✅ MATCH
        raw_movs = extraer_movimientos_fondorenta(file_obj)
    else:
        raise ValueError(f"Tipo de cuenta no soportado: {tipo_cuenta}")
```

**Estado**: ✅ La condición coincide correctamente con `'fondo_renta'`

---

### 5️⃣ Backend - fondorenta.py (Extractor)
**Archivo**: `Backend/src/infrastructure/extractors/fondorenta.py`

#### Función: `extraer_movimientos_fondorenta()`
**Línea**: 7

**Acción**: Intenta extraer movimientos del PDF
```python
# Línea 14-22
with pdfplumber.open(file_obj) as pdf:
    for page in pdf.pages:
        texto = page.extract_text()
        if texto:
            movs = _extraer_movimientos_desde_texto(texto)
            movimientos_raw.extend(movs)
```

#### Función privada: `_extraer_movimientos_desde_texto()`
**Línea**: 66

**🔴 AQUÍ ESTÁ EL ERROR**:
```python
# Línea 66-96
def _extraer_movimientos_desde_texto(texto: str) -> List[Dict]:
    movimientos = []
    lines = texto.split('\n')
    
    for line in lines:
        line = line.strip()
        # Regex para línea de movimiento: 
        # 20251201 ADICION 7.000.000,00 174,58986829 9.457.535,91
        # Grupo 1: Fecha YYYYMMDD
        # Grupo 2: Descripción (puede tener espacios)
        # Grupo 3: Valor (con puntos y coma decimal)
        
        # ❌ REGEX ACTUAL:
        match = re.match(r'^(\d{8})\s+(.+?)\s+([\d]{1,3}(?:[.]\d{3})*,\d{2})\s+', line)
        
        if match:
            fecha_str = match.group(1)
            descripcion = match.group(2).strip()
            valor_str = match.group(3)
            referencia = ""
            
            movimientos.append({
                'fecha_str': fecha_str,
                'descripcion': descripcion,
                'referencia': referencia,
                'valor_str': valor_str
            })
    return movimientos
```

---

## 🎯 Diagnóstico del Error

### El Problema
La función `_extraer_movimientos_desde_texto()` utiliza un **regex que no coincide con el formato real del PDF**.

### Formato Esperado por el Código
```
20251201 ADICION 7.000.000,00 174,58986829 9.457.535,91
```

### Formato Real del PDF
**NECESITAMOS VER EL CONTENIDO EXACTO DEL PDF** para ajustar el regex.

---

## ✅ Siguiente Paso

**Acción requerida**: Extraer el texto real del PDF para ver el formato exacto de las líneas de movimientos.

### Cómo obtenerlo:
1. Agregar logging temporal en `fondorenta.py` línea 68 para imprimir el `texto` completo
2. Cargar el PDF nuevamente
3. Ver el output en los logs

### Código para agregar (línea 68):
```python
lines = texto.split('\n')

# DEBUG: Print full text
print("=" * 80)
print("DEBUG FONDORENTA - TEXTO EXTRAÍDO:")
print(texto)
print("=" * 80)
```

Una vez tengamos el texto real, podremos ajustar el regex en la línea 80.
