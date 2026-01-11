"""
Exception handlers globales para la API FastAPI.

Estos handlers capturan excepciones del dominio y las convierten
en respuestas HTTP apropiadas.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from src.domain.exceptions import (
    DomainException,
    EntityNotFoundException,
    ValidationException,
    DatabaseException,
    DatabaseConnectionException,
    FileProcessingException,
    BusinessRuleException
)
from src.infrastructure.logging.config import logger


def register_exception_handlers(app):
    """
    Registra todos los exception handlers en la aplicación FastAPI.
    
    Args:
        app: Instancia de FastAPI
    """
    
    # Excepciones del dominio
    app.add_exception_handler(EntityNotFoundException, entity_not_found_handler)
    app.add_exception_handler(ValidationException, validation_exception_handler)
    app.add_exception_handler(DatabaseException, database_exception_handler)
    app.add_exception_handler(FileProcessingException, file_processing_exception_handler)
    app.add_exception_handler(BusinessRuleException, business_rule_exception_handler)
    app.add_exception_handler(DomainException, domain_exception_handler)
    
    # Excepciones de FastAPI/Starlette
    app.add_exception_handler(RequestValidationError, request_validation_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    
    # Excepciones generales (fallback)
    app.add_exception_handler(Exception, general_exception_handler)


# ============================================
# Handlers de Excepciones del Dominio
# ============================================

async def entity_not_found_handler(request: Request, exc: EntityNotFoundException):
    """Handler para entidades no encontradas (404)."""
    logger.warning(
        f"Entity not found: {exc.message}",
        extra={"details": exc.details, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Entity Not Found",
            "message": exc.message,
            "details": exc.details
        }
    )


async def validation_exception_handler(request: Request, exc: ValidationException):
    """Handler para errores de validación (400)."""
    logger.warning(
        f"Validation error: {exc.message}",
        extra={"details": exc.details, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "Validation Error",
            "message": exc.message,
            "details": exc.details
        }
    )


async def database_exception_handler(request: Request, exc: DatabaseException):
    """Handler para errores de base de datos (500 o 503)."""
    # Usar 503 para errores de conexión, 500 para otros errores de DB
    status_code = (
        status.HTTP_503_SERVICE_UNAVAILABLE 
        if isinstance(exc, DatabaseConnectionException)
        else status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    
    logger.error(
        f"Database error: {exc.message}",
        extra={"details": exc.details, "path": request.url.path},
        exc_info=True
    )
    
    # No exponer detalles de DB en producción
    return JSONResponse(
        status_code=status_code,
        content={
            "error": "Database Error",
            "message": "Error al procesar la solicitud en la base de datos",
            # Solo incluir detalles en desarrollo
            # "details": exc.details  # Comentar en producción
        }
    )


async def file_processing_exception_handler(request: Request, exc: FileProcessingException):
    """Handler para errores de procesamiento de archivos (400)."""
    logger.warning(
        f"File processing error: {exc.message}",
        extra={"details": exc.details, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": "File Processing Error",
            "message": exc.message,
            "details": exc.details
        }
    )


async def business_rule_exception_handler(request: Request, exc: BusinessRuleException):
    """Handler para violaciones de reglas de negocio (422)."""
    logger.warning(
        f"Business rule violation: {exc.message}",
        extra={"details": exc.details, "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Business Rule Violation",
            "message": exc.message,
            "details": exc.details
        }
    )


async def domain_exception_handler(request: Request, exc: DomainException):
    """Handler genérico para excepciones del dominio (500)."""
    logger.error(
        f"Domain exception: {exc.message}",
        extra={"details": exc.details, "path": request.url.path},
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Error",
            "message": exc.message,
            "details": exc.details
        }
    )


# ============================================
# Handlers de Excepciones de FastAPI
# ============================================

async def request_validation_handler(request: Request, exc: RequestValidationError):
    """Handler para errores de validación de Pydantic (422)."""
    logger.warning(
        "Request validation error",
        extra={"errors": exc.errors(), "path": request.url.path}
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Request Validation Error",
            "message": "Los datos enviados no son válidos",
            "details": exc.errors()
        }
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handler para excepciones HTTP de Starlette."""
    logger.warning(
        f"HTTP exception: {exc.status_code} - {exc.detail}",
        extra={"path": request.url.path}
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Error",
            "message": exc.detail
        }
    )


# ============================================
# Handler General (Fallback)
# ============================================

async def general_exception_handler(request: Request, exc: Exception):
    """
    Handler genérico para excepciones no capturadas.
    
    Esto evita que el servidor exponga stack traces al cliente.
    """
    logger.error(
        f"Unhandled exception: {type(exc).__name__} - {str(exc)}",
        extra={"path": request.url.path},
        exc_info=True
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "Ha ocurrido un error inesperado. Por favor, contacta al administrador.",
            # No exponer detalles de la excepción en producción
        }
    )
