from typing import List, Optional
import psycopg2
from src.domain.models.moneda import Moneda
from src.domain.ports.moneda_repository import MonedaRepository

class PostgresMonedaRepository(MonedaRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, moneda: Moneda) -> Moneda:
        cursor = self.conn.cursor()
        try:
            if moneda.monedaid:
                cursor.execute(
                    "UPDATE monedas SET isocode = %s, moneda = %s, activa = %s WHERE monedaid = %s",
                    (moneda.isocode, moneda.moneda, moneda.activa, moneda.monedaid)
                )
            else:
                cursor.execute(
                    "INSERT INTO monedas (isocode, moneda, activa) VALUES (%s, %s, %s) RETURNING monedaid",
                    (moneda.isocode, moneda.moneda, moneda.activa)
                )
                moneda.monedaid = cursor.fetchone()[0]
            self.conn.commit()
            return moneda
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, monedaid: int) -> Optional[Moneda]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT monedaid, isocode, moneda, activa FROM monedas WHERE monedaid = %s AND activa = TRUE", (monedaid,))
        row = cursor.fetchone()
        cursor.close()
        if row:
            return Moneda(monedaid=row[0], isocode=row[1], moneda=row[2], activa=row[3])
        return None

    def obtener_todos(self) -> List[Moneda]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT monedaid, isocode, moneda, activa FROM monedas WHERE activa = TRUE ORDER BY moneda")
        rows = cursor.fetchall()
        cursor.close()
        return [Moneda(monedaid=r[0], isocode=r[1], moneda=r[2], activa=r[3]) for r in rows]

    def buscar_por_nombre(self, nombre: str) -> Optional[Moneda]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT monedaid, isocode, moneda, activa FROM monedas WHERE LOWER(moneda) = LOWER(%s) AND activa = TRUE", (nombre,))
        row = cursor.fetchone()
        cursor.close()
        if row:
            return Moneda(monedaid=row[0], isocode=row[1], moneda=row[2], activa=row[3])
        return None
    
    def eliminar(self, monedaid: int):
        cursor = self.conn.cursor()
        try:
            cursor.execute("UPDATE monedas SET activa = FALSE WHERE monedaid = %s", (monedaid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
