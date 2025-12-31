// Tipos de datos para nuestras órdenes
export type OrderStatus = "pending" | "served" | "paid";

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  table: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  timestamp: string;
}

// Clave para guardar en el navegador
const STORAGE_KEY = "gastro_pos_orders";

// --- FUNCIONES DEL SISTEMA ---

// 1. Obtener todas las órdenes
export const getOrders = (): Order[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// 2. Crear nueva orden (Desde POS)
export const createOrder = (table: number, items: OrderItem[]) => {
  const orders = getOrders();
  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const newOrder: Order = {
    id: `ORD-${Date.now().toString().slice(-4)}`, // ID único simple
    table,
    items,
    total,
    status: "pending", // Nace pendiente para cocina
    timestamp: new Date().toLocaleTimeString(),
  };

  orders.push(newOrder);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  // Disparamos evento para actualizar otras pestañas
  window.dispatchEvent(new Event("storage"));
  return newOrder;
};

// 3. Actualizar estado (Cocina -> Caja -> Finalizado)
export const updateOrderStatus = (orderId: string, status: OrderStatus) => {
  const orders = getOrders();
  const updatedOrders = orders.map((order) => 
    order.id === orderId ? { ...order, status } : order
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
  window.dispatchEvent(new Event("storage"));
};