import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';

// Importa TUS componentes subidos
import { Login } from './routes/login';
import { AdminPanel } from './routes/_layout/admin';
import { POS } from './routes/_layout/pos';
import { Cocina } from './routes/_layout/cocina';
import { Caja } from './routes/_layout/caja';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/cocina" element={<Cocina />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;