from fastapi import APIRouter

# Importamos los módulos
from app.api.routes import login
from app.api.routes import users
from app.api.routes import insumos
from app.api.routes import productos
from app.api.routes import ventas  # <--- 1. Asegúrate de que esta línea esté aquí

api_router = APIRouter()

# Conectar rutas
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(insumos.router)
api_router.include_router(productos.router)
api_router.include_router(ventas.router) # <--- 2. Y asegúrate de que esta línea final exista