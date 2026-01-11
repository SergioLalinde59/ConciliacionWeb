from typing import List, Optional
import psycopg2
from src.domain.models.config_filtro_grupo import ConfigFiltroGrupo
from src.domain.ports.config_filtro_grupo_repository import ConfigFiltroGrupoRepository

class PostgresConfigFiltroGrupoRepository(ConfigFiltroGrupoRepository):
    """PostgreSQL implementation of ConfigFiltroGrupoRepository."""
    
    def __init__(self, connection):
        self.conn = connection

    def guardar(self, config: ConfigFiltroGrupo) -> ConfigFiltroGrupo:
        """Save (create or update) a filter configuration."""
        cursor = self.conn.cursor()
        try:
            if config.id:
                # Update existing record
                cursor.execute(
                    """UPDATE config_filtros_grupos 
                       SET grupo_id = %s, etiqueta = %s, activo_por_defecto = %s 
                       WHERE id = %s""",
                    (config.grupo_id, config.etiqueta, config.activo_por_defecto, config.id)
                )
            else:
                # Insert new record
                cursor.execute(
                    """INSERT INTO config_filtros_grupos 
                       (grupo_id, etiqueta, activo_por_defecto) 
                       VALUES (%s, %s, %s) 
                       RETURNING id""",
                    (config.grupo_id, config.etiqueta, config.activo_por_defecto)
                )
                config.id = cursor.fetchone()[0]
            
            self.conn.commit()
            return config
        except psycopg2.IntegrityError as e:
            self.conn.rollback()
            if 'unique constraint' in str(e).lower():
                raise ValueError(f"Ya existe una configuración para el grupo_id {config.grupo_id}")
            raise e
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()

    def obtener_por_id(self, id: int) -> Optional[ConfigFiltroGrupo]:
        """Get a filter configuration by ID."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """SELECT id, grupo_id, etiqueta, activo_por_defecto 
                   FROM config_filtros_grupos 
                   WHERE id = %s""",
                (id,)
            )
            row = cursor.fetchone()
            
            if row:
                return ConfigFiltroGrupo(
                    id=row[0],
                    grupo_id=row[1],
                    etiqueta=row[2],
                    activo_por_defecto=row[3]
                )
            return None
        finally:
            cursor.close()

    def obtener_todos(self) -> List[ConfigFiltroGrupo]:
        """Get all filter configurations."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """SELECT id, grupo_id, etiqueta, activo_por_defecto 
                   FROM config_filtros_grupos 
                   ORDER BY etiqueta"""
            )
            rows = cursor.fetchall()
            
            return [
                ConfigFiltroGrupo(
                    id=row[0],
                    grupo_id=row[1],
                    etiqueta=row[2],
                    activo_por_defecto=row[3]
                )
                for row in rows
            ]
        finally:
            cursor.close()

    def eliminar(self, id: int) -> None:
        """Delete a filter configuration."""
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                "DELETE FROM config_filtros_grupos WHERE id = %s",
                (id,)
            )
            self.conn.commit()
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
