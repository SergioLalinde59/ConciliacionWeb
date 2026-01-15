from typing import List, Optional
import psycopg2
from src.domain.models.centro_costo import CentroCosto
from src.domain.ports.centro_costo_repository import CentroCostoRepository

class PostgresCentroCostoRepository(CentroCostoRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, centro_costo: CentroCosto) -> CentroCosto:
        cursor = self.conn.cursor()
        try:
            if centro_costo.centro_costo_id:
                cursor.execute(
                    "UPDATE centro_costos SET centro_costo = %s, activa = %s WHERE centro_costo_id = %s",
                    (centro_costo.centro_costo, centro_costo.activa, centro_costo.centro_costo_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO centro_costos (centro_costo, activa) VALUES (%s, %s) RETURNING centro_costo_id",
                    (centro_costo.centro_costo, centro_costo.activa)
                )
                centro_costo.centro_costo_id = cursor.fetchone()[0]
            self.conn.commit()
            return centro_costo
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, centro_costo_id: int) -> Optional[CentroCosto]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT centro_costo_id, centro_costo, activa FROM centro_costos WHERE centro_costo_id = %s AND activa = TRUE", (centro_costo_id,))
        row = cursor.fetchone()
        cursor.close()
        return CentroCosto(centro_costo_id=row[0], centro_costo=row[1], activa=row[2]) if row else None

    def obtener_todos(self) -> List[CentroCosto]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT centro_costo_id, centro_costo, activa FROM centro_costos WHERE activa = TRUE ORDER BY centro_costo")
        rows = cursor.fetchall()
        cursor.close()
        return [CentroCosto(centro_costo_id=r[0], centro_costo=r[1], activa=r[2]) for r in rows]

    def buscar_por_nombre(self, nombre: str) -> Optional[CentroCosto]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT centro_costo_id, centro_costo, activa FROM centro_costos WHERE LOWER(centro_costo) = LOWER(%s) AND activa = TRUE", (nombre,))
        row = cursor.fetchone()
        cursor.close()
        return CentroCosto(centro_costo_id=row[0], centro_costo=row[1], activa=row[2]) if row else None
    
    def eliminar(self, centro_costo_id: int):
        cursor = self.conn.cursor()
        try:
            cursor.execute("UPDATE centro_costos SET activa = FALSE WHERE centro_costo_id = %s", (centro_costo_id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_filtros_exclusion(self) -> List[dict]:
        cursor = self.conn.cursor()
        query = """
            SELECT c.centro_costo_id, c.etiqueta, c.activo_por_defecto
            FROM config_filtros_centro_costos c
            ORDER BY c.etiqueta
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "centro_costo_id": row[0], 
                "etiqueta": row[1], 
                "activo_por_defecto": row[2]
            }
            for row in rows
        ]

    def obtener_id_traslados(self) -> Optional[int]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT centro_costo_id FROM config_filtros_centro_costos WHERE etiqueta ILIKE '%traslado%' LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
