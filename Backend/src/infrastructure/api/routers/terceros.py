from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from src.domain.models.tercero import Tercero
from src.domain.ports.tercero_repository import TerceroRepository
from src.infrastructure.api.dependencies import get_tercero_repository
from src.infrastructure.logging.config import logger

router = APIRouter(prefix="/api/terceros", tags=["terceros"])

class TerceroDTO(BaseModel):
    tercero: str

class TerceroResponse(BaseModel):
    id: int
    nombre: str

@router.get("", response_model=List[TerceroResponse])
def listar_terceros(repo: TerceroRepository = Depends(get_tercero_repository)):
    terceros = repo.obtener_todos()
    return [{"id": t.terceroid, "nombre": t.tercero} for t in terceros]

@router.get("/buscar", response_model=List[TerceroResponse])
def buscar_terceros(q: str, repo: TerceroRepository = Depends(get_tercero_repository)):
    """Búsqueda difusa (Fuzzy Search) usando trigramas"""
    if len(q) < 2:
        return []
        
    try:
        terceros = repo.buscar_similares(q)
        return [{"id": t.terceroid, "nombre": t.tercero} for t in terceros]
    except Exception as e:
        logger.error(f"Error en búsqueda fuzzy: {str(e)}", exc_info=True)
        return []

@router.post("", response_model=TerceroResponse)
def crear_tercero(dto: TerceroDTO, repo: TerceroRepository = Depends(get_tercero_repository)):
    logger.info(f"Petición para crear tercero: {dto.tercero}")
    
    # Verificar si ya existe un tercero con el mismo nombre
    existente = repo.buscar_exacto(dto.tercero)
    if existente:
        logger.info(f"Tercero ya existente encontrado (ID: {existente.terceroid}). Devolviendo existente.")
        return {"id": existente.terceroid, "nombre": existente.tercero}

    nuevo = Tercero(terceroid=None, tercero=dto.tercero)
    try:
        guardado = repo.guardar(nuevo)
        logger.info(f"Nuevo tercero creado con ID {guardado.terceroid}")
        return {"id": guardado.terceroid, "nombre": guardado.tercero}
    except Exception as e:
        logger.error(f"Error al crear tercero: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=TerceroResponse)
def actualizar_tercero(id: int, dto: TerceroDTO, repo: TerceroRepository = Depends(get_tercero_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Tercero no encontrado")
    
    actualizado = Tercero(terceroid=id, tercero=dto.tercero)
    try:
        guardado = repo.guardar(actualizado)
        return {"id": guardado.terceroid, "nombre": guardado.tercero}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_tercero(id: int, repo: TerceroRepository = Depends(get_tercero_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
         raise HTTPException(status_code=404, detail="Tercero no encontrado")
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado correctamente"}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
