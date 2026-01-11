from typing import List, Optional
import psycopg2
from src.domain.models.tipo_mov import TipoMov
from src.domain.ports.tipo_mov_repository import TipoMovRepository

class PostgresTipoMovRepository(TipoMovRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, tipo: TipoMov) -> TipoMov:
        cursor = self.conn.cursor()
        try:
            if tipo.tipomovid:
                cursor.execute(
                    "UPDATE tipomov SET tipomov = %s, activa = %s WHERE tipomovid = %s",
                    (tipo.tipomov, tipo.activa, tipo.tipomovid)
                )
            else:
                cursor.execute(
                    "INSERT INTO tipomov (tipomov, activa) VALUES (%s, %s) RETURNING tipomovid",
                    (tipo.tipomov, tipo.activa)
                )
                tipo.tipomovid = cursor.fetchone()[0]
            self.conn.commit()
            return tipo
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, tipomovid: int) -> Optional[TipoMov]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT tipomovid, tipomov, activa FROM tipomov WHERE tipomovid = %s AND activa = TRUE", (tipomovid,))
        row = cursor.fetchone()
        cursor.close()
        return TipoMov(tipomovid=row[0], tipomov=row[1], activa=row[2]) if row else None

    def obtener_todos(self) -> List[TipoMov]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT tipomovid, tipomov, activa FROM tipomov WHERE activa = TRUE ORDER BY tipomov")
        rows = cursor.fetchall()
        cursor.close()
        return [TipoMov(tipomovid=r[0], tipomov=r[1], activa=r[2]) for r in rows]
    
    def buscar_por_nombre(self, nombre: str) -> Optional[TipoMov]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT tipomovid, tipomov, activa FROM tipomov WHERE LOWER(tipomov) = LOWER(%s) AND activa = TRUE", (nombre,))
        row = cursor.fetchone()
        cursor.close()
        return TipoMov(tipomovid=row[0], tipomov=row[1], activa=row[2]) if row else None

    def eliminar(self, tipomovid: int):
        cursor = self.conn.cursor()
        try:
            cursor.execute("UPDATE tipomov SET activa = FALSE WHERE tipomovid = %s", (tipomovid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
