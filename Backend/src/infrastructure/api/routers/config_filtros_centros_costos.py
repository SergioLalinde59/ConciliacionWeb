from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List

from src.domain.models.config_filtro_centro_costo import ConfigFiltroCentroCosto
from src.domain.ports.config_filtro_centro_costo_repository import ConfigFiltroCentroCostoRepository
from src.infrastructure.api.dependencies import get_config_filtro_centro_costo_repository

router = APIRouter(prefix="/api/config-filtros-centros-costos", tags=["config-filtros-centros-costos"])

# DTO Schemas
class ConfigFiltroCentroCostoDTO(BaseModel):
    """Data Transfer Object for creating/updating filter configurations."""
    centro_costo_id: int = Field(..., description="ID del centro de costo al que se aplica el filtro")
    etiqueta: str = Field(..., min_length=1, max_length=100, description="Etiqueta descriptiva del filtro")
    activo_por_defecto: bool = Field(True, description="Indica si el filtro está activo por defecto")

class ConfigFiltroCentroCostoResponse(BaseModel):
    """Response model for filter configurations."""
    id: int
    centro_costo_id: int
    etiqueta: str
    activo_por_defecto: bool

# CRUD Endpoints

@router.get("", response_model=List[ConfigFiltroCentroCostoResponse])
def listar_config_filtros(
    repo: ConfigFiltroCentroCostoRepository = Depends(get_config_filtro_centro_costo_repository)
):
    """
    Obtiene todas las configuraciones de filtros de exclusión.
    
    Returns:
        Lista de todas las configuraciones de filtros
    """
    configs = repo.obtener_todos()
    return [
        {
            "id": c.id,
            "centro_costo_id": c.centro_costo_id,
            "etiqueta": c.etiqueta,
            "activo_por_defecto": c.activo_por_defecto
        }
        for c in configs
    ]

@router.get("/{id}", response_model=ConfigFiltroCentroCostoResponse)
def obtener_config_filtro(
    id: int,
    repo: ConfigFiltroCentroCostoRepository = Depends(get_config_filtro_centro_costo_repository)
):
    """
    Obtiene una configuración de filtro por su ID.
    
    Args:
        id: ID de la configuración
        
    Returns:
        Configuración de filtro encontrada
        
    Raises:
        HTTPException 404: Si no se encuentra la configuración
    """
    config = repo.obtener_por_id(id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuración de filtro no encontrada")
    
    return {
        "id": config.id,
        "centro_costo_id": config.centro_costo_id,
        "etiqueta": config.etiqueta,
        "activo_por_defecto": config.activo_por_defecto
    }

@router.post("", response_model=ConfigFiltroCentroCostoResponse, status_code=201)
def crear_config_filtro(
    dto: ConfigFiltroCentroCostoDTO,
    repo: ConfigFiltroCentroCostoRepository = Depends(get_config_filtro_centro_costo_repository)
):
    """
    Crea una nueva configuración de filtro.
    
    Args:
        dto: Datos de la nueva configuración
        
    Returns:
        Configuración creada con su ID asignado
        
    Raises:
        HTTPException 400: Si ya existe una configuración para el centro_costo_id especificado
        HTTPException 500: Si ocurre un error al guardar
    """
    nuevo = ConfigFiltroCentroCosto(
        centro_costo_id=dto.centro_costo_id,
        etiqueta=dto.etiqueta,
        activo_por_defecto=dto.activo_por_defecto
    )
    
    try:
        guardado = repo.guardar(nuevo)
        return {
            "id": guardado.id,
            "centro_costo_id": guardado.centro_costo_id,
            "etiqueta": guardado.etiqueta,
            "activo_por_defecto": guardado.activo_por_defecto
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=ConfigFiltroCentroCostoResponse)
def actualizar_config_filtro(
    id: int,
    dto: ConfigFiltroCentroCostoDTO,
    repo: ConfigFiltroCentroCostoRepository = Depends(get_config_filtro_centro_costo_repository)
):
    """
    Actualiza una configuración de filtro existente.
    
    Args:
        id: ID de la configuración a actualizar
        dto: Nuevos datos de la configuración
        
    Returns:
        Configuración actualizada
        
    Raises:
        HTTPException 404: Si no se encuentra la configuración
        HTTPException 400: Si el centro_costo_id ya está en uso por otra configuración
        HTTPException 500: Si ocurre un error al actualizar
    """
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Configuración de filtro no encontrada")
    
    actualizado = ConfigFiltroCentroCosto(
        id=id,
        centro_costo_id=dto.centro_costo_id,
        etiqueta=dto.etiqueta,
        activo_por_defecto=dto.activo_por_defecto
    )
    
    try:
        guardado = repo.guardar(actualizado)
        return {
            "id": guardado.id,
            "centro_costo_id": guardado.centro_costo_id,
            "etiqueta": guardado.etiqueta,
            "activo_por_defecto": guardado.activo_por_defecto
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_config_filtro(
    id: int,
    repo: ConfigFiltroCentroCostoRepository = Depends(get_config_filtro_centro_costo_repository)
):
    """
    Elimina una configuración de filtro.
    
    Args:
        id: ID de la configuración a eliminar
        
    Returns:
        Mensaje de confirmación
        
    Raises:
        HTTPException 404: Si no se encuentra la configuración
        HTTPException 400: Si ocurre un error al eliminar
    """
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Configuración de filtro no encontrada")
    
    try:
        repo.eliminar(id)
        return {"mensaje": "Configuración de filtro eliminada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
