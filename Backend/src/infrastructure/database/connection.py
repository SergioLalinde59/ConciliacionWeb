import psycopg2
from psycopg2 import pool
import os
from typing import Generator
from dotenv import load_dotenv
from src.infrastructure.logging.config import logger

# Cargar variables de entorno desde archivo .env
load_dotenv()

# Configuración BD desde variables de entorno
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': os.getenv('DB_PORT', '5433'),
    'database': os.getenv('DB_NAME', 'Mvtos'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD')  # Sin default para password por seguridad
}

# Validar que la password esté configurada
if not DB_CONFIG['password']:
    raise ValueError(
        "DB_PASSWORD no está configurada. "
        "Por favor, define DB_PASSWORD en el archivo .env"
    )

# Pool de conexiones global
# Se inicializa como None y se creará al primer uso
_connection_pool = None


def get_connection_pool() -> pool.SimpleConnectionPool:
    """
    Obtiene o crea el pool de conexiones global.
    
    El pool se crea lazy (al primer uso) para evitar problemas con
    imports circulares y permitir que la configuración se cargue primero.
    
    Returns:
        SimpleConnectionPool: Pool de conexiones a PostgreSQL
    """
    global _connection_pool
    
    if _connection_pool is None:
        # Configurar tamaño del pool desde variables de entorno
        min_connections = int(os.getenv('DB_POOL_MIN_SIZE', '1'))
        max_connections = int(os.getenv('DB_POOL_MAX_SIZE', '10'))
        
        logger.info(
            f"Inicializando connection pool: "
            f"min={min_connections}, max={max_connections}"
        )
        
        try:
            _connection_pool = pool.SimpleConnectionPool(
                minconn=min_connections,
                maxconn=max_connections,
                **DB_CONFIG
            )
            logger.info("Connection pool inicializado correctamente")
        except psycopg2.Error as e:
            logger.error(f"Error al inicializar connection pool: {e}")
            raise
    
    return _connection_pool


def get_db_connection() -> Generator:
    """
    Dependency provider for database connection.
    
    Obtiene una conexión del pool, la yields para uso,
    y luego la devuelve al pool (en lugar de cerrarla).
    
    Yields:
        psycopg2.connection: Conexión a PostgreSQL del pool
    """
    connection_pool = get_connection_pool()
    conn = connection_pool.getconn()
    
    try:
        yield conn
        # Si todo salió bien, hacer commit automático
        conn.commit()
    except Exception as e:
        # En caso de error, hacer rollback
        conn.rollback()
        logger.error(f"Error en transacción, rollback ejecutado: {e}")
        raise
    finally:
        # Devolver la conexión al pool (no cerrarla)
        connection_pool.putconn(conn)


def close_all_connections():
    """
    Cierra todas las conexiones del pool.
    
    Debe llamarse al shutdown de la aplicación.
    """
    global _connection_pool
    
    if _connection_pool is not None:
        logger.info("Cerrando todas las conexiones del pool...")
        _connection_pool.closeall()
        _connection_pool = None
        logger.info("Todas las conexiones cerradas")
