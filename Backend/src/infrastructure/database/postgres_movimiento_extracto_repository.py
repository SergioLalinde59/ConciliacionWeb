from typing import List, Optional
from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
class PostgresMovimientoExtractoRepository(MovimientoExtractoRepository):
    """
    Implementación PostgreSQL del repositorio de Movimientos de Extracto.
    """
    
    def __init__(self, connection):
        self.conn = connection
    
    def _row_to_movimiento(self, row) -> MovimientoExtracto:
        """Convierte una fila de BD a MovimientoExtracto"""
        if not row:
            return None
        
        return MovimientoExtracto(
            id=row[0],
            cuenta_id=row[1],
            year=row[2],
            month=row[3],
            fecha=row[4],
            descripcion=row[5],
            referencia=row[6],
            valor=row[7],
            usd=row[8],
            trm=row[9],
            numero_linea=row[10],
            raw_text=row[11],
            created_at=row[12],
            cuenta=row[13] if len(row) > 13 else None
        )
    
    def guardar(self, movimiento: MovimientoExtracto) -> MovimientoExtracto:
        cursor = self.conn.cursor()
        try:
            query = """
                INSERT INTO movimientos_extracto (
                    cuenta_id, year, month, fecha, descripcion, 
                    referencia, valor, usd, trm, numero_linea, raw_text
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
            """
            cursor.execute(query, (
                movimiento.cuenta_id, movimiento.year, movimiento.month,
                movimiento.fecha, movimiento.descripcion, movimiento.referencia,
                movimiento.valor, movimiento.usd, movimiento.trm, 
                movimiento.numero_linea, movimiento.raw_text
            ))
            
            result = cursor.fetchone()
            movimiento.id = result[0]
            movimiento.created_at = result[1]
            
            self.conn.commit()
            return movimiento
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def guardar_lote(self, movimientos: List[MovimientoExtracto]) -> int:
        if not movimientos:
            return 0
        
        cursor = self.conn.cursor()
        try:
            query = """
                INSERT INTO movimientos_extracto (
                    cuenta_id, year, month, fecha, descripcion, 
                    referencia, valor, usd, trm, numero_linea, raw_text
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            data = [
                (m.cuenta_id, m.year, m.month, m.fecha, m.descripcion,
                 m.referencia, m.valor, m.usd, m.trm, m.numero_linea, m.raw_text)
                for m in movimientos
            ]
            
            cursor.executemany(query, data)
            count = cursor.rowcount
            self.conn.commit()
            
            return count
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def obtener_por_periodo(self, cuenta_id: int, year: int, month: int) -> List[MovimientoExtracto]:
        cursor = self.conn.cursor()
        query = """
            SELECT 
                me.id, me.cuenta_id, me.year, me.month, me.fecha,
                me.descripcion, me.referencia, me.valor, me.usd, me.trm,
                me.numero_linea, me.raw_text, me.created_at,
                c.cuenta
            FROM movimientos_extracto me

            JOIN cuentas c ON me.cuenta_id = c.cuentaid
            WHERE me.cuenta_id = %s AND me.year = %s AND me.month = %s
            ORDER BY me.fecha, me.numero_linea
        """
        cursor.execute(query, (cuenta_id, year, month))
        rows = cursor.fetchall()
        cursor.close()
        
        return [self._row_to_movimiento(row) for row in rows]
    
    def eliminar_por_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        cursor = self.conn.cursor()
        try:
            query = """
                DELETE FROM movimientos_extracto
                WHERE cuenta_id = %s AND year = %s AND month = %s
            """
            cursor.execute(query, (cuenta_id, year, month))
            count = cursor.rowcount
            self.conn.commit()
            return count
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def obtener_por_id(self, id: int) -> Optional[MovimientoExtracto]:
        cursor = self.conn.cursor()
        query = """
            SELECT 
                me.id, me.cuenta_id, me.year, me.month, me.fecha,
                me.descripcion, me.referencia, me.valor, me.usd, me.trm,
                me.numero_linea, me.raw_text, me.created_at,
                c.cuenta
            FROM movimientos_extracto me
            JOIN cuentas c ON me.cuenta_id = c.cuentaid
            WHERE me.id = %s
        """
        cursor.execute(query, (id,))
        row = cursor.fetchone()
        cursor.close()
        
        return self._row_to_movimiento(row)
    
    def contar_por_periodo(self, cuenta_id: int, year: int, month: int) -> int:
        cursor = self.conn.cursor()
        query = """
            SELECT COUNT(*) 
            FROM movimientos_extracto
            WHERE cuenta_id = %s AND year = %s AND month = %s
        """
        cursor.execute(query, (cuenta_id, year, month))
        count = cursor.fetchone()[0]
        cursor.close()
        return count

    def existe_movimiento(self, fecha, valor, referencia, descripcion=None, usd=None) -> bool:
        cursor = self.conn.cursor()
        
        # Lógica casi espejo de MovimientoRepository, pero contra movimientos_extracto
        # OJO: movimientos_extracto tiene (fecha, referencia, valor, usd)
        
        if referencia and referencia.strip():
             query = "SELECT 1 FROM movimientos_extracto WHERE referencia=%s AND fecha=%s"
             if usd is not None:
                query += " AND usd=%s"
                cursor.execute(query, (referencia, fecha, usd))
             else:
                query += " AND valor=%s"
                cursor.execute(query, (referencia, fecha, valor))
        else:
             # Validación por valor/usd y fecha (y descripción si hay)
             target_val = usd if usd is not None else valor
             col_val = "usd" if usd is not None else "valor"
             
             if descripcion:
                 query = f"SELECT 1 FROM movimientos_extracto WHERE {col_val}=%s AND fecha=%s AND LOWER(descripcion) = LOWER(%s)"
                 cursor.execute(query, (target_val, fecha, descripcion))
             else:
                 query = f"SELECT 1 FROM movimientos_extracto WHERE {col_val}=%s AND fecha=%s"
                 cursor.execute(query, (target_val, fecha))
                 
        exists = cursor.fetchone() is not None
        cursor.close()
        return exists