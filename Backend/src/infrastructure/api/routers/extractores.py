from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from src.domain.models.cuenta_extractor import CuentaExtractor
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository
from src.infrastructure.api.dependencies import get_cuenta_extractor_repository

router = APIRouter(prefix="/api/extractores", tags=["extractores"])

class ExtractorDTO(BaseModel):
    id: Optional[int] = None
    cuenta_id: int
    tipo: str
    modulo: str
    orden: int
    activo: bool
    created_at: Optional[datetime] = None

@router.get("/", response_model=List[ExtractorDTO])
def listar_extractores(repo: CuentaExtractorRepository = Depends(get_cuenta_extractor_repository)):
    return repo.obtener_todos()

@router.post("/", response_model=ExtractorDTO)
def crear_extractor(dto: ExtractorDTO, repo: CuentaExtractorRepository = Depends(get_cuenta_extractor_repository)):
    try:
        nuevo_extractor = CuentaExtractor(
            id=None,
            cuenta_id=dto.cuenta_id,
            tipo=dto.tipo,
            modulo=dto.modulo,
            orden=dto.orden,
            activo=dto.activo,
            created_at=None
        )
        return repo.guardar(nuevo_extractor)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=ExtractorDTO)
def actualizar_extractor(
    id: int, 
    dto: ExtractorDTO, 
    repo: CuentaExtractorRepository = Depends(get_cuenta_extractor_repository)
):
    try:
        extractor = CuentaExtractor(
            id=id,
            cuenta_id=dto.cuenta_id,
            tipo=dto.tipo,
            modulo=dto.modulo,
            orden=dto.orden,
            activo=dto.activo,
            created_at=dto.created_at 
        )
        return repo.actualizar(extractor)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_extractor(id: int, repo: CuentaExtractorRepository = Depends(get_cuenta_extractor_repository)):
    try:
        repo.eliminar(id)
        return {"mensaje": "Extractor eliminado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
