"""
Excepciones personalizadas del dominio.

Estas excepciones representan errores de negocio y deben ser manejadas
explícitamente en los handlers de la API.
"""


class DomainException(Exception):
    """Excepción base para todas las excepciones del dominio."""
    
    def __init__(self, message: str, details: dict = None):
        self.message = message
        self.details = details or {}
        super().__init__(self.message)


# ============================================
# Excepciones de Entidades No Encontradas
# ============================================

class EntityNotFoundException(DomainException):
    """Excepción base para entidades no encontradas."""
    pass


class MovimientoNotFoundException(EntityNotFoundException):
    """El movimiento solicitado no existe."""
    
    def __init__(self, movimiento_id: int):
        super().__init__(
            message=f"Movimiento con ID {movimiento_id} no encontrado",
            details={"movimiento_id": movimiento_id}
        )


class TerceroNotFoundException(EntityNotFoundException):
    """El tercero solicitado no existe."""
    
    def __init__(self, tercero_id: int):
        super().__init__(
            message=f"Tercero con ID {tercero_id} no encontrado",
            details={"tercero_id": tercero_id}
        )


class GrupoNotFoundException(EntityNotFoundException):
    """El grupo solicitado no existe."""
    
    def __init__(self, grupo_id: int):
        super().__init__(
            message=f"Grupo con ID {grupo_id} no encontrado",
            details={"grupo_id": grupo_id}
        )


class ConceptoNotFoundException(EntityNotFoundException):
    """El concepto solicitado no existe."""
    
    def __init__(self, concepto_id: int):
        super().__init__(
            message=f"Concepto con ID {concepto_id} no encontrado",
            details={"concepto_id": concepto_id}
        )


class CuentaNotFoundException(EntityNotFoundException):
    """La cuenta solicitada no existe."""
    
    def __init__(self, cuenta_id: int):
        super().__init__(
            message=f"Cuenta con ID {cuenta_id} no encontrada",
            details={"cuenta_id": cuenta_id}
        )


# ============================================
# Excepciones de Validación
# ============================================

class ValidationException(DomainException):
    """Excepción para errores de validación de datos."""
    pass


class InvalidMovimientoDataException(ValidationException):
    """Los datos del movimiento son inválidos."""
    
    def __init__(self, field: str, message: str):
        super().__init__(
            message=f"Dato inválido en campo '{field}': {message}",
            details={"field": field, "validation_error": message}
        )


class InvalidDateRangeException(ValidationException):
    """El rango de fechas es inválido."""
    
    def __init__(self, fecha_inicio: str, fecha_fin: str):
        super().__init__(
            message=f"Rango de fechas inválido: desde {fecha_inicio} hasta {fecha_fin}",
            details={"fecha_inicio": fecha_inicio, "fecha_fin": fecha_fin}
        )


class DuplicateMovimientoException(ValidationException):
    """Ya existe un movimiento similar (posible duplicado)."""
    
    def __init__(self, details: dict):
        super().__init__(
            message="Ya existe un movimiento similar. Posible duplicado.",
            details=details
        )


# ============================================
# Excepciones de Base de Datos
# ============================================

class DatabaseException(DomainException):
    """Excepción base para errores de base de datos."""
    pass


class DatabaseConnectionException(DatabaseException):
    """Error al conectar con la base de datos."""
    
    def __init__(self, original_error: Exception):
        super().__init__(
            message="Error al conectar con la base de datos",
            details={"original_error": str(original_error)}
        )


class DatabaseQueryException(DatabaseException):
    """Error al ejecutar una query en la base de datos."""
    
    def __init__(self, query: str, original_error: Exception):
        super().__init__(
            message="Error al ejecutar query en la base de datos",
            details={
                "query_preview": query[:200] if len(query) > 200 else query,
                "original_error": str(original_error)
            }
        )


# ============================================
# Excepciones de Procesamiento de Archivos
# ============================================

class FileProcessingException(DomainException):
    """Excepción base para errores de procesamiento de archivos."""
    pass


class InvalidFileFormatException(FileProcessingException):
    """El formato del archivo no es válido."""
    
    def __init__(self, filename: str, expected_format: str):
        super().__init__(
            message=f"Formato de archivo inválido: {filename}. Se esperaba: {expected_format}",
            details={"filename": filename, "expected_format": expected_format}
        )


class FileParsingException(FileProcessingException):
    """Error al parsear el archivo."""
    
    def __init__(self, filename: str, line_number: int = None, details: str = None):
        message = f"Error al procesar archivo: {filename}"
        if line_number:
            message += f" en línea {line_number}"
        
        super().__init__(
            message=message,
            details={
                "filename": filename,
                "line_number": line_number,
                "parsing_details": details
            }
        )


# ============================================
# Excepciones de Lógica de Negocio
# ============================================

class BusinessRuleException(DomainException):
    """Excepción para violaciones de reglas de negocio."""
    pass


class CannotDeleteEntityException(BusinessRuleException):
    """No se puede eliminar la entidad porque tiene dependencias."""
    
    def __init__(self, entity_type: str, entity_id: int, reason: str):
        super().__init__(
            message=f"No se puede eliminar {entity_type} con ID {entity_id}: {reason}",
            details={
                "entity_type": entity_type,
                "entity_id": entity_id,
                "reason": reason
            }
        )


class ClasificacionException(BusinessRuleException):
    """Error en el proceso de clasificación."""
    
    def __init__(self, message: str, movimiento_id: int = None):
        details = {}
        if movimiento_id:
            details["movimiento_id"] = movimiento_id
        
        super().__init__(message=message, details=details)
