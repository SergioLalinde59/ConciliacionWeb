from fastapi import APIRouter, Depends
from typing import List, Dict
from pydantic import BaseModel
from src.infrastructure.logging.config import logger
from src.infrastructure.database.connection import get_db_connection

from src.infrastructure.database.postgres_tercero_repository import PostgresTerceroRepository
from src.infrastructure.database.postgres_centro_costo_repository import PostgresCentroCostoRepository
from src.infrastructure.database.postgres_concepto_repository import PostgresConceptoRepository
from src.infrastructure.database.postgres_cuenta_repository import PostgresCuentaRepository
from src.infrastructure.database.postgres_moneda_repository import PostgresMonedaRepository

router = APIRouter()

# DTOs simples para evitar problemas de serialización con dataclasses puros si no son pydantic
class ItemCatalogo(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True

@router.get("/catalogos/terceros")
def obtener_terceros(conn = Depends(get_db_connection)):
    repo = PostgresTerceroRepository(conn)
    # Adaptar respuesta. El modelo Tercero tiene 'terceroid', 'tercero', 'descripcion'
    terceros = repo.obtener_todos()
    data = []
    for t in terceros:
        data.append({"id": t.terceroid, "nombre": t.tercero})
    return data

@router.get("/catalogos/centros-costos")
def obtener_centros_costos(conn = Depends(get_db_connection)):
    repo = PostgresCentroCostoRepository(conn)
    centros = repo.obtener_todos()
    return [{"id": c.centro_costo_id, "nombre": c.centro_costo} for c in centros]

@router.get("/catalogos/conceptos")
def obtener_conceptos(conn = Depends(get_db_connection)):
    repo = PostgresConceptoRepository(conn)
    conceptos = repo.obtener_todos()
    return [{"id": c.conceptoid, "nombre": c.concepto, "centro_costo_id": c.centro_costo_id} for c in conceptos]

@router.get("/catalogos")
def obtener_todos_catalogos(conn = Depends(get_db_connection)):
    logger.info("Cargando todos los catálogos")
    # Ejecutamos todo en una sola conexión
    repo_ter = PostgresTerceroRepository(conn)
    repo_cc = PostgresCentroCostoRepository(conn)
    repo_con = PostgresConceptoRepository(conn)
    repo_cue = PostgresCuentaRepository(conn)
    repo_mon = PostgresMonedaRepository(conn)

    # Terceros con formato display
    terceros = []
    for t in repo_ter.obtener_todos():
        terceros.append({"id": t.terceroid, "nombre": t.tercero})

    return {
        "cuentas": [{"id": c.cuentaid, "nombre": c.cuenta, "permite_carga": c.permite_carga, "permite_conciliar": c.permite_conciliar} for c in repo_cue.obtener_todos()],
        "monedas": [{"id": m.monedaid, "nombre": m.moneda, "isocode": m.isocode} for m in repo_mon.obtener_todos()],
        "terceros": terceros,
        "centros_costos": [{"id": g.centro_costo_id, "nombre": g.centro_costo} for g in repo_cc.obtener_todos()],
        "conceptos": [{"id": c.conceptoid, "nombre": c.concepto, "centro_costo_id": c.centro_costo_id} for c in repo_con.obtener_todos()]
    }
