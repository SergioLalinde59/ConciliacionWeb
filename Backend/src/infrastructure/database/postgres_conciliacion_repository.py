from typing import Optional
from decimal import Decimal
import json
from src.domain.models.conciliacion import Conciliacion
from src.domain.ports.conciliacion_repository import ConciliacionRepository

class PostgresConciliacionRepository(ConciliacionRepository):
    def __init__(self, connection):
        self.conn = connection

    def _row_to_conciliacion(self, row) -> Conciliacion:
        """Helper para convertir fila de BD a objeto Conciliacion"""
        if not row:
            return None
            
        return Conciliacion(
            id=row[0],
            cuenta_id=row[1],
            year=row[2],
            month=row[3],
            fecha_corte=row[4],
            extracto_saldo_anterior=row[5],
            extracto_entradas=row[6],
            extracto_salidas=row[7],
            extracto_saldo_final=row[8],
            sistema_entradas=row[9],
            sistema_salidas=row[10],
            sistema_saldo_final=row[11],
            diferencia_saldo=row[12],
            datos_extra=row[13] if row[13] else {},
            estado=row[14],
            updated_at=row[15],
            cuenta_nombre=row[16] if len(row) > 16 else None
        )

    def obtener_por_periodo(self, cuenta_id: int, year: int, month: int) -> Optional[Conciliacion]:
        cursor = self.conn.cursor()
        query = """
            SELECT 
                c.id, c.cuenta_id, c.year, c.month, c.fecha_corte,
                c.extracto_saldo_anterior, c.extracto_entradas, c.extracto_salidas, c.extracto_saldo_final,
                c.sistema_entradas, c.sistema_salidas, c.sistema_saldo_final,
                c.diferencia_saldo, c.datos_extra, c.estado, c.updated_at,
                cta.cuenta as cuenta_nombre
            FROM conciliaciones c
            JOIN cuentas cta ON c.cuenta_id = cta.cuentaid
            WHERE c.cuenta_id = %s AND c.year = %s AND c.month = %s
        """
        cursor.execute(query, (cuenta_id, year, month))
        row = cursor.fetchone()
        cursor.close()
        return self._row_to_conciliacion(row)

    def guardar(self, conciliacion: Conciliacion) -> Conciliacion:
        cursor = self.conn.cursor()
        try:
            # Serializar datos_extra
            datos_extra_json = json.dumps(conciliacion.datos_extra)
            
            # Upsert logic (Insert or Update on conflict)
            query = """
                INSERT INTO conciliaciones (
                    cuenta_id, year, month, fecha_corte,
                    extracto_saldo_anterior, extracto_entradas, extracto_salidas, extracto_saldo_final,
                    datos_extra, estado
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (cuenta_id, year, month) DO UPDATE SET
                    fecha_corte = EXCLUDED.fecha_corte,
                    extracto_saldo_anterior = EXCLUDED.extracto_saldo_anterior,
                    extracto_entradas = EXCLUDED.extracto_entradas,
                    extracto_salidas = EXCLUDED.extracto_salidas,
                    extracto_saldo_final = EXCLUDED.extracto_saldo_final,
                    datos_extra = EXCLUDED.datos_extra,
                    estado = EXCLUDED.estado,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, updated_at
            """
            cursor.execute(query, (
                conciliacion.cuenta_id, conciliacion.year, conciliacion.month, conciliacion.fecha_corte,
                conciliacion.extracto_saldo_anterior, conciliacion.extracto_entradas, 
                conciliacion.extracto_salidas, conciliacion.extracto_saldo_final,
                datos_extra_json, conciliacion.estado
            ))
            
            result = cursor.fetchone()
            conciliacion.id = result[0]
            conciliacion.updated_at = result[1]
            
            self.conn.commit()
            
            # Post-guardado: Recalcular diferencias (el campo generado lo hace, pero necesitamos actualizar el objeto)
            # Podríamos hacer un reload, pero por ahora confiamos
            return conciliacion
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def recalcular_sistema(self, cuenta_id: int, year: int, month: int) -> Conciliacion:
        cursor = self.conn.cursor()
        try:
            # 1. Calcular sumas desde movimientos
            query_sumas = """
                SELECT 
                    COALESCE(SUM(CASE WHEN Valor > 0 THEN Valor ELSE 0 END), 0) as entradas,
                    COALESCE(SUM(CASE WHEN Valor < 0 THEN ABS(Valor) ELSE 0 END), 0) as salidas
                FROM movimientos
                WHERE CuentaID = %s 
                  AND EXTRACT(YEAR FROM Fecha) = %s 
                  AND EXTRACT(MONTH FROM Fecha) = %s
            """
            cursor.execute(query_sumas, (cuenta_id, year, month))
            entradas_sys, salidas_sys = cursor.fetchone()
            
            # 2. Actualizar la tabla conciliaciones
            # El sistema_saldo_final se calcula usando el saldo ANTERIOR del extracto como base
            update_query = """
                UPDATE conciliaciones
                SET 
                    sistema_entradas = %s,
                    sistema_salidas = %s,
                    sistema_saldo_final = (extracto_saldo_anterior + %s - %s),
                    updated_at = CURRENT_TIMESTAMP
                WHERE cuenta_id = %s AND year = %s AND month = %s
                RETURNING id
            """
            cursor.execute(update_query, (
                entradas_sys, salidas_sys, 
                entradas_sys, salidas_sys,
                cuenta_id, year, month
            ))
            
            if cursor.rowcount == 0:
                # No existe conciliación para actualizar -> No se puede recalcular sobre nada
                # Se podría optar por crearla, pero requiere datos del extracto (saldo anterior)
                # Así que mejor retornamos None o error
                raise ValueError("No se puede recalcular: No existe conciliación creada para este periodo.")
            
            self.conn.commit()
            
            # 3. Devolver el objeto actualizado
            return self.obtener_por_periodo(cuenta_id, year, month)
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
