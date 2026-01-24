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

from src.infrastructure.database.postgres_tercero_descripcion_repository import PostgresTerceroDescripcionRepository
from src.domain.ports.tercero_descripcion_repository import TerceroDescripcionRepository

from src.infrastructure.database.postgres_centro_costo_repository import PostgresCentroCostoRepository
from src.domain.ports.centro_costo_repository import CentroCostoRepository

from src.infrastructure.database.postgres_concepto_repository import PostgresConceptoRepository
from src.domain.ports.concepto_repository import ConceptoRepository

from src.infrastructure.database.postgres_movimiento_repository import PostgresMovimientoRepository
from src.domain.ports.movimiento_repository import MovimientoRepository

from src.infrastructure.database.postgres_reglas_repository import PostgresReglasRepository
from src.domain.ports.reglas_repository import ReglasRepository

from src.infrastructure.database.postgres_config_filtro_centro_costo_repository import PostgresConfigFiltroCentroCostoRepository
from src.domain.ports.config_filtro_centro_costo_repository import ConfigFiltroCentroCostoRepository

from src.infrastructure.database.postgres_config_valor_pendiente_repository import PostgresConfigValorPendienteRepository
from src.domain.ports.config_valor_pendiente_repository import ConfigValorPendienteRepository

from src.infrastructure.database.postgres_conciliacion_repository import PostgresConciliacionRepository
from src.domain.ports.conciliacion_repository import ConciliacionRepository

from src.domain.ports.movimiento_extracto_repository import MovimientoExtractoRepository
from src.infrastructure.database.postgres_movimiento_extracto_repository import PostgresMovimientoExtractoRepository


def get_cuenta_repository(conn=Depends(get_db_connection)) -> CuentaRepository:
    return PostgresCuentaRepository(conn)

def get_moneda_repository(conn=Depends(get_db_connection)) -> MonedaRepository:
    return PostgresMonedaRepository(conn)

def get_tipo_mov_repository(conn=Depends(get_db_connection)) -> TipoMovRepository:
    return PostgresTipoMovRepository(conn)

def get_tercero_repository(conn=Depends(get_db_connection)) -> TerceroRepository:
    return PostgresTerceroRepository(conn)

def get_tercero_descripcion_repository(conn=Depends(get_db_connection)) -> TerceroDescripcionRepository:
    return PostgresTerceroDescripcionRepository(conn)

def get_centro_costo_repository(conn=Depends(get_db_connection)) -> CentroCostoRepository:
    return PostgresCentroCostoRepository(conn)

def get_concepto_repository(conn=Depends(get_db_connection)) -> ConceptoRepository:
    return PostgresConceptoRepository(conn)

def get_movimiento_repository(conn=Depends(get_db_connection)) -> MovimientoRepository:
    return PostgresMovimientoRepository(conn)

def get_reglas_repository(conn=Depends(get_db_connection)) -> ReglasRepository:
    return PostgresReglasRepository(conn)

def get_config_filtro_centro_costo_repository(conn=Depends(get_db_connection)) -> ConfigFiltroCentroCostoRepository:
    return PostgresConfigFiltroCentroCostoRepository(conn)

def get_config_valor_pendiente_repository(conn=Depends(get_db_connection)) -> ConfigValorPendienteRepository:
    return PostgresConfigValorPendienteRepository(conn)

def get_conciliacion_repository(conn=Depends(get_db_connection)) -> ConciliacionRepository:
    return PostgresConciliacionRepository(conn)

def get_movimiento_extracto_repository(conn=Depends(get_db_connection)) -> MovimientoExtractoRepository:
    return PostgresMovimientoExtractoRepository(conn)

from src.infrastructure.database.postgres_cuenta_extractor_repository import PostgresCuentaExtractorRepository
from src.domain.ports.cuenta_extractor_repository import CuentaExtractorRepository

def get_cuenta_extractor_repository(conn=Depends(get_db_connection)) -> CuentaExtractorRepository:
    return PostgresCuentaExtractorRepository(conn)

# Matching System Dependencies
from src.infrastructure.database.postgres_movimiento_vinculacion_repository import PostgresMovimientoVinculacionRepository
from src.domain.ports.movimiento_vinculacion_repository import MovimientoVinculacionRepository

from src.infrastructure.database.postgres_configuracion_matching_repository import PostgresConfiguracionMatchingRepository
from src.domain.ports.configuracion_matching_repository import ConfiguracionMatchingRepository

from src.domain.services.matching_service import MatchingService

def get_movimiento_vinculacion_repository(conn=Depends(get_db_connection)) -> MovimientoVinculacionRepository:
    return PostgresMovimientoVinculacionRepository(conn)

def get_configuracion_matching_repository(conn=Depends(get_db_connection)) -> ConfiguracionMatchingRepository:
    return PostgresConfiguracionMatchingRepository(conn)

def get_matching_service() -> MatchingService:
    """
    Retorna una instancia de MatchingService.
    
    MatchingService es un servicio de dominio puro sin estado,
    no requiere repositorios en su constructor.
    """
    return MatchingService()

from src.infrastructure.database.postgres_matching_alias_repository import PostgresMatchingAliasRepository
from src.domain.ports.matching_alias_repository import MatchingAliasRepository

def get_matching_alias_repository(conn=Depends(get_db_connection)) -> MatchingAliasRepository:
    return PostgresMatchingAliasRepository(conn)
from src.domain.services.date_range_service import DateRangeService

def get_date_range_service(
    repo=Depends(get_movimiento_extracto_repository)
) -> DateRangeService:
    return DateRangeService(repo)
