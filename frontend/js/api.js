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

        // Lógica de Roles
        let userRole = userData.rol;
        if (userData.is_superuser) {
            userRole = 'admin';
        } else if (!userRole) {
            userRole = 'mesero'; 
        }

        // Guardar datos clave en localStorage
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
    if (rol === 'admin') window.location.href = 'admin.html';
    else if (rol === 'mesero') window.location.href = 'pos.html';
    else if (rol === 'cocinero') window.location.href = 'cocina.html';
    else if (rol === 'cajero') window.location.href = 'caja.html';
    else window.location.href = 'pos.html';
}

/**
 * Fetch Wrapper genérico
 */
async function apiFetch(endpoint, method = 'GET', body = null) {
    const token = localStorage.getItem('token');
    
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

        if (response.status === 401) { 
            logout(); 
            return null; 
        }

        if (!response.ok) {
            const errData = await response.json();
            const mensajeError = errData.detail || 'Error desconocido en el servidor';
            console.warn("API Error:", mensajeError);
            alert("⚠️ " + mensajeError);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error("Error de conexión:", error);
        alert("Error de conexión con el servidor.");
        return null;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    window.location.href = 'login.html';
}

function checkAuth() {
    if (!localStorage.getItem('token') && !window.location.href.includes('login.html')) {
        window.location.href = 'login.html';
    }
}

// --- LÓGICA DE TEMA (CLARO / OSCURO) GLOBAL ---
function initTheme() {
    const savedTheme = localStorage.getItem('gastro_theme');
    const iconBtn = document.getElementById('theme-icon');
    
    // Aplicar tema guardado
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(iconBtn) iconBtn.innerText = 'dark_mode'; // Icono de Luna
    } else {
        document.body.classList.remove('light-mode');
        if(iconBtn) iconBtn.innerText = 'light_mode'; // Icono de Sol
    }
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-mode');
    const iconBtn = document.getElementById('theme-icon');
    
    if (isLight) {
        localStorage.setItem('gastro_theme', 'light');
        if(iconBtn) iconBtn.innerText = 'dark_mode';
    } else {
        localStorage.setItem('gastro_theme', 'dark');
        if(iconBtn) iconBtn.innerText = 'light_mode';
    }
}

// Inicializar tema al cargar cualquier página que use api.js
document.addEventListener('DOMContentLoaded', initTheme);