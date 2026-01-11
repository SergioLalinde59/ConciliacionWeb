from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.domain.models.tipo_mov import TipoMov
from src.domain.ports.tipo_mov_repository import TipoMovRepository
from src.infrastructure.api.dependencies import get_tipo_mov_repository

router = APIRouter(prefix="/api/tipos-movimiento", tags=["tipos-movimiento"])

class TipoMovDTO(BaseModel):
    tipomov: str

class TipoMovResponse(BaseModel):
    id: int
    nombre: str

@router.get("", response_model=List[TipoMovResponse])
def listar_tipos(repo: TipoMovRepository = Depends(get_tipo_mov_repository)):
    tipos = repo.obtener_todos()
    return [{"id": t.tipomovid, "nombre": t.tipomov} for t in tipos]

@router.post("", response_model=TipoMovResponse)
def crear_tipo(dto: TipoMovDTO, repo: TipoMovRepository = Depends(get_tipo_mov_repository)):
    nuevo = TipoMov(tipomovid=None, tipomov=dto.tipomov)
    try:
        guardado = repo.guardar(nuevo)
        return {"id": guardado.tipomovid, "nombre": guardado.tipomov}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=TipoMovResponse)
def actualizar_tipo(id: int, dto: TipoMovDTO, repo: TipoMovRepository = Depends(get_tipo_mov_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Tipo de movimiento no encontrado")
    
    actualizado = TipoMov(tipomovid=id, tipomov=dto.tipomov)
    try:
        guardado = repo.guardar(actualizado)
        return {"id": guardado.tipomovid, "nombre": guardado.tipomov}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_tipo(id: int, repo: TipoMovRepository = Depends(get_tipo_mov_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
         raise HTTPException(status_code=404, detail="Tipo de movimiento no encontrado")
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado correctamente"}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
