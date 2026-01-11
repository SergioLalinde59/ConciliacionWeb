from typing import List, Optional
import psycopg2
from src.domain.models.config_valor_pendiente import ConfigValorPendiente
from src.domain.ports.config_valor_pendiente_repository import ConfigValorPendienteRepository

class PostgresConfigValorPendienteRepository(ConfigValorPendienteRepository):
    """PostgreSQL implementation of ConfigValorPendienteRepository."""
    
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, config: ConfigValorPendiente) -> ConfigValorPendiente:
        """Save (create or update) a pending value configuration."""
        cursor = self.conn.cursor()
        try:
            if config.id:
                # Update existing record
                cursor.execute(
                    """UPDATE config_valores_pendientes 
                       SET tipo = %s, valor_id = %s, descripcion = %s, activo = %s 
                       WHERE id = %s""",
                    (config.tipo, config.valor_id, config.descripcion, config.activo, config.id)
                )
            else:
                # Insert new record
                cursor.execute(
                    """INSERT INTO config_valores_pendientes 
                       (tipo, valor_id, descripcion, activo) 
                       VALUES (%s, %s, %s, %s) 
                       RETURNING id""",
                    (config.tipo, config.valor_id, config.descripcion, config.activo)
                )
                config.id = cursor.fetchone()[0]
            
            self.conn.commit()
            return config
        except psycopg2.IntegrityError as e:
            self.conn.rollback()
            if 'unique constraint' in str(e).lower():
                raise ValueError(f"Ya existe una configuración para tipo={config.tipo}, valor_id={config.valor_id}")
            raise e
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, id: int) -> Optional[ConfigValorPendiente]:
        """Get a configuration by ID."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """SELECT id, tipo, valor_id, descripcion, activo 
                   FROM config_valores_pendientes 
                   WHERE id = %s""",
                (id,)
            )
            row = cursor.fetchone()
            
            if row:
                return ConfigValorPendiente(
                    id=row[0],
                    tipo=row[1],
                    valor_id=row[2],
                    descripcion=row[3] or "",
                    activo=row[4]
                )
            return None
        finally:
            cursor.close()

    def obtener_todos(self) -> List[ConfigValorPendiente]:
        """Get all configurations."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """SELECT id, tipo, valor_id, descripcion, activo 
                   FROM config_valores_pendientes 
                   ORDER BY tipo, valor_id"""
            )
            rows = cursor.fetchall()
            
            return [
                ConfigValorPendiente(
                    id=row[0],
                    tipo=row[1],
                    valor_id=row[2],
                    descripcion=row[3] or "",
                    activo=row[4]
                )
                for row in rows
            ]
        finally:
            cursor.close()

    def obtener_ids_por_tipo(self, tipo: str) -> List[int]:
        """Get all pending value IDs for a specific type."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """SELECT valor_id 
                   FROM config_valores_pendientes 
                   WHERE tipo = %s AND activo = TRUE""",
                (tipo,)
            )
            rows = cursor.fetchall()
            return [row[0] for row in rows]
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        """Delete a configuration."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM config_valores_pendientes WHERE id = %s",
                (id,)
            )
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
