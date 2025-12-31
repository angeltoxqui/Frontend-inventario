import { ArrowDownRight, ArrowUpRight, DollarSign, Package, ShoppingCart, AlertTriangle } from "lucide-react";

// Tipos de datos para nuestro inventario
export type ProductStatus = "En Stock" | "Stock Bajo" | "Sin Stock";

export interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  status: ProductStatus;
  lastUpdated: string;
  price: string;
  stock: number;
}

// Datos para la gráfica de ventas (Simulación de 7 meses)
export const chartData = [
  { name: "Ene", total: 1500 },
  { name: "Feb", total: 2300 },
  { name: "Mar", total: 3200 },
  { name: "Abr", total: 2900 },
  { name: "May", total: 4500 },
  { name: "Jun", total: 3800 },
  { name: "Jul", total: 5200 },
];

// Datos para la tabla de inventario
export const inventoryData: Product[] = [
  {
    id: "PROD-001",
    name: "Hamburguesa Clásica",
    category: "Comida Rápida",
    // Usamos una imagen por defecto o placeholder
    image: "https://ui.shadcn.com/avatars/01.png", 
    status: "En Stock",
    lastUpdated: "10 Mar 2024",
    price: "$12.000",
    stock: 120,
  },
  {
    id: "PROD-002",
    name: "Gaseosa 500ml",
    category: "Bebidas",
    image: "https://ui.shadcn.com/avatars/02.png",
    status: "Stock Bajo",
    lastUpdated: "11 Mar 2024",
    price: "$3.500",
    stock: 15,
  },
  {
    id: "PROD-003",
    name: "Papas Fritas Medianas",
    category: "Acompañamientos",
    image: "https://ui.shadcn.com/avatars/03.png",
    status: "En Stock",
    lastUpdated: "12 Mar 2024",
    price: "$5.000",
    stock: 80,
  },
  {
    id: "PROD-004",
    name: "Perro Caliente Especial",
    category: "Comida Rápida",
    image: "https://ui.shadcn.com/avatars/04.png",
    status: "Sin Stock",
    lastUpdated: "09 Mar 2024",
    price: "$15.000",
    stock: 0,
  },
  {
    id: "PROD-005",
    name: "Jugo Natural de Mora",
    category: "Bebidas",
    image: "https://ui.shadcn.com/avatars/05.png",
    status: "En Stock",
    lastUpdated: "10 Mar 2024",
    price: "$4.000",
    stock: 45,
  },
];

// Datos para las tarjetas de resumen (Stats Cards)
export const statsData = [
  {
    title: "Ventas Totales",
    value: "$45.2M",
    change: "+20.1% vs mes anterior",
    icon: DollarSign,
    trend: "up",
  },
  {
    title: "Productos Activos",
    value: "+50",
    change: "+4 nuevos esta semana",
    icon: Package,
    trend: "up",
  },
  {
    title: "Pedidos Pendientes",
    value: "12",
    change: "-2 vs ayer",
    icon: ShoppingCart,
    trend: "down",
  },
  {
    title: "Alertas de Stock",
    value: "3",
    change: "Productos en estado crítico",
    icon: AlertTriangle,
    trend: "warning", // Usaremos esto para darle color rojo/naranja
  },
];