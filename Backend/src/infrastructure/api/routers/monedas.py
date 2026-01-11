from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.domain.models.moneda import Moneda
from src.domain.ports.moneda_repository import MonedaRepository
from src.infrastructure.api.dependencies import get_moneda_repository

router = APIRouter(prefix="/api/monedas", tags=["monedas"])

class MonedaDTO(BaseModel):
    isocode: str
    moneda: str

class MonedaResponse(BaseModel):
    id: int
    isocode: str
    nombre: str

@router.get("", response_model=List[MonedaResponse])
def listar_monedas(repo: MonedaRepository = Depends(get_moneda_repository)):
    monedas = repo.obtener_todos()
    return [{"id": m.monedaid, "isocode": m.isocode, "nombre": m.moneda} for m in monedas]

@router.post("", response_model=MonedaResponse)
def crear_moneda(dto: MonedaDTO, repo: MonedaRepository = Depends(get_moneda_repository)):
    nueva = Moneda(monedaid=None, isocode=dto.isocode, moneda=dto.moneda)
    try:
        guardada = repo.guardar(nueva)
        return {"id": guardada.monedaid, "isocode": guardada.isocode, "nombre": guardada.moneda}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=MonedaResponse)
def actualizar_moneda(id: int, dto: MonedaDTO, repo: MonedaRepository = Depends(get_moneda_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    
    actualizada = Moneda(monedaid=id, isocode=dto.isocode, moneda=dto.moneda)
    try:
        guardada = repo.guardar(actualizada)
        return {"id": guardada.monedaid, "isocode": guardada.isocode, "nombre": guardada.moneda}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_moneda(id: int, repo: MonedaRepository = Depends(get_moneda_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Moneda no encontrada")
    try:
        repo.eliminar(id)
        return {"mensaje": "Moneda eliminada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se puede eliminar: {str(e)}")
