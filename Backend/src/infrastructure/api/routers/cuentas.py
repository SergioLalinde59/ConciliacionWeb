from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from src.domain.models.cuenta import Cuenta
from src.domain.ports.cuenta_repository import CuentaRepository
from src.infrastructure.api.dependencies import get_cuenta_repository

router = APIRouter(prefix="/api/cuentas", tags=["cuentas"])

class CuentaDTO(BaseModel):
    cuenta: str
    permite_carga: bool = False

class CuentaResponse(BaseModel):
    id: int
    nombre: str
    permite_carga: bool = False

@router.get("", response_model=List[CuentaResponse])
def listar_cuentas(repo: CuentaRepository = Depends(get_cuenta_repository)):
    cuentas = repo.obtener_todos()
    return [{
        "id": c.cuentaid, 
        "nombre": c.cuenta,
        "permite_carga": c.permite_carga
    } for c in cuentas]

@router.post("", response_model=CuentaResponse)
def crear_cuenta(dto: CuentaDTO, repo: CuentaRepository = Depends(get_cuenta_repository)):
    nueva_cuenta = Cuenta(
        cuentaid=None, 
        cuenta=dto.cuenta,
        permite_carga=dto.permite_carga
    )
    try:
        guardada = repo.guardar(nueva_cuenta)
        # Asegurar respuesta completa
        return {
            "id": guardada.cuentaid, 
            "nombre": guardada.cuenta,
            "permite_carga": guardada.permite_carga
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{id}", response_model=CuentaResponse)
def actualizar_cuenta(id: int, dto: CuentaDTO, repo: CuentaRepository = Depends(get_cuenta_repository)):
    # Verificar existencia
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    
    # Mantener estado 'activa' de la existente, actualizar resto
    actualizada = Cuenta(
        cuentaid=id, 
        cuenta=dto.cuenta,
        activa=existente.activa,
        permite_carga=dto.permite_carga
    )
    try:
        guardada = repo.guardar(actualizada)
        return {
            "id": guardada.cuentaid, 
            "nombre": guardada.cuenta,
            "permite_carga": guardada.permite_carga
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
def eliminar_cuenta(id: int, repo: CuentaRepository = Depends(get_cuenta_repository)):
    existente = repo.obtener_por_id(id)
    if not existente:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
    
    try:
        repo.eliminar(id)
        return {"mensaje": "Cuenta eliminada correctamente"}
    except Exception as e:
        # Probablemente constraint violation si tiene movimientos
        raise HTTPException(status_code=400, detail=f"No se puede eliminar la cuenta: {str(e)}")
