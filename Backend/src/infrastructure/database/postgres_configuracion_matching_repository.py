from typing import Optional
from datetime import datetime
from decimal import Decimal
import psycopg2
from src.domain.models.configuracion_matching import ConfiguracionMatching
from src.domain.ports.configuracion_matching_repository import ConfiguracionMatchingRepository


class PostgresConfiguracionMatchingRepository(ConfiguracionMatchingRepository):
    """
    Adaptador de Base de Datos para Configuración de Matching en PostgreSQL.
    
    Arquitectura Hexagonal: Implementa el puerto ConfiguracionMatchingRepository
    definido en la capa de dominio.
    """
    
    def __init__(self, connection):
        self.conn = connection
    
    def _row_to_configuracion(self, row) -> ConfiguracionMatching:
        """
        Helper para convertir fila de BD a objeto ConfiguracionMatching.
        
        Orden esperado de columnas:
        id, tolerancia_valor, similitud_descripcion_minima,
        peso_fecha, peso_valor, peso_descripcion,
        score_minimo_exacto, score_minimo_probable,
        activo, created_at, updated_at
        """
        return ConfiguracionMatching(
            id=row[0],
            tolerancia_valor=Decimal(str(row[1])) if row[1] is not None else Decimal('100.00'),
            similitud_descripcion_minima=Decimal(str(row[2])) if row[2] is not None else Decimal('0.75'),
            peso_fecha=Decimal(str(row[3])) if row[3] is not None else Decimal('0.40'),
            peso_valor=Decimal(str(row[4])) if row[4] is not None else Decimal('0.40'),
            peso_descripcion=Decimal(str(row[5])) if row[5] is not None else Decimal('0.20'),
            score_minimo_exacto=Decimal(str(row[6])) if row[6] is not None else Decimal('0.95'),
            score_minimo_probable=Decimal(str(row[7])) if row[7] is not None else Decimal('0.70'),
            activo=row[8] if row[8] is not None else True,
            created_at=row[9] if row[9] is not None else None,
            updated_at=row[10] if row[10] is not None else None
        )
    
    def obtener_activa(self) -> ConfiguracionMatching:
        """
        Obtiene la configuración activa del sistema.
        
        Returns:
            ConfiguracionMatching activa
        
        Raises:
            ValueError: Si no existe configuración activa
        """
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT id, tolerancia_valor, similitud_descripcion_minima,
                       peso_fecha, peso_valor, peso_descripcion,
                       score_minimo_exacto, score_minimo_probable,
                       activo, created_at, updated_at
                FROM configuracion_matching
                WHERE activo = TRUE
                LIMIT 1
            """
            cursor.execute(query)
            row = cursor.fetchone()
            
            if not row:
                raise ValueError(
                    "No existe configuración activa. "
                    "Debe existir al menos una configuración marcada como activa."
                )
            
            return self._row_to_configuracion(row)
            
        finally:
            cursor.close()
    
    def obtener_por_id(self, config_id: int) -> Optional[ConfiguracionMatching]:
        """
        Obtiene una configuración específica por ID.
        
        Args:
            config_id: ID de la configuración
        
        Returns:
            ConfiguracionMatching si existe, None si no
        """
        cursor = self.conn.cursor()
        try:
            query = """
                SELECT id, tolerancia_valor, similitud_descripcion_minima,
                       peso_fecha, peso_valor, peso_descripcion,
                       score_minimo_exacto, score_minimo_probable,
                       activo, created_at, updated_at
                FROM configuracion_matching
                WHERE id = %s
            """
            cursor.execute(query, (config_id,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return self._row_to_configuracion(row)
            
        finally:
            cursor.close()
    
    def crear(self, config: ConfiguracionMatching) -> ConfiguracionMatching:
        """
        Crea una nueva configuración.
        
        Args:
            config: ConfiguracionMatching a crear
        
        Returns:
            ConfiguracionMatching creada con ID asignado
        
        Raises:
            ValueError: Si la configuración es inválida
        """
        cursor = self.conn.cursor()
        try:
            # El modelo de dominio ya valida los datos en __post_init__
            # Aquí solo insertamos
            
            query = """
                INSERT INTO configuracion_matching (
                    tolerancia_valor,
                    similitud_descripcion_minima,
                    peso_fecha,
                    peso_valor,
                    peso_descripcion,
                    score_minimo_exacto,
                    score_minimo_probable,
                    activo
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, created_at, updated_at
            """
            
            cursor.execute(query, (
                float(config.tolerancia_valor),
                float(config.similitud_descripcion_minima),
                float(config.peso_fecha),
                float(config.peso_valor),
                float(config.peso_descripcion),
                float(config.score_minimo_exacto),
                float(config.score_minimo_probable),
                config.activo
            ))
            
            result = cursor.fetchone()
            config.id = result[0]
            config.created_at = result[1]
            config.updated_at = result[2]
            
            self.conn.commit()
            return config
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def actualizar(self, config: ConfiguracionMatching) -> ConfiguracionMatching:
        """
        Actualiza la configuración existente.
        
        Args:
            config: ConfiguracionMatching con datos actualizados
        
        Returns:
            ConfiguracionMatching actualizada
        
        Raises:
            ValueError: Si no existe la configuración o es inválida
        """
        cursor = self.conn.cursor()
        try:
            if not config.id:
                raise ValueError("La configuración debe tener un ID para actualizarse")
            
            # Verificar que existe
            cursor.execute(
                "SELECT id FROM configuracion_matching WHERE id = %s",
                (config.id,)
            )
            if not cursor.fetchone():
                raise ValueError(f"No existe configuración con id={config.id}")
            
            # Actualizar
            query = """
                UPDATE configuracion_matching 
                SET tolerancia_valor = %s,
                    similitud_descripcion_minima = %s,
                    peso_fecha = %s,
                    peso_valor = %s,
                    peso_descripcion = %s,
                    score_minimo_exacto = %s,
                    score_minimo_probable = %s,
                    activo = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING updated_at
            """
            
            cursor.execute(query, (
                float(config.tolerancia_valor),
                float(config.similitud_descripcion_minima),
                float(config.peso_fecha),
                float(config.peso_valor),
                float(config.peso_descripcion),
                float(config.score_minimo_exacto),
                float(config.score_minimo_probable),
                config.activo,
                config.id
            ))
            
            result = cursor.fetchone()
            config.updated_at = result[0]
            
            self.conn.commit()
            return config
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
    
    def activar(self, config_id: int) -> ConfiguracionMatching:
        """
        Activa una configuración específica y desactiva las demás.
        
        Args:
            config_id: ID de la configuración a activar
        
        Returns:
            ConfiguracionMatching activada
        
        Raises:
            ValueError: Si no existe la configuración
        """
        cursor = self.conn.cursor()
        try:
            # Verificar que existe la configuración
            cursor.execute(
                "SELECT id FROM configuracion_matching WHERE id = %s",
                (config_id,)
            )
            if not cursor.fetchone():
                raise ValueError(f"No existe configuración con id={config_id}")
            
            # Desactivar todas las configuraciones
            cursor.execute("UPDATE configuracion_matching SET activo = FALSE")
            
            # Activar la seleccionada
            cursor.execute(
                """
                UPDATE configuracion_matching 
                SET activo = TRUE, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (config_id,)
            )
            
            self.conn.commit()
            
            # Obtener y retornar la configuración activada
            return self.obtener_por_id(config_id)
            
        except Exception as e:
            self.conn.rollback()
            raise e
        finally:
            cursor.close()
