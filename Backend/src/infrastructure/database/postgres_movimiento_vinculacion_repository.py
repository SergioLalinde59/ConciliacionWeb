from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import psycopg2
from src.domain.models.movimiento_match import MovimientoMatch, MatchEstado
from src.domain.models.movimiento_extracto import MovimientoExtracto
from src.domain.models.movimiento import Movimiento
from src.domain.ports.movimiento_vinculacion_repository import MovimientoVinculacionRepository
from src.infrastructure.database.postgres_movimiento_extracto_repository import PostgresMovimientoExtractoRepository
from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository


class PostgresMovimientoVinculacionRepository(MovimientoVinculacionRepository):
    """
    Adaptador de Base de Datos para Vinculaciones de Movimientos en PostgreSQL.
    
    Arquitectura Hexagonal: Implementa el puerto MovimientoVinculacionRepository
    definido en la capa de dominio.
    """
    
    def __init__(self, connection):
        self.conn = connection
    
    def _row_to_movimiento_match(
        self, 
        row, 
        mov_extracto: MovimientoExtracto,
        mov_sistema: Optional[Movimiento]
    ) -> MovimientoMatch:
        """
        Helper para convertir fila de BD a objeto MovimientoMatch.
        
        Orden esperado de columnas:
        id, movimiento_sistema_id, movimiento_extracto_id, estado, score_similitud,
        score_fecha, score_valor, score_descripcion,
        confirmado_por_usuario, fecha_confirmacion, created_by, notas, fecha_creacion
        """
        return MovimientoMatch(
            id=row[0],
            mov_extracto=mov_extracto,
            mov_sistema=mov_sistema,
            estado=MatchEstado(row[3]),
            score_total=Decimal(str(row[4])) if row[4] is not None else Decimal('0.00'),
            score_fecha=Decimal(str(row[5])) if row[5] is not None else Decimal('0.00'),
            score_valor=Decimal(str(row[6])) if row[6] is not None else Decimal('0.00'),
            score_descripcion=Decimal(str(row[7])) if row[7] is not None else Decimal('0.00'),
            confirmado_por_usuario=row[8] if row[8] is not None else False,
            fecha_confirmacion=row[9] if row[9] is not None else None,
            created_by=row[10] if row[10] else None,
            notas=row[11] if row[11] else None,
            created_at=row[12] if row[12] is not None else None
        )

    def _obtener_movimiento_extracto(self, id: int) -> Optional[MovimientoExtracto]:
        repo = PostgresMovimientoExtractoRepository(self.conn)
        return repo.obtener_por_id(id)

    def _obtener_movimiento_sistema(self, id: int) -> Optional[Movimiento]:
        repo = PostgresMovimientoRepository(self.conn)
        return repo.obtener_por_id(id)

    def guardar(self, vinculacion: MovimientoMatch) -> MovimientoMatch:
        """
        Guarda o actualiza una vinculación entre extracto y sistema.
        """
        cursor = self.conn.cursor()
        try:
            # Validar que existe el movimiento del extracto
            if not vinculacion.mov_extracto or not vinculacion.mov_extracto.id:
                raise ValueError("La vinculación debe tener un movimiento del extracto válido")
            
            # Obtener IDs
            movimiento_extracto_id = vinculacion.mov_extracto.id
            movimiento_id = vinculacion.mov_sistema.id if vinculacion.mov_sistema else None
            
            if vinculacion.id:
                # Update
                query = """
                    UPDATE movimiento_vinculaciones 
                    SET movimiento_sistema_id = %s,
                        estado = %s,
                        score_similitud = %s,
                        score_fecha = %s,
                        score_valor = %s,
                        score_descripcion = %s,
                        confirmado_por_usuario = %s,
                        fecha_confirmacion = %s,
                        created_by = %s,
                        notas = %s
                    WHERE id = %s
                """
                cursor.execute(query, (
                    movimiento_id,
                    vinculacion.estado.value,
                    float(vinculacion.score_total),
                    float(vinculacion.score_fecha),
                    float(vinculacion.score_valor),
                    float(vinculacion.score_descripcion),
                    vinculacion.confirmado_por_usuario,
                    vinculacion.fecha_confirmacion,
                    vinculacion.created_by,
                    vinculacion.notas,
                    vinculacion.id
                ))
            else:
                # Insert
                query = """
                    INSERT INTO movimiento_vinculaciones (
                        movimiento_sistema_id, movimiento_extracto_id, estado,
                        score_similitud, score_fecha, score_valor, score_descripcion,
                        confirmado_por_usuario, fecha_confirmacion, created_by, notas
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """
                cursor.execute(query, (
                    movimiento_id,
                    movimiento_extracto_id,
                    vinculacion.estado.value,
                    float(vinculacion.score_total),
                    float(vinculacion.score_fecha),
                    float(vinculacion.score_valor),
                    float(vinculacion.score_descripcion),
                    vinculacion.confirmado_por_usuario,
                    vinculacion.fecha_confirmacion,
                    vinculacion.created_by,
                    vinculacion.notas
                ))
                result = cursor.fetchone()
                vinculacion.id = result[0]
                vinculacion.created_at = result[1]
            
            self.conn.commit()
            return vinculacion
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def obtener_por_periodo(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int
    ) -> List[MovimientoMatch]:
        """
        Obtiene todas las vinculaciones de un periodo específico.
        """
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT v.id, v.movimiento_sistema_id, v.movimiento_extracto_id, v.estado,
                       v.score_similitud, v.score_fecha, v.score_valor, v.score_descripcion,
                       v.confirmado_por_usuario, v.fecha_confirmacion, v.created_by, 
                       v.notas, v.created_at
                FROM movimiento_vinculaciones v
                INNER JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
                WHERE me.cuenta_id = %s AND me.year = %s AND me.month = %s
                ORDER BY me.fecha DESC, ABS(me.valor) DESC
            """
            cursor.execute(query, (cuenta_id, year, month))
            rows = cursor.fetchall()
            
            vinculaciones = []
            for row in rows:
                # Obtener movimientos relacionados
                mov_extracto = self._obtener_movimiento_extracto(row[2])
                mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
                
                if mov_extracto:
                    vinculacion = self._row_to_movimiento_match(row, mov_extracto, mov_sistema)
                    vinculaciones.append(vinculacion)
            
            return vinculaciones
            
        finally:
            cursor.close()
    
    def obtener_por_extracto_id(
        self, 
        movimiento_extracto_id: int
    ) -> Optional[MovimientoMatch]:
        """
        Busca una vinculación por ID del movimiento del extracto.
        """
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT id, movimiento_sistema_id, movimiento_extracto_id, estado,
                       score_similitud, score_fecha, score_valor, score_descripcion,
                       confirmado_por_usuario, fecha_confirmacion, created_by, 
                       notas, created_at
                FROM movimiento_vinculaciones
                WHERE movimiento_extracto_id = %s
            """
            cursor.execute(query, (movimiento_extracto_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            # Obtener movimientos relacionados
            mov_extracto = self._obtener_movimiento_extracto(row[2])
            mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
            
            if not mov_extracto:
                return None
            
            return self._row_to_movimiento_match(row, mov_extracto, mov_sistema)
            
        finally:
            cursor.close()
    
    def desvincular(self, movimiento_extracto_id: int) -> None:
        """
        Elimina la vinculación lógica pero mantiene el registro como SIN_MATCH.
        Esto evita que el algoritmo de matching lo vuelva a vincular automáticamente.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "SELECT id FROM movimiento_vinculaciones WHERE movimiento_extracto_id = %s",
                (movimiento_extracto_id,)
            )
            if not cursor.fetchone():
                raise ValueError(f"No existe vinculación para movimiento_extracto_id={movimiento_extracto_id}")
            
            # Actualizamos a SIN_MATCH, limpiamos ID sistema y scores, y marcamos confirmado
            query = """
                UPDATE movimiento_vinculaciones 
                SET movimiento_sistema_id = NULL,
                    estado = 'SIN_MATCH',
                    score_similitud = 0,
                    score_fecha = 0,
                    score_valor = 0,
                    score_descripcion = 0,
                    confirmado_por_usuario = TRUE,
                    fecha_confirmacion = NOW(),
                    notas = 'Desvinculado manualmente'
                WHERE movimiento_extracto_id = %s
            """
            cursor.execute(query, (movimiento_extracto_id,))
            self.conn.commit()
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def actualizar_estado(
        self, 
        vinculacion_id: int, 
        nuevo_estado: MatchEstado,
        usuario: str,
        notas: Optional[str] = None
    ) -> MovimientoMatch:
        """Actualiza el estado de una vinculación existente."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "SELECT movimiento_extracto_id, movimiento_sistema_id FROM movimiento_vinculaciones WHERE id = %s",
                (vinculacion_id,)
            )
            row = cursor.fetchone()
            if not row:
                raise ValueError(f"No existe vinculación con id={vinculacion_id}")
            
            query = """
                UPDATE movimiento_vinculaciones 
                SET estado = %s,
                    confirmado_por_usuario = TRUE,
                    fecha_confirmacion = NOW(),
                    created_by = %s,
                    notas = %s
                WHERE id = %s
            """
            cursor.execute(query, (nuevo_estado.value, usuario, notas, vinculacion_id))
            self.conn.commit()
            
            mov_extracto = self._obtener_movimiento_extracto(row[0])
            mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
            
            cursor.execute("""
                SELECT id, movimiento_sistema_id, movimiento_extracto_id, estado,
                       score_similitud, score_fecha, score_valor, score_descripcion,
                       confirmado_por_usuario, fecha_confirmacion, created_by, 
                       notas, created_at
                FROM movimiento_vinculaciones
                WHERE id = %s
            """, (vinculacion_id,))
            updated_row = cursor.fetchone()
            
            return self._row_to_movimiento_match(updated_row, mov_extracto, mov_sistema)
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def obtener_sin_confirmar(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int
    ) -> List[MovimientoMatch]:
        """Obtiene vinculaciones que requieren confirmación del usuario."""
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT v.id, v.movimiento_sistema_id, v.movimiento_extracto_id, v.estado,
                       v.score_similitud, v.score_fecha, v.score_valor, v.score_descripcion,
                       v.confirmado_por_usuario, v.fecha_confirmacion, v.created_by, 
                       v.notas, v.created_at
                FROM movimiento_vinculaciones v
                INNER JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
                WHERE me.cuenta_id = %s 
                  AND me.year = %s 
                  AND me.month = %s
                  AND v.confirmado_por_usuario = FALSE
                ORDER BY me.fecha DESC, ABS(me.valor) DESC
            """
            cursor.execute(query, (cuenta_id, year, month))
            rows = cursor.fetchall()
            
            vinculaciones = []
            for row in rows:
                mov_extracto = self._obtener_movimiento_extracto(row[2])
                mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
                
                if mov_extracto:
                    vinculacion = self._row_to_movimiento_match(row, mov_extracto, mov_sistema)
                    vinculaciones.append(vinculacion)
            
            return vinculaciones
            
        finally:
            cursor.close()
    
    def obtener_por_estado(
        self, 
        cuenta_id: int, 
        year: int, 
        month: int,
        estado: MatchEstado
    ) -> List[MovimientoMatch]:
        """Obtiene vinculaciones filtradas por estado."""
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT v.id, v.movimiento_sistema_id, v.movimiento_extracto_id, v.estado,
                       v.score_similitud, v.score_fecha, v.score_valor, v.score_descripcion,
                       v.confirmado_por_usuario, v.fecha_confirmacion, v.created_by, 
                       v.notas, v.created_at
                FROM movimiento_vinculaciones v
                INNER JOIN movimientos_extracto me ON v.movimiento_extracto_id = me.id
                WHERE me.cuenta_id = %s 
                  AND me.year = %s 
                  AND me.month = %s
                  AND v.estado = %s
                ORDER BY me.fecha DESC, ABS(me.valor) DESC
            """
            cursor.execute(query, (cuenta_id, year, month, estado.value))
            rows = cursor.fetchall()
            
            vinculaciones = []
            for row in rows:
                mov_extracto = self._obtener_movimiento_extracto(row[2])
                mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
                
                if mov_extracto:
                    vinculacion = self._row_to_movimiento_match(row, mov_extracto, mov_sistema)
                    vinculaciones.append(vinculacion)
            
            return vinculaciones
            
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        """
        Elimina físicamente un registro de vinculación.
        """
        cursor = self.conn.cursor()
        try:
            query = "DELETE FROM movimiento_vinculaciones WHERE id = %s"
            cursor.execute(query, (id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def desvincular_por_sistema_id(self, sistema_id: int) -> None:
        """
        Desvincula cualquier match asociado a un movimiento del sistema.
        """
        cursor = self.conn.cursor()
        try:
            query = """
                UPDATE movimiento_vinculaciones 
                SET movimiento_sistema_id = NULL,
                    estado = 'SIN_MATCH',
                    score_similitud = 0,
                    score_fecha = 0,
                    score_valor = 0,
                    score_descripcion = 0,
                    confirmado_por_usuario = TRUE,
                    fecha_confirmacion = NOW(),
                    notas = 'Desvinculado por eliminación de movimiento sistema'
                WHERE movimiento_sistema_id = %s
            """
            cursor.execute(query, (sistema_id,))
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_sistema_id(self, sistema_id: int) -> Optional[MovimientoMatch]:
        """Busca una vinculación por ID del movimiento del sistema."""
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT id, movimiento_sistema_id, movimiento_extracto_id, estado,
                       score_similitud, score_fecha, score_valor, score_descripcion,
                       confirmado_por_usuario, fecha_confirmacion, created_by, 
                       notas, created_at
                FROM movimiento_vinculaciones
                WHERE movimiento_sistema_id = %s
            """
            cursor.execute(query, (sistema_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            # Obtener movimientos relacionados
            mov_extracto = self._obtener_movimiento_extracto(row[2])
            mov_sistema = self._obtener_movimiento_sistema(row[1]) if row[1] else None
            
            if not mov_extracto:
                return None
            
            return self._row_to_movimiento_match(row, mov_extracto, mov_sistema)
            
        finally:
            cursor.close()
