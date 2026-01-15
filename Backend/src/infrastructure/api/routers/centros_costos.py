from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.domain.models.centro_costo import CentroCosto
from src.domain.ports.centro_costo_repository import CentroCostoRepository
from src.infrastructure.api.dependencies import get_centro_costo_repository

router = APIRouter(prefix="/api/centros-costos", tags=["centros-costos"])

class CentroCostoDTO(BaseModel):
    centro_costo: str

class CentroCostoResponse(BaseModel):
    id: int
    nombre: str

@router.get("", response_model=List[CentroCostoResponse])
def listar_centros_costos(repo: CentroCostoRepository = Depends(get_centro_costo_repository)):
    centros = repo.obtener_todos()
    return [{"id": c.centro_costo_id, "nombre": c.centro_costo} for c in centros]

@router.post("", response_model=CentroCostoResponse)
def crear_centro_costo(dto: CentroCostoDTO, repo: CentroCostoRepository = Depends(get_centro_costo_repository)):
    nuevo = CentroCosto(centro_costo_id=None, centro_costo=dto.centro_costo)
    try:
        guardado = repo.guardar(nuevo)
        return {"id": guardado.centro_costo_id, "nombre": guardado.centro_costo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=CentroCostoResponse)
def actualizar_centro_costo(id: int, dto: CentroCostoDTO, repo: CentroCostoRepository = Depends(get_centro_costo_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Centro de Costo no encontrado")
    
    actualizado = CentroCosto(centro_costo_id=id, centro_costo=dto.centro_costo)
    try:
        guardado = repo.guardar(actualizado)
        return {"id": guardado.centro_costo_id, "nombre": guardado.centro_costo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_centro_costo(id: int, repo: CentroCostoRepository = Depends(get_centro_costo_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
         raise HTTPException(status_code=404, detail="Centro de Costo no encontrado")
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado correctamente"}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
