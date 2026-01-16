from typing import List, Optional
import psycopg2
from src.domain.models.cuenta import Cuenta
from src.domain.ports.cuenta_repository import CuentaRepository

class PostgresCuentaRepository(CuentaRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, cuenta: Cuenta) -> Cuenta:
        cursor = self.conn.cursor()
        try:
            if cuenta.cuentaid:
                cursor.execute(
                    "UPDATE cuentas SET cuenta = %s, activa = %s, permite_carga = %s, permite_conciliar = %s WHERE cuentaid = %s",
                    (cuenta.cuenta, cuenta.activa, cuenta.permite_carga, cuenta.permite_conciliar, cuenta.cuentaid)
                )
            else:
                cursor.execute(
                    "INSERT INTO cuentas (cuenta, activa, permite_carga, permite_conciliar) VALUES (%s, %s, %s, %s) RETURNING cuentaid",
                    (cuenta.cuenta, cuenta.activa, cuenta.permite_carga, cuenta.permite_conciliar)
                )
                cuenta.cuentaid = cursor.fetchone()[0]
            self.conn.commit()
            return cuenta
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, cuentaid: int) -> Optional[Cuenta]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT cuentaid, cuenta, activa, permite_carga, permite_conciliar FROM cuentas WHERE cuentaid = %s AND activa = TRUE", (cuentaid,))
        row = cursor.fetchone()
        cursor.close()
        return Cuenta(cuentaid=row[0], cuenta=row[1], activa=row[2], permite_carga=row[3], permite_conciliar=row[4]) if row else None

    def obtener_todos(self) -> List[Cuenta]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT cuentaid, cuenta, activa, permite_carga, permite_conciliar FROM cuentas WHERE activa = TRUE ORDER BY cuenta")
        rows = cursor.fetchall()
        cursor.close()
        return [Cuenta(cuentaid=r[0], cuenta=r[1], activa=r[2], permite_carga=r[3], permite_conciliar=r[4]) for r in rows]

    def buscar_por_nombre(self, nombre: str) -> Optional[Cuenta]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT cuentaid, cuenta, activa, permite_carga, permite_conciliar FROM cuentas WHERE LOWER(cuenta) = LOWER(%s) AND activa = TRUE", (nombre,))
        row = cursor.fetchone()
        cursor.close()
        return Cuenta(cuentaid=row[0], cuenta=row[1], activa=row[2], permite_carga=row[3], permite_conciliar=row[4]) if row else None

    def eliminar(self, cuentaid: int):
        cursor = self.conn.cursor()
        try:
            # Soft delete
            cursor.execute("UPDATE cuentas SET activa = FALSE WHERE cuentaid = %s", (cuentaid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
