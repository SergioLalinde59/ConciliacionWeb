from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from src.domain.models.concepto import Concepto
from src.domain.ports.concepto_repository import ConceptoRepository
from src.infrastructure.api.dependencies import get_concepto_repository

router = APIRouter(prefix="/api/conceptos", tags=["conceptos"])

class ConceptoDTO(BaseModel):
    concepto: str
    grupoid_fk: Optional[int] = None

class ConceptoResponse(BaseModel):
    id: int
    nombre: str
    grupo_id: Optional[int]

@router.get("", response_model=List[ConceptoResponse])
def listar_conceptos(repo: ConceptoRepository = Depends(get_concepto_repository)):
    conceptos = repo.obtener_todos()
    return [{
        "id": c.conceptoid, 
        "nombre": c.concepto,
        "grupo_id": c.grupoid_fk
    } for c in conceptos]

@router.post("", response_model=ConceptoResponse)
def crear_concepto(dto: ConceptoDTO, repo: ConceptoRepository = Depends(get_concepto_repository)):
    nuevo = Concepto(
        conceptoid=None, 
        concepto=dto.concepto,
        grupoid_fk=dto.grupoid_fk
    )
    try:
        guardado = repo.guardar(nuevo)
        return {
            "id": guardado.conceptoid, 
            "nombre": guardado.concepto,
            "grupo_id": guardado.grupoid_fk
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=ConceptoResponse)
def actualizar_concepto(id: int, dto: ConceptoDTO, repo: ConceptoRepository = Depends(get_concepto_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Concepto no encontrado")
    
    actualizado = Concepto(
        conceptoid=id,
        concepto=dto.concepto,
        grupoid_fk=dto.grupoid_fk
    )
    try:
        guardado = repo.guardar(actualizado)
        return {
            "id": guardado.conceptoid, 
            "nombre": guardado.concepto,
            "grupo_id": guardado.grupoid_fk
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_concepto(id: int, repo: ConceptoRepository = Depends(get_concepto_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
         raise HTTPException(status_code=404, detail="Concepto no encontrado")
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado correctamente"}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))

