from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import os
from src.infrastructure.logging.config import logger
from src.infrastructure.api.exception_handlers import register_exception_handlers
from src.infrastructure.database.connection import get_connection_pool, close_all_connections

# Importar routers
from src.infrastructure.api.routers import (
    movimientos, 
    cuentas, 
    monedas, 
    tipos_movimiento, 
    terceros, 
    grupos, 
    conceptos,
    catalogos,
    clasificacion,
    archivos,
    reglas,
    config_filtros_grupos,
    tercero_descripciones
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicación.
    
    Startup:
    - Inicializa el connection pool
    
    Shutdown:
    - Cierra todas las conexiones del pool
    """
    # Startup
    logger.info("=" * 50)
    logger.info("Iniciando aplicación...")
    
    # Inicializar connection pool con lazy loading
    # (se creará al primer uso)
    logger.info("Connection pool listo (lazy initialization)")
    
    yield
    
    # Shutdown
    logger.info("Cerrando aplicación...")
    close_all_connections()
    logger.info("Aplicación cerrada correctamente")
    logger.info("=" * 50)


# Crear aplicación FastAPI con lifespan
app = FastAPI(
    title="Mvtos Hexagonal API",
    description="API para gestión de gastos personales",
    version="1.0.0",
    lifespan=lifespan
)

logger.info("Iniciando aplicación FastAPI de Mvtos")

# Configurar CORS
origins = [
    "http://localhost",
    "http://localhost:80",
    "http://localhost:5173", # Vite dev server
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar exception handlers globales
register_exception_handlers(app)
logger.info("Exception handlers registrados")

# Registrar Routers
app.include_router(movimientos.router)
app.include_router(catalogos.router, prefix="/api", tags=["catalogos"])
app.include_router(cuentas.router)
app.include_router(monedas.router)
app.include_router(tipos_movimiento.router)
app.include_router(terceros.router)
app.include_router(grupos.router)
app.include_router(conceptos.router)
app.include_router(clasificacion.router)
app.include_router(archivos.router)
app.include_router(reglas.router)
app.include_router(config_filtros_grupos.router)
app.include_router(tercero_descripciones.router)

logger.info("Todos los routers registrados")

@app.get("/")
def read_root():
    """Endpoint de health check."""
    return {
        "status": "ok", 
        "message": "API de Mvtos funcionando",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    """Endpoint detallado de health check."""
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    # Configuración desde variables de entorno
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    
    logger.info(f"Iniciando servidor en {host}:{port}")
    
    uvicorn.run(
        "src.infrastructure.api.main:app", 
        host=host, 
        port=port, 
        reload=True
    )
