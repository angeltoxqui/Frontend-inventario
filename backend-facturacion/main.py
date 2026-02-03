"""
Módulo de Facturación Electrónica - SETOI / Gastro POS Pro
API Backend para integración con Factus (Facturación electrónica Colombia)
Sistema Multi-Tenant para múltiples restaurantes.
"""

import logging
from contextlib import asynccontextmanager

# IMPORTANTE: Cargar variables de entorno ANTES de imports de la app
# para que ENCRYPTION_KEY esté disponible al crear el singleton del encriptador
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import init_db
from app.routers import billing
from app.routers import ranges
from app.routers import restaurants
from app.routers import inventory

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook para startup/shutdown."""
    logger.info("Iniciando módulo de facturación electrónica...")
    
    # Inicializar base de datos (crear tablas)
    await init_db()
    logger.info("Base de datos inicializada")
    
    yield
    
    logger.info("Cerrando módulo de facturación electrónica...")


app = FastAPI(
    title="Gastro POS Pro - Facturación Electrónica",
    description="API Multi-Tenant para facturación electrónica de restaurantes con Factus",
    version="2.0.0",
    lifespan=lifespan
)

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev
        "http://localhost:3000",  # React dev
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(restaurants.router)
app.include_router(billing.router)
app.include_router(ranges.router)
app.include_router(inventory.router)


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz para verificar que la API está funcionando."""
    return {
        "service": "Gastro POS Pro - Facturación Electrónica",
        "status": "running",
        "version": "2.0.0",
        "features": [
            "Multi-Tenant",
            "Factus Integration",
            "DIAN Compliant"
        ],
        "docs": "/docs"
    }


# Para desarrollo: python -m uvicorn main:app --reload
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)