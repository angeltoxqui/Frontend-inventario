// Configuración de la URL del Backend
const API_URL = "http://127.0.0.1:8000/api/v1";

/**
 * Función para iniciar sesión
 * @param {string} username - El email del usuario
 * @param {string} password - La contraseña (mínimo 8 caracteres)
 */
async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
        console.log("Intentando login con:", username); 

        // 1. Solicitar Token de Acceso
        const response = await fetch(`${API_URL}/login/access-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Credenciales incorrectas');
        }
        
        const data = await response.json();
        // Guardar el token en el navegador
        localStorage.setItem('token', data.access_token);
        
        // 2. Obtener Datos del Usuario (Quién soy y qué rol tengo)
        const userResp = await fetch(`${API_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const userData = await userResp.json();
        
        console.log("Datos usuario recibido:", userData);

        // Lógica de Roles:
        // Si es superusuario, forzamos el rol 'admin' aunque la base de datos diga otra cosa.
        // Si el rol viene vacío, asumimos 'mesero' por defecto para que no falle.
        let userRole = userData.rol;
        
        if (userData.is_superuser) {
            userRole = 'admin';
        } else if (!userRole) {
            userRole = 'mesero'; 
        }

        // Guardar datos clave en localStorage para usarlos en las otras páginas
        localStorage.setItem('user_role', userRole);
        localStorage.setItem('user_email', userData.email);
        localStorage.setItem('user_name', userData.full_name || 'Usuario');

        // 3. Redirigir a la pantalla correspondiente
        redirigirPorRol(userRole);
        
        return true;
    } catch (error) {
        console.error(error);
        alert("Error de Inicio de Sesión: " + error.message);
        return false;
    }
}

/**
 * El "Portero": Decide a dónde va cada usuario según su rol
 */
function redirigirPorRol(rol) {
    console.log("Redirigiendo usuario con rol:", rol);
    
    if (rol === 'admin') {
        window.location.href = 'admin.html';
    } else if (rol === 'mesero') {
        window.location.href = 'pos.html';
    } else if (rol === 'cocinero') {
        window.location.href = 'cocina.html';
    } else if (rol === 'cajero') {
        window.location.href = 'caja.html';
    } else {
        // Si el rol es desconocido, lo mandamos al POS por defecto
        window.location.href = 'pos.html';
    }
}

/**
 * Función genérica para hacer peticiones a la API (Fetch Wrapper)
 * Maneja automáticamente el Token y los errores.
 */
async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    
    // Si no hay token, mandamos al login (excepto si ya estamos ahí)
    if (!token && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
        return null;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const config = { method: method, headers: headers };
    
    if (body) {
        config.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Si el token expiró o es inválido (Error 401), cerrar sesión
        if (response.status === 401) { 
            logout(); 
            return null; 
        }

        // Si hay otro error (ej: 400 Bad Request, 422 Validation Error)
        if (!response.ok) {
            const errData = await response.json();
            const mensajeError = errData.detail || 'Error desconocido en el servidor';
            console.warn("API Error:", mensajeError);
            alert("⚠️ " + mensajeError); // Mostrar alerta al usuario
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión con el servidor.");
        return null;
    }
}

/**
 * Cerrar sesión: Borra datos y manda al login
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    window.location.href = 'login.html';
}

/**
 * Verificar si el usuario está autenticado al cargar una página
 */
function checkAuth() {
    // Si no hay token y NO estamos en la página de login, sacar al usuario
    if (!localStorage.getItem('token') && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
    }
}