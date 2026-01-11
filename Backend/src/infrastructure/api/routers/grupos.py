from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.domain.models.grupo import Grupo
from src.domain.ports.grupo_repository import GrupoRepository
from src.infrastructure.api.dependencies import get_grupo_repository

router = APIRouter(prefix="/api/grupos", tags=["grupos"])

class GrupoDTO(BaseModel):
    grupo: str

class GrupoResponse(BaseModel):
    id: int
    nombre: str

@router.get("", response_model=List[GrupoResponse])
def listar_grupos(repo: GrupoRepository = Depends(get_grupo_repository)):
    grupos = repo.obtener_todos()
    return [{"id": g.grupoid, "nombre": g.grupo} for g in grupos]

@router.post("", response_model=GrupoResponse)
def crear_grupo(dto: GrupoDTO, repo: GrupoRepository = Depends(get_grupo_repository)):
    nuevo = Grupo(grupoid=None, grupo=dto.grupo)
    try:
        guardado = repo.guardar(nuevo)
        return {"id": guardado.grupoid, "nombre": guardado.grupo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=GrupoResponse)
def actualizar_grupo(id: int, dto: GrupoDTO, repo: GrupoRepository = Depends(get_grupo_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    actualizado = Grupo(grupoid=id, grupo=dto.grupo)
    try:
        guardado = repo.guardar(actualizado)
        return {"id": guardado.grupoid, "nombre": guardado.grupo}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_grupo(id: int, repo: GrupoRepository = Depends(get_grupo_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
         raise HTTPException(status_code=404, detail="Grupo no encontrado")
    try:
        repo.eliminar(id)
        return {"mensaje": "Eliminado correctamente"}
    except Exception as e:
         raise HTTPException(status_code=400, detail=str(e))
