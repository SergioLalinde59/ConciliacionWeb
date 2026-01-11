import logging
import sys
import os
from logging.handlers import RotatingFileHandler
from typing import Optional


def setup_logger(
    name: str = "app_logger",
    level: Optional[str] = None
) -> logging.Logger:
    """
    Configura un logger centralizado para la aplicación con
    soporte para diferentes entornos.
    
    Args:
        name: Nombre del logger
        level: Nivel de logging (DEBUG, INFO, WARNING, ERROR, CRITICAL)
               Si no se especifica, se lee de la variable de entorno LOG_LEVEL
               o se usa INFO por defecto.
    """
    logger = logging.getLogger(name)
    
    # Evitar duplicidad de manejadores si ya está configurado
    if logger.handlers:
        return logger
    
    # Determinar nivel de logging
    if level is None:
        level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    log_level = getattr(logging, level, logging.INFO)
    logger.setLevel(log_level)
    
    # Formato enriquecido de los logs
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)-8s [%(name)s:%(funcName)s:%(lineno)d] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Manejador para consola (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(log_level)
    logger.addHandler(console_handler)
    
    # Manejador para archivo (con rotación)
    # Determinar directorio de logs según entorno
    environment = os.getenv('ENVIRONMENT', 'development')
    log_dir = os.getenv('LOG_DIR', 'logs')
    
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Archivo de log principal
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, f"backend_{environment}.log"),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    logger.addHandler(file_handler)
    
    # Archivo separado para errores
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, f"errors_{environment}.log"),
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)
    logger.addHandler(error_handler)
    
    logger.info(f"Logger initialized for environment: {environment}, level: {level}")
    
    return logger


# Instancia global para importar fácilmente
logger = setup_logger()
