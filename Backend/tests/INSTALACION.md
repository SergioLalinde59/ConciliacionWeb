# Instalación de Dependencias

## Producción

Instalar todas las dependencias de producción:

```bash
cd Backend
pip install -r requirements.txt
```

## Desarrollo

Instalar dependencias de producción + desarrollo:

```bash
cd Backend
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

## Crear entorno virtual (recomendado)

### Windows (PowerShell)
```powershell
# Crear virtualenv
python -m venv .venv

# Activar
.venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r requirements.txt
```

### Linux/Mac
```bash
# Crear virtualenv
python -m venv .venv

# Activar
source .venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

## Actualizar requirements.txt

Si instalas nuevas dependencias, actualiza el archivo:

```bash
pip freeze > requirements-frozen.txt
```

Luego revisa `requirements-frozen.txt` y copia solo las dependencias directas a `requirements.txt`.

## Notas

- `requirements.txt` contiene dependencias de **producción**
- `requirements-dev.txt` contiene dependencias adicionales para **desarrollo**
- Las versiones están fijadas para reproducibilidad
- Actualiza las versiones regularmente por seguridad
