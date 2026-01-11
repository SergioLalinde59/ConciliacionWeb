from typing import List, Optional
import psycopg2
from src.domain.models.grupo import Grupo
from src.domain.ports.grupo_repository import GrupoRepository

class PostgresGrupoRepository(GrupoRepository):
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, grupo: Grupo) -> Grupo:
        cursor = self.conn.cursor()
        try:
            if grupo.grupoid:
                cursor.execute(
                    "UPDATE grupos SET grupo = %s, activa = %s WHERE grupoid = %s",
                    (grupo.grupo, grupo.activa, grupo.grupoid)
                )
            else:
                cursor.execute(
                    "INSERT INTO grupos (grupo, activa) VALUES (%s, %s) RETURNING grupoid",
                    (grupo.grupo, grupo.activa)
                )
                grupo.grupoid = cursor.fetchone()[0]
            self.conn.commit()
            return grupo
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, grupoid: int) -> Optional[Grupo]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT grupoid, grupo, activa FROM grupos WHERE grupoid = %s AND activa = TRUE", (grupoid,))
        row = cursor.fetchone()
        cursor.close()
        return Grupo(grupoid=row[0], grupo=row[1], activa=row[2]) if row else None

    def obtener_todos(self) -> List[Grupo]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT grupoid, grupo, activa FROM grupos WHERE activa = TRUE ORDER BY grupo")
        rows = cursor.fetchall()
        cursor.close()
        return [Grupo(grupoid=r[0], grupo=r[1], activa=r[2]) for r in rows]

    def buscar_por_nombre(self, nombre: str) -> Optional[Grupo]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT grupoid, grupo, activa FROM grupos WHERE LOWER(grupo) = LOWER(%s) AND activa = TRUE", (nombre,))
        row = cursor.fetchone()
        cursor.close()
        return Grupo(grupoid=row[0], grupo=row[1], activa=row[2]) if row else None
    
    def eliminar(self, grupoid: int):
        cursor = self.conn.cursor()
        try:
            cursor.execute("UPDATE grupos SET activa = FALSE WHERE grupoid = %s", (grupoid,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_filtros_exclusion(self) -> List[dict]:
        cursor = self.conn.cursor()
        query = """
            SELECT c.grupo_id, c.etiqueta, c.activo_por_defecto
            FROM config_filtros_grupos c
            ORDER BY c.etiqueta
        """
        cursor.execute(query)
        rows = cursor.fetchall()
        cursor.close()
        return [
            {
                "grupo_id": row[0], 
                "etiqueta": row[1], 
                "activo_por_defecto": row[2]
            }
            for row in rows
        ]

    def obtener_id_traslados(self) -> Optional[int]:
        cursor = self.conn.cursor()
        cursor.execute("SELECT grupo_id FROM config_filtros_grupos WHERE etiqueta ILIKE '%traslado%' LIMIT 1")
        row = cursor.fetchone()
        cursor.close()
        return row[0] if row else None
