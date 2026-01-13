# 🍽️ Setoi - Sistema de Gestión de Restaurantes

![Estado del Proyecto](https://img.shields.io/badge/Estado-Demo%20Beta-blue)
![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Vite%20%7C%20Tailwind-green)

**Setoi** es una solución integral y moderna para la administración de restaurantes. Diseñada para cubrir todo el flujo operativo: desde la toma de pedidos en mesa, pasando por la visualización en cocina, hasta la facturación y cierre de caja.

Este proyecto es una **DEMO INTERACTIVA** que funciona completamente en el navegador (Frontend-Only) simulando un backend robusto mediante servicios locales.

---

## 🚀 Características Principales

### 🖥️ Para la Administración
* **Dashboard en Tiempo Real:** Métricas de ventas, ocupación y pedidos del día.
* **Gestión de Inventario:** Control de insumos, stock y alertas.
* **RRHH:** Gestión de turnos y roles de empleados.
* **Reportes:** Análisis financiero visual.

### 📱 Para la Operación (Punto de Venta)
* **Mapa de Mesas Interactivo:** Visualización del estado de las mesas (Libre, Cocinando, Servido, Pagando) en tiempo real.
* **Toma de Pedidos (POS):** Carrito de compras rápido e intuitivo.
* **Modo Oscuro/Claro:** Interfaz adaptable a ambientes con poca luz.

### 👨‍🍳 Para la Cocina (KDS)
* **Comandas Digitales:** Recepción inmediata de pedidos desde el POS.
* **Control de Estados:** Marcar platos como "En Preparación" o "Listos para Servir".

### 💰 Para Caja y Facturación
* **Cobro Flexible:** División de cuentas, múltiples métodos de pago (Efectivo, Tarjeta, Transferencia).
* **Cierre de Caja:** Arqueo de caja y control de flujo de efectivo.

---

## 🔑 Credenciales de Acceso (Demo)

Puedes iniciar sesión con cualquiera de los siguientes usuarios preconfigurados para explorar los distintos módulos del sistema:

| Rol | Usuario | Pin (Opcional) | Acceso a |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `owner` | `0000` | Acceso Total + Configuración Global |
| **Administrador** | `admin` | `1234` | Dashboard, Inventario, RRHH, Reportes |
| **Mesero** | `juan` | `1111` | Sala, POS (Pedidos), Estado de Mesas |
| **Chef** | `maria` | `2222` | Monitor de Cocina (KDS) |
| **Cajero** | `pedro` | `3333` | Módulo de Caja y Facturación |

> **Nota:** Al ser una demo, los datos se guardan en el almacenamiento local de tu navegador (`localStorage`). Si limpias la caché, el sistema volverá a su estado inicial.

---

## 🛠️ Tecnologías Utilizadas

Este proyecto destaca por el uso de tecnologías modernas y buenas prácticas de desarrollo frontend:

* **Core:** React 18, TypeScript, Vite.
* **Enrutamiento:** `@tanstack/react-router` (File-based routing seguro).
* **Estado y Datos:** `@tanstack/react-query` (Gestión eficiente de estado asíncrono).
* **Estilos:** Tailwind CSS, Shadcn/ui (Componentes accesibles y personalizables).
* **Iconografía:** Lucide React.
* **Simulación:** MockService personalizado para lógica de negocio sin backend.

---

## 💻 Instalación y Ejecución Local


1.  **Instalar dependencias**
    ```bash
    npm install
    ```

2.  **Correr el servidor de desarrollo**
    ```bash
    npm run dev
    ```

3.  Abrir `http://localhost:5173` en tu navegador.

---

#