from typing import List
from src.domain.models.regla_clasificacion import ReglaClasificacion
from src.domain.ports.reglas_repository import ReglasRepository

class PostgresReglasRepository(ReglasRepository):
    """
    Implementación de ReglasRepository usando PostgreSQL.
    """
    
    def __init__(self, connection):
        self.conn = connection

    def obtener_todos(self) -> List[ReglaClasificacion]:
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT id, patron, tercero_id, grupo_id, concepto_id, tipo_match
                FROM reglas_clasificacion
                ORDER BY id DESC
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            
            reglas = []
            for row in rows:
                reglas.append(ReglaClasificacion(
                    id=row[0],
                    patron=row[1],
                    tercero_id=row[2],
                    grupo_id=row[3],
                    concepto_id=row[4],
                    tipo_match=row[5]
                ))
            return reglas
        finally:
            cursor.close()

    def guardar(self, regla: ReglaClasificacion) -> ReglaClasificacion:
        cursor = self.conn.cursor()
        try:
            if regla.id:
                # Update
                query = """
                    UPDATE reglas_clasificacion
                    SET patron=%s, tercero_id=%s, grupo_id=%s, concepto_id=%s, tipo_match=%s
                    WHERE id=%s
                """
                cursor.execute(query, (
                    regla.patron, regla.tercero_id, regla.grupo_id, regla.concepto_id, regla.tipo_match, regla.id
                ))
            else:
                # Insert
                query = """
                    INSERT INTO reglas_clasificacion (patron, tercero_id, grupo_id, concepto_id, tipo_match)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                """
                cursor.execute(query, (
                    regla.patron, regla.tercero_id, regla.grupo_id, regla.concepto_id, regla.tipo_match
                ))
                regla.id = cursor.fetchone()[0]
                
            self.conn.commit()
            return regla
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        cursor = self.conn.cursor()
        try:
            cursor.execute("DELETE FROM reglas_clasificacion WHERE id = %s", (id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
