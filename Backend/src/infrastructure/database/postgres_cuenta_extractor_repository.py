from typing import List
from datetime import datetime
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository
from src.domain.models.cuenta_extractor import CuentaExtractor

class PostgresCuentaExtractorRepository(CuentaExtractorRepository):
    def __init__(self, connection):
        self.conn = connection

    def obtener_modulos(self, cuenta_id: int, tipo: str) -> List[str]:
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT modulo
                FROM cuenta_extractores
                WHERE cuenta_id = %s AND tipo = %s AND activo = TRUE
                ORDER BY orden ASC
            """
            cursor.execute(query, (cuenta_id, tipo))
            rows = cursor.fetchall()
            return [row[0] for row in rows]
        except Exception as e:
            raise e
        finally:
            cursor.close()

    def obtener_todos(self) -> List[CuentaExtractor]:
        cursor = self.conn.cursor()
        try:
            query = "SELECT id, cuenta_id, tipo, modulo, orden, activo, created_at FROM cuenta_extractores ORDER BY id"
            cursor.execute(query)
            rows = cursor.fetchall()
            return [
                CuentaExtractor(
                    id=row[0],
                    cuenta_id=row[1],
                    tipo=row[2],
                    modulo=row[3],
                    orden=row[4],
                    activo=row[5],
                    created_at=row[6]
                ) for row in rows
            ]
        finally:
            cursor.close()

    def guardar(self, extractor: CuentaExtractor) -> CuentaExtractor:
        cursor = self.conn.cursor()
        try:
            query = """
                INSERT INTO cuenta_extractores (cuenta_id, tipo, modulo, orden, activo, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            created_at = extractor.created_at or datetime.now()
            cursor.execute(query, (extractor.cuenta_id, extractor.tipo, extractor.modulo, extractor.orden, extractor.activo, created_at))
            new_id = cursor.fetchone()[0]
            self.conn.commit()
            extractor.id = new_id
            extractor.created_at = created_at
            return extractor
        finally:
            cursor.close()

    def actualizar(self, extractor: CuentaExtractor) -> CuentaExtractor:
        cursor = self.conn.cursor()
        try:
            query = """
                UPDATE cuenta_extractores
                SET cuenta_id = %s, tipo = %s, modulo = %s, orden = %s, activo = %s
                WHERE id = %s
            """
            cursor.execute(query, (extractor.cuenta_id, extractor.tipo, extractor.modulo, extractor.orden, extractor.activo, extractor.id))
            self.conn.commit()
            return extractor
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        cursor = self.conn.cursor()
        try:
            query = "DELETE FROM cuenta_extractores WHERE id = %s"
            cursor.execute(query, (id,))
            self.conn.commit()
        finally:
            cursor.close()
