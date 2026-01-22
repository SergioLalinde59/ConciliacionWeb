from typing import List, Optional
import psycopg2
from src.domain.models.matching_alias import MatchingAlias
from src.domain.ports.matching_alias_repository import MatchingAliasRepository

class PostgresMatchingAliasRepository(MatchingAliasRepository):
    def __init__(self, connection):
        self.conn = connection
        
    def _row_to_alias(self, row) -> MatchingAlias:
        """Helper para convertir fila a objeto"""
        return MatchingAlias(
            id=row[0],
            cuenta_id=row[1],
            patron=row[2],
            reemplazo=row[3],
            created_at=row[4]
        )

    def guardar(self, alias: MatchingAlias) -> MatchingAlias:
        cursor = self.conn.cursor()
        try:
            if alias.id:
                # Update
                cursor.execute(
                    """
                    UPDATE matching_alias 
                    SET cuenta_id = %s, patron = %s, reemplazo = %s 
                    WHERE id = %s
                    """,
                    (alias.cuenta_id, alias.patron, alias.reemplazo, alias.id)
                )
            else:
                # Insert
                cursor.execute(
                    """
                    INSERT INTO matching_alias (cuenta_id, patron, reemplazo) 
                    VALUES (%s, %s, %s) 
                    RETURNING id, created_at
                    """,
                    (alias.cuenta_id, alias.patron, alias.reemplazo)
                )
                res = cursor.fetchone()
                alias.id = res[0]
                alias.created_at = res[1]
                
            self.conn.commit()
            return alias
            
        except psycopg2.IntegrityError as e:
            self.conn.rollback()
            if "unique_alias_per_account" in str(e) or "uq_alias_patron_reemplazo_cuenta" in str(e):
                raise ValueError(f"Ya existe una regla idéntica (Patrón + Reemplazo) para esta cuenta")
            raise e
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, id: int) -> Optional[MatchingAlias]:
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "SELECT id, cuenta_id, patron, reemplazo, created_at FROM matching_alias WHERE id = %s",
                (id,)
            )
            row = cursor.fetchone()
            if row:
                return self._row_to_alias(row)
            return None
        finally:
            cursor.close()

    def obtener_por_cuenta(self, cuenta_id: int) -> List[MatchingAlias]:
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                SELECT id, cuenta_id, patron, reemplazo, created_at 
                FROM matching_alias 
                WHERE cuenta_id = %s 
                ORDER BY created_at DESC
                """,
                (cuenta_id,)
            )
            rows = cursor.fetchall()
            return [self._row_to_alias(row) for row in rows]
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        cursor = self.conn.cursor()
        try:
            cursor.execute("DELETE FROM matching_alias WHERE id = %s", (id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
