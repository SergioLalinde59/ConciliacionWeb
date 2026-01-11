from fastapi import Depends
from src.infrastructure.database.connection import get_db_connection

from src.infrastructure.database.postgres_cuenta_repository import PostgresCuentaRepository
from src.domain.ports.cuenta_repository import CuentaRepository

from src.infrastructure.database.postgres_moneda_repository import PostgresMonedaRepository
from src.domain.ports.moneda_repository import MonedaRepository

from src.infrastructure.database.postgres_tipo_mov_repository import PostgresTipoMovRepository
from src.domain.ports.tipo_mov_repository import TipoMovRepository

from src.infrastructure.database.postgres_tercero_repository import PostgresTerceroRepository
from src.domain.ports.tercero_repository import TerceroRepository

from src.infrastructure.database.postgres_grupo_repository import PostgresGrupoRepository
from src.domain.ports.grupo_repository import GrupoRepository

from src.infrastructure.database.postgres_concepto_repository import PostgresConceptoRepository
from src.domain.ports.concepto_repository import ConceptoRepository

from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository
from src.domain.ports.movimiento_repository import MovimientoRepository

from src.infrastructure.database.postgres_reglas_repository import PostgresReglasRepository
from src.domain.ports.reglas_repository import ReglasRepository

from src.infrastructure.database.postgres_config_filtro_grupo_repository import PostgresConfigFiltroGrupoRepository
from src.domain.ports.config_filtro_grupo_repository import ConfigFiltroGrupoRepository

from src.infrastructure.database.postgres_config_valor_pendiente_repository import PostgresConfigValorPendienteRepository
from src.domain.ports.config_valor_pendiente_repository import ConfigValorPendienteRepository

def get_cuenta_repository(conn=Depends(get_db_connection)) -> CuentaRepository:
    return PostgresCuentaRepository(conn)

def get_moneda_repository(conn=Depends(get_db_connection)) -> MonedaRepository:
    return PostgresMonedaRepository(conn)

def get_tipo_mov_repository(conn=Depends(get_db_connection)) -> TipoMovRepository:
    return PostgresTipoMovRepository(conn)

def get_tercero_repository(conn=Depends(get_db_connection)) -> TerceroRepository:
    return PostgresTerceroRepository(conn)

from src.infrastructure.database.postgres_tercero_descripcion_repository import PostgresTerceroDescripcionRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository

def get_tercero_descripcion_repository(conn=Depends(get_db_connection)) -> TerceroDescripcionRepository:
    return PostgresTerceroDescripcionRepository(conn)

def get_grupo_repository(conn=Depends(get_db_connection)) -> GrupoRepository:
    return PostgresGrupoRepository(conn)

def get_concepto_repository(conn=Depends(get_db_connection)) -> ConceptoRepository:
    return PostgresConceptoRepository(conn)

def get_movimiento_repository(conn=Depends(get_db_connection)) -> MovimientoRepository:
    return PostgresMovimientoRepository(conn)

def get_reglas_repository(conn=Depends(get_db_connection)) -> ReglasRepository:
    return PostgresReglasRepository(conn)

def get_config_filtro_grupo_repository(conn=Depends(get_db_connection)) -> ConfigFiltroGrupoRepository:
    return PostgresConfigFiltroGrupoRepository(conn)

def get_config_valor_pendiente_repository(conn=Depends(get_db_connection)) -> ConfigValorPendienteRepository:
    return PostgresConfigValorPendienteRepository(conn)

