from typing import List, Optional
import psycopg2
from src.domain.models.concepto import Concepto
from src.domain.ports.concepto_repository import ConceptoRepository

class PostgresConceptoRepository(ConceptoRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, concepto: Concepto) -> Concepto:
        cursor = self.conn.cursor()
        try:
            if concepto.conceptoid:
                # Actualizar
                cursor.execute(
                    """
                    UPDATE conceptos 
                    SET concepto = %s, centro_costo_id = %s, activa = %s
                    WHERE conceptoid = %s
                    """,
                    (concepto.concepto, concepto.centro_costo_id, concepto.activa, concepto.conceptoid)
                )
            else:
                # Insertar
                cursor.execute(
                    """
                    INSERT INTO conceptos (concepto, centro_costo_id, activa) 
                    VALUES (%s, %s, %s) 
                    RETURNING conceptoid
                    """,
                    (concepto.concepto, concepto.centro_costo_id, concepto.activa)
                )
                concepto.conceptoid = cursor.fetchone()[0]
            self.conn.commit()
            return concepto
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, conceptoid: int) -> Optional[Concepto]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT conceptoid, concepto, centro_costo_id, activa FROM conceptos WHERE conceptoid = %s AND activa = TRUE",
            (conceptoid,)
        )
        row = cursor.fetchone()
        cursor.close()
        if row:
            return Concepto(
                conceptoid=row[0], 
                concepto=row[1], 
                centro_costo_id=row[2],
                activa=row[3]
            )
        return None

    def obtener_todos(self) -> List[Concepto]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT conceptoid, concepto, centro_costo_id, activa FROM conceptos WHERE activa = TRUE ORDER BY concepto")
        rows = cursor.fetchall()
        cursor.close()
        return [
            Concepto(
                conceptoid=r[0], 
                concepto=r[1], 
                centro_costo_id=r[2],
                activa=r[3]
            ) for r in rows
        ]
    
    def buscar_por_centro_costo_id(self, centro_costo_id: int) -> List[Concepto]:
        """Busca conceptos por centro_costo_id"""
        cursor = self.conn.cursor()
        cursor.execute(
            """
            SELECT conceptoid, concepto, centro_costo_id, activa 
            FROM conceptos 
            WHERE centro_costo_id = %s AND activa = TRUE
            ORDER BY concepto
            """, 
            (centro_costo_id,)
        )
        rows = cursor.fetchall()
        cursor.close()
        return [
            Concepto(
                conceptoid=r[0], 
                concepto=r[1], 
                centro_costo_id=r[2],
                activa=r[3]
            ) for r in rows
        ]
        
    def eliminar(self, conceptoid: int):
        cursor = self.conn.cursor()
        try:
            # Soft delete
            cursor.execute("UPDATE conceptos SET activa = FALSE WHERE conceptoid = %s", (conceptoid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def buscar_por_nombre(self, nombre: str, centro_costo_id: Optional[int] = None) -> Optional[Concepto]:
        cursor = self.conn.cursor()
        query = "SELECT conceptoid, concepto, centro_costo_id, activa FROM conceptos WHERE LOWER(concepto) = LOWER(%s) AND activa = TRUE"
        params = [nombre]
        
        if centro_costo_id:
            query += " AND centro_costo_id = %s"
            params.append(centro_costo_id)
            
        cursor.execute(query, tuple(params))
        row = cursor.fetchone()
        cursor.close()
        
        if row:
            return Concepto(
                conceptoid=row[0], 
                concepto=row[1], 
                centro_costo_id=row[2],
                activa=row[3]
            )
        return None

    def obtener_id_traslados(self, centro_costo_id: int) -> Optional[int]:
        cursor = self.conn.cursor()
        cursor.execute(
            "SELECT conceptoid FROM conceptos WHERE centro_costo_id = %s AND concepto ILIKE '%%traslado%%' LIMIT 1", 
            (centro_costo_id,)
        )
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
