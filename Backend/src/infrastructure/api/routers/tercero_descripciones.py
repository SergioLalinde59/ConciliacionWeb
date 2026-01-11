from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from src.domain.models.tercero_descripcion import TerceroDescripcion
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository
from src.infrastructure.api.dependencies import get_tercero_descripcion_repository
from src.infrastructure.logging.config import logger

router = APIRouter(prefix="/api/terceros/descripciones", tags=["terceros-descripciones"])

class TerceroDescripcionDTO(BaseModel):
    terceroid: int
    descripcion: Optional[str] = None
    referencia: Optional[str] = None

class TerceroDescripcionResponse(BaseModel):
    id: int
    terceroid: int
    descripcion: Optional[str]
    referencia: Optional[str]
    activa: bool

@router.get("", response_model=List[TerceroDescripcionResponse])
def listar_descripciones(terceroid: Optional[int] = None, repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository)):
    """Listar descripciones, opcionalmente filtrando por tercero maestro"""
    if terceroid:
        items = repo.obtener_por_tercero_id(terceroid)
    else:
        items = repo.obtener_todas()
    
    return [TerceroDescripcionResponse(
        id=i.id,
        terceroid=i.terceroid,
        descripcion=i.descripcion,
        referencia=i.referencia,
        activa=i.activa
    ) for i in items]

@router.post("", response_model=TerceroDescripcionResponse)
def crear_descripcion(dto: TerceroDescripcionDTO, repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository)):
    nueva = TerceroDescripcion(
        terceroid=dto.terceroid,
        descripcion=dto.descripcion,
        referencia=dto.referencia
    )
    try:
        guardada = repo.guardar(nueva)
        return TerceroDescripcionResponse(
            id=guardada.id,
            terceroid=guardada.terceroid,
            descripcion=guardada.descripcion,
            referencia=guardada.referencia,
            activa=guardada.activa
        )
    except Exception as e:
        logger.error(f"Error creando descripcion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=TerceroDescripcionResponse)
def actualizar_descripcion(id: int, dto: TerceroDescripcionDTO, repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Descripcion no encontrada")
    
    existente.terceroid = dto.terceroid
    existente.descripcion = dto.descripcion
    existente.referencia = dto.referencia
    
    try:
        guardada = repo.guardar(existente)
        return TerceroDescripcionResponse(
            id=guardada.id,
            terceroid=guardada.terceroid,
            descripcion=guardada.descripcion,
            referencia=guardada.referencia,
            activa=guardada.activa
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_descripcion(id: int, repo: TerceroDescripcionRepository = Depends(get_tercero_descripcion_repository)):
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
