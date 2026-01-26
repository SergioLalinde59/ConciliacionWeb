import os
import csv
import io
import zipfile
from typing import List, Dict
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from src.infrastructure.database.connection import get_db_connection
from src.infrastructure.logging.config import logger

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Tablas permitidas para exportación/importación (Categorizadas)
ALLOWED_TABLES = [
    # Backups (Datos operativos)
    "conciliaciones",
    "movimientos_encabezado",
    "movimientos_detalle",
    "movimientos_extracto",
    "movimiento_vinculaciones",
    
    # Maestros
    "cuentas",
    "monedas",
    "tipomov",
    "terceros",
    "tercero_descripciones",
    "centro_costos",
    "conceptos",
    
    # Configuración
    "config_filtros_centro_costos",
    "config_valores_pendientes",
    "reglas_clasificacion",
    "matching_alias",
    "cuenta_extractores",
    "configuracion_matching"
]

from dotenv import load_dotenv

# Cargar variables de entorno
# Intentar cargar desde Backend/.env si existe, sino buscar .env por defecto
env_path = os.path.join(os.getcwd(), "Backend", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

# Configuración de directorios
# Permite configurar ruta absoluta o relativa en .env
env_backup_path = os.getenv("BACKUP_PATH", os.path.join("Backend", "data", "snapshots"))

if os.path.isabs(env_backup_path):
    SNAPSHOT_DIR = env_backup_path
else:
    SNAPSHOT_DIR = os.path.join(os.getcwd(), env_backup_path)

RESTORE_DIR = os.path.join(SNAPSHOT_DIR, "restores")

# Asegurar directorios
os.makedirs(RESTORE_DIR, exist_ok=True)

class BulkExportRequest(BaseModel):
    tables: List[str]

@router.post("/bulk-export")
def bulk_export_tables(request: BulkExportRequest, conn=Depends(get_db_connection)):
    """
    Exporta múltiples tablas en un solo archivo ZIP.
    """
    try:
        logger.info(f"Iniciando backup masivo de {len(request.tables)} tablas")
        for table in request.tables:
            if table not in ALLOWED_TABLES:
                raise HTTPException(status_code=400, detail=f"Tabla no permitida: {table}")

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            for table_name in request.tables:
                cursor = conn.cursor()
                try:
                    # Obtener columnas
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 0")
                    if cursor.description:
                        colnames = [desc[0] for desc in cursor.description]
                    else:
                        colnames = []

                    # Obtener datos
                    cursor.execute(f"SELECT * FROM {table_name}")
                    rows = cursor.fetchall()

                    # Generar CSV en memoria
                    csv_output = io.StringIO()
                    writer = csv.writer(csv_output)
                    writer.writerow(colnames)
                    writer.writerows(rows)
                    
                    zip_file.writestr(f"{table_name}.csv", csv_output.getvalue())
                except Exception as e:
                    logger.error(f"Error procesando tabla {table_name}: {str(e)}")
                    # Continuar con otras tablas o fallar? 
                    # Preferible fallar para no generar backup incompleto silencioso
                    raise e
                finally:
                    cursor.close()

        zip_buffer.seek(0)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"bulk_backup_{timestamp}.zip"
        
        # Opcional: Guardar copia en el servidor (en SNAPSHOT_DIR)
        try:
            full_path = os.path.join(SNAPSHOT_DIR, filename)
            logger.info(f"Guardando copia en servidor: {full_path}")
            with open(full_path, "wb") as f:
                f.write(zip_buffer.read())
            zip_buffer.seek(0)
        except Exception as e:
            logger.error(f"No se pudo guardar copia local del backup: {e}")
            # No fallar la descarga si solo falla el guardado local
            zip_buffer.seek(0)

        return StreamingResponse(
            iter([zip_buffer.getvalue()]),
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error crítico en bulk-export: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generando backup: {str(e)}")

@router.post("/bulk-import")
async def bulk_import_tables(file: UploadFile = File(...), conn=Depends(get_db_connection)):
    """
    Importa múltiples tablas desde un archivo ZIP. (Destructivo)
    """
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un .zip")

    content = await file.read()
    zip_buffer = io.BytesIO(content)
    
    results = {}
    
    with zipfile.ZipFile(zip_buffer, "r") as zip_ref:
        # Primero validamos que todos los archivos sean .csv y de tablas permitidas
        for filename in zip_ref.namelist():
            table_name = filename.replace(".csv", "")
            if not filename.endswith(".csv") or table_name not in ALLOWED_TABLES:
                raise HTTPException(status_code=400, detail=f"Archivo no válido en el ZIP: {filename}")

        # Procesamos cada archivo
        cursor = conn.cursor()
        try:
            for filename in zip_ref.namelist():
                table_name = filename.replace(".csv", "")
                csv_data = zip_ref.read(filename).decode("utf-8")
                io_string = io.StringIO(csv_data)
                reader = csv.reader(io_string)
                
                header = next(reader)
                rows = list(reader)
                
                if not rows:
                    results[table_name] = "Vacío"
                    continue

                processed_rows = [[None if cell == "" else cell for cell in row] for row in rows]
                
                # Deshabilitar triggers (si es posible)
                try:
                    cursor.execute(f"ALTER TABLE {table_name} DISABLE TRIGGER ALL")
                except:
                    conn.rollback()
                    # Re-obtener el cursor si falló por permisos
                    cursor = conn.cursor()

                # Limpiar tabla
                cursor.execute(f"DELETE FROM {table_name}")
                
                # Insertar datos
                columns = ", ".join(header)
                placeholders = ", ".join(["%s"] * len(header))
                query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
                cursor.executemany(query, processed_rows)
                
                # Rehabilitar
                try:
                    cursor.execute(f"ALTER TABLE {table_name} ENABLE TRIGGER ALL")
                except:
                    pass
                
                results[table_name] = f"OK ({len(processed_rows)} regs)"

            conn.commit()
            
            # Guardar copia del ZIP subido
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename_copy = f"bulk_restore_{timestamp}.zip"
            with open(os.path.join(RESTORE_DIR, filename_copy), "wb") as f:
                f.write(content)

            return {
                "mensaje": "Importación masiva completada satisfactoriamente",
                "detalles": results,
                "backup_servidor": filename_copy
            }

        except Exception as e:
            conn.rollback()
            logger.error(f"Error en bulk import: {e}")
            raise HTTPException(status_code=500, detail=f"Error fatal: {str(e)}")
        finally:
            cursor.close()

@router.get("/export/{table_name}")
def export_table_raw(table_name: str, conn=Depends(get_db_connection)):
    """
    Exporta el contenido completo de una tabla en formato CSV.
    """
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail="Tabla no permitida")

    cursor = conn.cursor()
    try:
        # Obtener columnas
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 0")
        colnames = [desc[0] for desc in cursor.description]

        # Obtener datos
        cursor.execute(f"SELECT * FROM {table_name}")
        rows = cursor.fetchall()

        # Generar CSV en memoria
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(colnames)
        writer.writerows(rows)
        output.seek(0)

        # Guardar copia en el servidor
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{timestamp}_{table_name}.csv"
        server_path = os.path.join(SNAPSHOT_DIR, filename)
        
        with open(server_path, "w", newline="", encoding="utf-8") as f:
            f.write(output.read())
            output.seek(0) # Volver al inicio para la respuesta

        logger.info(f"Snapshot generado para {table_name}: {filename}")

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error exportando tabla {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()

@router.post("/import/{table_name}")
async def import_table_raw(table_name: str, file: UploadFile = File(...), conn=Depends(get_db_connection)):
    """
    Importa contenido a una tabla desde un CSV. ADVERTENCIA: Destructivo.
    """
    if table_name not in ALLOWED_TABLES:
        raise HTTPException(status_code=400, detail="Tabla no permitida")

    content = await file.read()
    decoded = content.decode("utf-8")
    io_string = io.StringIO(decoded)
    reader = csv.reader(io_string)
    
    header = next(reader)
    rows = list(reader)

    if not rows:
        return {"mensaje": "Archivo vacío, no se realizó ninguna acción."}

    # Guardar copia del archivo subido
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"restore_{timestamp}_{table_name}.csv"
    restore_path = os.path.join(RESTORE_DIR, filename)
    with open(restore_path, "wb") as f:
        f.write(content)

    cursor = conn.cursor()
    try:
        # 1. Preparar filas: convertir "" a None para que Postgres lo tome como NULL
        processed_rows = []
        for row in rows:
            processed_rows.append([None if cell == "" else cell for cell in row])

        logger.info(f"Iniciando restauración de {table_name} desde {filename}")
        
        # 2. Deshabilitar triggers temporalmente para evitar problemas de FKs circulares o auditoría
        # OJO: Requiere permisos de superusuario o ser dueño de la tabla.
        # Si falla, procederemos con el DELETE/INSERT normal.
        try:
            cursor.execute(f"ALTER TABLE {table_name} DISABLE TRIGGER ALL")
        except:
            conn.rollback() # Limpiar error de permiso si ocurre
            logger.warning(f"No se pudieron deshabilitar triggers para {table_name}")

        # 3. Limpiar tabla
        cursor.execute(f"DELETE FROM {table_name}")
        
        # 4. INSERT
        columns = ", ".join(header)
        placeholders = ", ".join(["%s"] * len(header))
        query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        
        cursor.executemany(query, processed_rows)
        
        # Rehabilitar triggers
        try:
            cursor.execute(f"ALTER TABLE {table_name} ENABLE TRIGGER ALL")
        except:
            pass

        conn.commit()
        logger.info(f"Restauración exitosa: {len(processed_rows)} registros insertados en {table_name}")
        
        return {
            "mensaje": f"Tabla {table_name} restaurada exitosamente.",
            "registros_importados": len(processed_rows),
            "archivo_backup": filename
        }

    except Exception as e:
        conn.rollback()
        logger.error(f"Error importando tabla {table_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Error en la restauración: {str(e)}")
    finally:
        cursor.close()

@router.get("/snapshots")
def list_snapshots():
    """Lista los archivos de snapshot disponibles en el servidor."""
    files = []
    if os.path.exists(SNAPSHOT_DIR):
        for f in os.listdir(SNAPSHOT_DIR):
            if f.endswith(".csv"):
                path = os.path.join(SNAPSHOT_DIR, f)
                stats = os.stat(path)
                files.append({
                    "name": f,
                    "size": stats.st_size,
                    "date": datetime.fromtimestamp(stats.st_mtime).isoformat()
                })
    return files
