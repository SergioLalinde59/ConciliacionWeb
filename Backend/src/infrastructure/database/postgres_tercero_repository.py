from typing import List, Optional
import psycopg2
from src.domain.models.tercero import Tercero
from src.domain.ports.tercero_repository import TerceroRepository
from src.infrastructure.logging.config import logger

class PostgresTerceroRepository(TerceroRepository):
    """
    Adaptador de Base de Datos para PostgreSQL.
    Implementa la interfaz TerceroRepository usando psycopg2.
    
    Nota: Después de 3NF, los campos descripcion/referencia están en tercero_descripciones.
    """
    
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, tercero: Tercero) -> Tercero:
        cursor = self.conn.cursor()
        try:
            if tercero.terceroid:
                logger.info(f"Actualizando tercero ID {tercero.terceroid}: {tercero.tercero}")
                query = """
                    UPDATE terceros 
                    SET tercero = %s, activa = %s
                    WHERE terceroid = %s
                """
                cursor.execute(query, (tercero.tercero, tercero.activa, tercero.terceroid))
            else:
                logger.info(f"Insertando nuevo tercero: {tercero.tercero}")
                query = """
                    INSERT INTO terceros (tercero, activa)
                    VALUES (%s, %s)
                    RETURNING terceroid;
                """
                cursor.execute(query, (tercero.tercero, tercero.activa))
                new_id = cursor.fetchone()[0]
                tercero.terceroid = new_id
            
            self.conn.commit()
            return tercero
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Error en PostgresTerceroRepository.guardar: {str(e)}", exc_info=True)
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, terceroid: int) -> Optional[Tercero]:
        cursor = self.conn.cursor()
        query = "SELECT terceroid, tercero, activa FROM terceros WHERE terceroid = %s AND activa = TRUE"
        cursor.execute(query, (terceroid,))
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return Tercero(terceroid=row[0], tercero=row[1], activa=row[2])
        return None

    def obtener_todos(self) -> List[Tercero]:
        cursor = self.conn.cursor()
        query = "SELECT terceroid, tercero, activa FROM terceros WHERE activa = TRUE ORDER BY tercero"
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            Tercero(terceroid=row[0], tercero=row[1], activa=row[2]) 
            for row in rows
        ]

    def buscar_similares(self, query: str, limite: int = 10) -> List[Tercero]:
        cursor = self.conn.cursor()
        
        # Estrategia:
        # 1. Coincidencia exacta o ILIKE simple (prioridad)
        # 2. Similitud por trigramas (SIMILARITY > 0.3)
        # Ordenado por score descendente
        
        sql = """
            SELECT terceroid, tercero, activa,
                   similarity(tercero, %s) as score
            FROM terceros
            WHERE activa = TRUE
              AND (
                  tercero ILIKE %s OR 
                  similarity(tercero, %s) > 0.3
              )
            ORDER BY score DESC
            LIMIT %s
        """
        
        like_query = f"%{query}%"
        cursor.execute(sql, (
            query,           # Para similarity()
            like_query,      # Para ILIKE
            query,           # Para similarity() where clause
            limite
        ))
        
        rows = cursor.fetchall()
        cursor.close()
        
        return [
            Tercero(terceroid=row[0], tercero=row[1], activa=row[2]) 
            for row in rows
        ]

    def buscar_exacto(self, nombre: str) -> Optional[Tercero]:
        """Busca un tercero que coincida exactamente con el nombre."""
        cursor = self.conn.cursor()
        try:
            query = "SELECT terceroid, tercero, activa FROM terceros WHERE tercero = %s AND activa = TRUE"
            cursor.execute(query, (nombre,))
            
            row = cursor.fetchone()
            if row:
                return Tercero(terceroid=row[0], tercero=row[1], activa=row[2])
            return None
        finally:
            cursor.close()

    def eliminar(self, terceroid: int):
        cursor = self.conn.cursor()
        try:
            # Soft delete
            cursor.execute("UPDATE terceros SET activa = FALSE WHERE terceroid = %s", (terceroid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
