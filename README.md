# SETOI - Sistema Integral de Gestión para Restaurantes

SETOI es una plataforma SaaS Multi-Tenant diseñada para transformar la gestión operativa y administrativa de restaurantes. Combina una interfaz moderna y ágil con una infraestructura robusta y segura, garantizando el cumplimiento normativo con la Facturación Electrónica DIAN.

## 🏗️ Arquitectura del Sistema

El sistema opera bajo una arquitectura híbrida Cloud-Native que maximiza la agilidad del frontend y la robustez del backend para procesos críticos.

```mermaid
graph TD
    User((Usuario))
    
    subgraph "Cliente"
        Frontend["Frontend PWA<br/>(React + Vite)"]
    end
    
    subgraph "Backend Core"
        Supabase["Supabase<br/>(PostgreSQL + Auth)"]
        EdgeFunctions["Edge Functions<br/>(Deno)"]
    end
    
    subgraph "Microservicios"
        Billing["Billing Microservice<br/>(Python FastAPI)"]
    end
    
    subgraph "Externos"
        DIAN[API DIAN / Factus]
    end

    User --> Frontend
    Frontend -- "Datos & Auth" --> Supabase
    Frontend -- "Lógica Negocio (Invocar)" --> EdgeFunctions
    Frontend -- "Facturación (Segura)" --> Billing
    EdgeFunctions -- "Leer/Escribir" --> Supabase
    Billing -- "Validación JWT" --> Supabase
    Billing -- "Emitir Factura" --> DIAN
```

## 🛠️ Tecnologías Detalladas

### Frontend (`/frontend`)
Una Progressive Web App (PWA) optimizada para operación táctil y rápida.

- **Core**: React 18, TypeScript, Vite.
- **UI/UX**: TailwindCSS, Shadcn/UI (Componentes accesibles), Lucide React (Iconos).
- **Estado & Datos**: TanStack Query (Gestión asíncrona robusta), Zustand (Estado global ligero).
- **Comunicación**: Cliente Supabase optimizado para invocar Edge Functions.
- **Formularios**: React Hook Form + Zod (Validación de esquemas).

### Core Backend (`/supabase`)
Infraestructura Serverless que maneja la persistencia y reglas de negocio.

- **Base de Datos**: PostgreSQL con extensiones.
- **Seguridad**: Row Level Security (RLS) para aislamiento estricto de tenants.
- **Auth**: Supabase Auth (JWT).
- **Lógica**: Edge Functions (Deno) para operaciones centralizadas (Inventario, Comandas).

### Billing Microservice (`/backend-facturacion`)
Servicio crítico encargado exclusivamente de la facturación electrónica.

- **Framework**: FastAPI (Async).
- **ORM**: SQLModel (SQLAlchemy + Pydantic).
- **Seguridad**:
    - Validación de JWT de Supabase.
    - Encriptación simétrica (Fernet) para credenciales sensibles (API Keys de Factus).
- **Integración**: Cliente HTTP asíncrono (`httpx`) para comunicación con Factus/DIAN.

## 📂 Estructura del Repositorio

```
/
├── frontend/               # Código fuente de la PWA (React)
│   ├── src/
│   │   ├── components/     # UI Kit (Shadcn)
│   │   ├── modules/        # Módulos de negocio (POS, KDS, Admin)
│   │   ├── routes/         # Definición de rutas
│   │   ├── services/       # Comunicación con Edge Functions y Billing
│   │   └── lib/            # Utilidades
│   ├── .env.example        # Plantilla de variables de entorno
│   └── package.json
│
├── backend-facturacion/    # Microservicio de Facturación (Python)
│   ├── app/
│   │   ├── core/           # Configuración y seguridad (Crypto, JWT)
│   │   ├── db/             # Modelos SQLModel y conexión
│   │   ├── routers/        # Endpoints de la API
│   │   └── services/       # Lógica con Factus (Facturación)
│   ├── scripts/            # Scripts de utilidad (Seed, Tests)
│   ├── main.py             # Punto de entrada de la aplicación
│   ├── requirements.txt
│   └── .env                # Variables (No commitear)
│
└── supabase/               # Configuración de Supabase
    ├── migrations/         # Esquema SQL y políticas RLS
    └── functions/          # Edge Functions (Deno)
```

## ✨ Funcionalidades Clave

- **Punto de Venta (POS)**: Interfaz táctil, ágil para toma de pedidos, manejo de mesas y áreas.
- **Comandas (KDS)**: Sincronización en tiempo real entre sala y cocina vía WebSockets.
- **Inventario**: Control de stock, recetas y escandallos gestionado por Edge Functions.
- **Facturación Electrónica**: Emisión directa a la DIAN, cálculo automático de impuestos (ICO/IVA) y manejo de contingencias.
- **Multi-Tenant Real**: Aislamiento total de datos por restaurante usando RLS.

## 🚀 Guía de Instalación Paso a Paso

### Prerrequisitos
- Node.js (v18+)
- Python (v3.11+)
- Supabase CLI (para entorno local)

### 1. Configuración del Core (Supabase)
Si deseas ejecutar Supabase localmente:

```bash
# Iniciar Supabase local
npx supabase start

# Al finalizar, te mostrará la API URL y las Keys (Anon/Service)
```

### 2. Configuración del Backend (Facturación)
Navega al directorio del backend y configura el entorno virtual:

```bash
cd backend-facturacion

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
.\venv\Scripts\activate
# Activar entorno (Linux/Mac)
# source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

Crea un archivo `.env` en `backend-facturacion/` basado en la siguiente plantilla:

```ini
# Configuración Factus / DIAN
FACTUS_BASE_URL=https://api-sandbox.factus.com.co
FACTUS_CLIENT_ID=tu_client_id
FACTUS_CLIENT_SECRET=tu_client_secret
FACTUS_EMAIL=tu_email_factus
FACTUS_PASSWORD=tu_password_factus

# Token y Seguridad
TOKEN_REFRESH_MARGIN_SECONDS=300
SUPABASE_JWT_SECRET=tu_supabase_jwt_secret
ENCRYPTION_KEY=clave_fernet_generada  # Generar con fernet.generate_key()

# Base de Datos
# RECOMENDADO: Cadena de conexión de Supabase (Transaction Mode puerto 6543)
DATABASE_URL="postgresql://postgres.[YOUR-USER]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# SOLO DEV (Aislado - No recomendado para integración):
# DATABASE_URL=sqlite+aiosqlite:///./billing.db
```

Ejecutar el servidor desde la raíz de `backend-facturacion`:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Configuración del Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
```

Edita `.env` con tus credenciales:

```ini
VITE_SUPABASE_URL="tu_supabase_url"
VITE_SUPABASE_ANON_KEY="tu_supabase_anon_key"

# URL del Microservicio de Facturación (Local o Producción)
VITE_BILLING_API_URL="http://localhost:8000/api/v1"
```

Iniciar la aplicación:

```bash
npm run dev
```

## 🔒 Seguridad y Arquitectura Multi-Tenant

### Row Level Security (RLS)
El sistema utiliza RLS nativo de PostgreSQL. Cada consulta a la base de datos (ya sea desde Edge Functions o el microservicio Python) incluye el contexto del usuario autenticado, asegurando que un restaurante **nunca** pueda acceder a los datos de otro.

### Manejo de Credenciales Sensibles
El microservicio de facturación almacena las credenciales de Factus de cada cliente. Estas **nunca** se guardan en texto plano.
- Se utiliza encriptación simétrica **Fernet** antes de persistir en la base de datos.
- Las llaves de desencriptación se gestionan mediante variables de entorno en el servidor, separadas de la base de datos.
- El servicio valida cada petición entrante verificando el JWT de Supabase.

## 🛠️ Scripts de Utilidad

El backend incluye scripts en `backend-facturacion/scripts/` para facilitar el desarrollo:

- **`seed_restaurant.py`**: Crea un restaurante de prueba con credenciales Sandbox.
  - Uso: `python -m scripts.seed_restaurant`

- **`test_sync.py`**: Prueba de conexión y sincronización de rangos de numeración.
  - Uso: `python -m scripts.test_sync` (Requiere servidor corriendo).