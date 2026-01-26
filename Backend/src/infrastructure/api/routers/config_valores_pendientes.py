from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List

from src.domain.models.config_valor_pendiente import ConfigValorPendiente
from src.domain.ports.config_valor_pendiente_repository import ConfigValorPendienteRepository
from src.infrastructure.api.dependencies import get_config_valor_pendiente_repository

router = APIRouter(prefix="/api/config-valores-pendientes", tags=["config-valores-pendientes"])

# DTO Schemas
class ConfigValorPendienteDTO(BaseModel):
    """Data Transfer Object for creating/updating pending value configurations."""
    tipo: str = Field(..., description="Tipo de entidad (ej. 'centro_costo', 'tercero')")
    valor_id: int = Field(..., description="ID del valor a ignorar")
    descripcion: str = Field("", description="Descripción o motivo")
    activo: bool = Field(True, description="Indica si la configuración está activa")

class ConfigValorPendienteResponse(BaseModel):
    """Response model for pending value configurations."""
    id: int
    tipo: str
    valor_id: int
    descripcion: str
    activo: bool

# CRUD Endpoints

@router.get("", response_model=List[ConfigValorPendienteResponse])
def listar_configs(
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """
    Obtiene todas las configuraciones de valores pendientes.
    """
    try:
        configs = repo.obtener_todos()
        return [
            {
                "id": c.id,
                "tipo": c.tipo,
                "valor_id": c.valor_id,
                "descripcion": c.descripcion,
                "activo": c.activo
            }
            for c in configs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tipo/{tipo}", response_model=List[int])
def listar_ids_por_tipo(
    tipo: str,
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """
    Obtiene solo los IDs de valores pendientes para un tipo específico.
    """
    try:
        return repo.obtener_ids_por_tipo(tipo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{id}", response_model=ConfigValorPendienteResponse)
def obtener_config(
    id: int,
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Obtiene una configuración por ID."""
    config = repo.obtener_por_id(id)
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    return {
        "id": config.id,
        "tipo": config.tipo,
        "valor_id": config.valor_id,
        "descripcion": config.descripcion,
        "activo": config.activo
    }

@router.post("", response_model=ConfigValorPendienteResponse, status_code=201)
def crear_config(
    dto: ConfigValorPendienteDTO,
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Crea una nueva configuración."""
    nuevo = ConfigValorPendiente(
        id=None,
        tipo=dto.tipo,
        valor_id=dto.valor_id,
        descripcion=dto.descripcion,
        activo=dto.activo
    )
    
    try:
        guardado = repo.guardar(nuevo)
        return {
            "id": guardado.id,
            "tipo": guardado.tipo,
            "valor_id": guardado.valor_id,
            "descripcion": guardado.descripcion,
            "activo": guardado.activo
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=ConfigValorPendienteResponse)
def actualizar_config(
    id: int,
    dto: ConfigValorPendienteDTO,
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Actualiza una configuración existente."""
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    actualizado = ConfigValorPendiente(
        id=id,
        tipo=dto.tipo,
        valor_id=dto.valor_id,
        descripcion=dto.descripcion,
        activo=dto.activo
    )
    
    try:
        guardado = repo.guardar(actualizado)
        return {
            "id": guardado.id,
            "tipo": guardado.tipo,
            "valor_id": guardado.valor_id,
            "descripcion": guardado.descripcion,
            "activo": guardado.activo
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_config(
    id: int,
    repo: ConfigValorPendienteRepository = Depends(get_config_valor_pendiente_repository)
):
    """Elimina una configuración."""
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    try:
        repo.eliminar(id)
        return {"mensaje": "Configuración eliminada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
