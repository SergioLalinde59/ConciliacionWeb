from typing import List, Optional
from src.domain.models.tercero_descripcion import TerceroDescripcion
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository

class PostgresTerceroDescripcionRepository(TerceroDescripcionRepository):
    def __init__(self, conn):
        self.conn = conn
    
    def _map_row(self, row) -> TerceroDescripcion:
        """Mapea una fila de BD a TerceroDescripcion."""
        return TerceroDescripcion(
            id=row[0],
            terceroid=row[1],
            descripcion=row[2],
            referencia=row[3],
            activa=row[4],
            created_at=row[5]
        )
    
    def guardar(self, descripcion: TerceroDescripcion) -> TerceroDescripcion:
        cursor = self.conn.cursor()
        try:
            if descripcion.id:
                # Update
                query = """
                    UPDATE tercero_descripciones 
                    SET terceroid = %s, descripcion = %s, referencia = %s, activa = %s
                    WHERE id = %s
                """
                cursor.execute(query, (
                    descripcion.terceroid,
                    descripcion.descripcion,
                    descripcion.referencia,
                    descripcion.activa,
                    descripcion.id
                ))
            else:
                # Insert
                query = """
                    INSERT INTO tercero_descripciones (terceroid, descripcion, referencia, activa)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id;
                """
                cursor.execute(query, (
                    descripcion.terceroid,
                    descripcion.descripcion,
                    descripcion.referencia,
                    descripcion.activa
                ))
                new_id = cursor.fetchone()[0]
                descripcion.id = new_id
            
            self.conn.commit()
            return descripcion
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def obtener_por_id(self, id: int) -> Optional[TerceroDescripcion]:
        cursor = self.conn.cursor()
        query = """
            SELECT id, terceroid, descripcion, referencia, activa, created_at 
            FROM tercero_descripciones 
            WHERE id = %s AND activa = TRUE
        """
        cursor.execute(query, (id,))
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return self._map_row(row)
        return None
    
    def obtener_por_tercero_id(self, terceroid: int) -> List[TerceroDescripcion]:
        cursor = self.conn.cursor()
        query = """
            SELECT id, terceroid, descripcion, referencia, activa, created_at 
            FROM tercero_descripciones 
            WHERE terceroid = %s AND activa = TRUE
            ORDER BY descripcion
        """
        cursor.execute(query, (terceroid,))
        rows = cursor.fetchall()
        cursor.close()
        
        return [self._map_row(row) for row in rows]

    def obtener_todas(self) -> List[TerceroDescripcion]:
        cursor = self.conn.cursor()
        query = """
            SELECT td.id, td.terceroid, td.descripcion, td.referencia, td.activa, td.created_at 
            FROM tercero_descripciones td
            JOIN terceros t ON td.terceroid = t.terceroid
            WHERE td.activa = TRUE
            ORDER BY t.tercero ASC, td.descripcion ASC
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        
        return [self._map_row(row) for row in rows]
    
    def eliminar(self, id: int) -> None:
        """Soft delete - marca como inactivo."""
        cursor = self.conn.cursor()
        try:
            query = "UPDATE tercero_descripciones SET activa = FALSE WHERE id = %s"
            cursor.execute(query, (id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def buscar_por_referencia(self, referencia: str):
        """Busca una descripción por referencia exacta o con sufijo .0 (datos legacy)."""
        cursor = self.conn.cursor()
        # Buscar referencia exacta O con sufijo .0 (porque algunos datos se cargaron con decimales)
        query = """
            SELECT id, terceroid, descripcion, referencia, activa, created_at 
            FROM tercero_descripciones 
            WHERE (referencia = %s OR referencia = %s) AND activa = TRUE
            LIMIT 1
        """
        cursor.execute(query, (referencia, f"{referencia}.0"))
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return self._map_row(row)
        return None
    
    def buscar_por_descripcion(self, texto: str):
        """Busca descripciones que contengan el texto dado."""
        cursor = self.conn.cursor()
        # Buscar por coincidencia parcial, case insensitive
        query = """
            SELECT id, terceroid, descripcion, referencia, activa, created_at 
            FROM tercero_descripciones 
            WHERE UPPER(descripcion) LIKE UPPER(%s) AND activa = TRUE
            ORDER BY descripcion
            LIMIT 10
        """
        patron = f"%{texto}%"
        cursor.execute(query, (patron,))
        rows = cursor.fetchall()
        cursor.close()
        
        return [self._map_row(row) for row in rows]
