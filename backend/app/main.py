import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
)

# --- CONFIGURACIÓN CORS (PERMISIVA) ---
# Esto permite que tu archivo HTML local hable con el backend sin bloqueos
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Acepta peticiones de cualquier origen
    allow_credentials=True,
    allow_methods=["*"],  # Acepta todos los métodos (GET, POST, PUT, DELETE)
    allow_headers=["*"],  # Acepta todos los encabezados
)
# --------------------------------------

app.include_router(api_router, prefix=settings.API_V1_STR)