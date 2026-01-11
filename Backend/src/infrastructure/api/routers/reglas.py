from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel

from src.domain.models.regla_clasificacion import ReglaClasificacion
from src.domain.ports.reglas_repository import ReglasRepository
from src.infrastructure.api.dependencies import get_reglas_repository

router = APIRouter(prefix="/api/reglas", tags=["reglas"])

# DTOs
class ReglaDTO(BaseModel):
    id: Optional[int] = None
    patron: str
    tercero_id: Optional[int] = None
    grupo_id: Optional[int] = None
    concepto_id: Optional[int] = None
    tipo_match: str = 'contiene'

@router.get("/", response_model=List[ReglaDTO])
def listar_reglas(repo: ReglasRepository = Depends(get_reglas_repository)):
    return repo.obtener_todos()

@router.post("/", response_model=ReglaDTO)
def crear_regla(dto: ReglaDTO, repo: ReglasRepository = Depends(get_reglas_repository)):
    try:
        nueva_regla = ReglaClasificacion(
            id=None,
            patron=dto.patron,
            tercero_id=dto.tercero_id,
            grupo_id=dto.grupo_id,
            concepto_id=dto.concepto_id,
            tipo_match=dto.tipo_match
        )
        return repo.guardar(nueva_regla)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=ReglaDTO)
def actualizar_regla(
    id: int, 
    dto: ReglaDTO, 
    repo: ReglasRepository = Depends(get_reglas_repository)
):
    try:
        # Idealmente buscaríamos primero, pero por brevedad actualizamos directo
        # o asumimos responsabilidad del cliente.
        regla = ReglaClasificacion(
            id=id,
            patron=dto.patron,
            tercero_id=dto.tercero_id,
            grupo_id=dto.grupo_id,
            concepto_id=dto.concepto_id,
            tipo_match=dto.tipo_match
        )
        return repo.guardar(regla)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_regla(id: int, repo: ReglasRepository = Depends(get_reglas_repository)):
    try:
        repo.eliminar(id)
        return {"mensaje": "Regla eliminada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
