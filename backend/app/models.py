import uuid
from datetime import datetime
from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel

# ==========================================
#           USUARIOS Y AUTENTICACIÓN
# ==========================================

class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    rol: str = Field(default="admin") 

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)

class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)
    rol: str = Field(default="mesero") 

class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=40)

class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)

class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str

class UserPublic(UserBase):
    id: uuid.UUID

class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int

# TOKEN
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(SQLModel):
    sub: str | None = None

class Message(SQLModel):
    message: str

# ==========================================
#           INVENTARIO Y MENÚ
# ==========================================

class InsumoBase(SQLModel):
    nombre: str = Field(unique=True, index=True)
    unidad_medida: str
    costo: float = Field(default=0.0)
    stock_actual: float = Field(default=0.0)

class InsumoCreate(InsumoBase):
    pass

class InsumoUpdate(SQLModel):
    nombre: str | None = None
    unidad_medida: str | None = None
    costo: float | None = None
    stock_actual: float | None = None

class Insumo(InsumoBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recetas: list["Receta"] = Relationship(back_populates="insumo")

class InsumoPublic(InsumoBase):
    id: uuid.UUID

class InsumosPublic(SQLModel):
    data: list[InsumoPublic]
    count: int

# 2. PRODUCTOS
class ProductoBase(SQLModel):
    nombre: str = Field(unique=True, index=True)
    precio: float
    descripcion: str | None = None
    imagen_url: str | None = None
    disponible: bool = Field(default=True)

class Producto(ProductoBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recetas: list["Receta"] = Relationship(back_populates="producto", cascade_delete=True)

# 3. RECETAS
class Receta(SQLModel, table=True):
    producto_id: uuid.UUID = Field(foreign_key="producto.id", primary_key=True)
    insumo_id: uuid.UUID = Field(foreign_key="insumo.id", primary_key=True)
    cantidad_requerida: float
    
    producto: Producto = Relationship(back_populates="recetas")
    insumo: Insumo = Relationship(back_populates="recetas")

class RecetaCreate(SQLModel):
    insumo_id: uuid.UUID
    cantidad_requerida: float

class ProductoCreate(ProductoBase):
    ingredientes: list[RecetaCreate] = []

class RecetaPublic(SQLModel):
    insumo_nombre: str
    insumo_medida: str
    cantidad_requerida: float

class ProductoPublic(ProductoBase):
    id: uuid.UUID
    recetas: list[RecetaPublic] = []

class ProductosPublic(SQLModel):
    data: list[ProductoPublic]
    count: int

# ==========================================
#           MESAS
# ==========================================

class MesaBase(SQLModel):
    nombre: str = Field(unique=True, index=True)
    activa: bool = Field(default=True)

class Mesa(MesaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)

class MesaCreate(MesaBase):
    pass

class MesaPublic(MesaBase):
    id: uuid.UUID

class MesasPublic(SQLModel):
    data: list[MesaPublic]
    count: int

# ==========================================
#           VENTAS Y PEDIDOS
# ==========================================

# Modelo para recibir el pago
class VentaPago(SQLModel):
    metodo_pago: str 
    propina: float = 0.0
    descuento: float = 0.0 # Porcentaje 0-100
    # Datos Facturación
    cliente_nombre: str | None = None
    cliente_nit: str | None = None
    cliente_email: str | None = None
    cliente_telefono: str | None = None
    items_a_pagar: list[uuid.UUID] | None = None 

class DetalleVentaBase(SQLModel):
    cantidad: int
    precio_unitario: float
    subtotal: float
    comensal: str | None = Field(default="Mesa") 
    notas: str | None = Field(default=None) # Notas de preparación (ej: sin cebolla)

class DetalleVenta(DetalleVentaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    venta_id: uuid.UUID = Field(foreign_key="venta.id", ondelete="CASCADE")
    producto_id: uuid.UUID = Field(foreign_key="producto.id")
    
    venta: "Venta" = Relationship(back_populates="detalles")
    producto: "Producto" = Relationship()

class DetalleVentaCreate(SQLModel):
    producto_id: uuid.UUID
    cantidad: int
    comensal: str = "Mesa"
    notas: str | None = None

class DetalleVentaPublic(DetalleVentaBase):
    id: uuid.UUID 
    producto_nombre: str 

class VentaBase(SQLModel):
    mesa: str | None = Field(default=None)
    estado: str = Field(default="pendiente")
    tipo_cuenta: str = Field(default="unica")
    total: float = Field(default=0.0) # Subtotal consumo
    descuento_porcentaje: float = Field(default=0.0) # Descuento aplicado
    propina: float = Field(default=0.0)
    total_final: float = Field(default=0.0) # Lo que realmente pagó el cliente (Total - Descuento + Propina)
    fecha: datetime = Field(default_factory=datetime.utcnow)
    metodo_pago: str | None = Field(default=None)
    
    # Datos Cliente Factura
    cliente_nombre: str | None = Field(default=None)
    cliente_nit: str | None = Field(default=None)
    cliente_email: str | None = Field(default=None)
    cliente_telefono: str | None = Field(default=None)

class VentaCreate(VentaBase):
    detalles: list[DetalleVentaCreate]

class Venta(VentaBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    usuario_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    detalles: list["DetalleVenta"] = Relationship(back_populates="venta", cascade_delete=True)

class VentaPublic(VentaBase):
    id: uuid.UUID
    detalles: list[DetalleVentaPublic]

class VentasPublic(SQLModel):
    data: list[VentaPublic]
    count: int