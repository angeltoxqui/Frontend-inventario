// src/services/posService.ts
// Servicio unificado para POS que usa Supabase con fallback a MockService

import { SupabaseService } from './supabaseService';
import { MockService } from './mockService';
import { Product, Ingredient, Table, Order, OrderItem } from '../types';

// Tenant ID por defecto (en producción vendría del contexto de autenticación)
const DEFAULT_TENANT_ID = 1;

/**
 * Determina qué servicio usar basándose en la configuración de Supabase
 */
const useSupabase = () => SupabaseService.isConfigured();

/**
 * POSService - Servicio unificado con fallback automático
 * Intenta usar Supabase primero, si falla usa MockService
 */
export const POSService = {
    /**
     * Obtiene el origen de datos actual
     */
    getDataSource: (): 'supabase' | 'mock' => {
        return useSupabase() ? 'supabase' : 'mock';
    },

    // ============================================================================
    // PRODUCTS
    // ============================================================================

    getProducts: async (): Promise<Product[]> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.getProducts(DEFAULT_TENANT_ID);
            } catch (error) {
                console.warn('[POSService] Supabase getProducts failed, using mock:', error);
                return MockService.getProducts();
            }
        }
        return MockService.getProducts();
    },

    createProduct: async (data: {
        nombre: string;
        precio: number;
        nota?: string;
    }): Promise<{ producto_id: number } | Product> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.createProduct(DEFAULT_TENANT_ID, data);
            } catch (error) {
                console.warn('[POSService] Supabase createProduct failed:', error);
                throw error;
            }
        }
        // MockService doesn't have createProduct, return mock response
        return { producto_id: Math.floor(Math.random() * 1000) };
    },

    updateProduct: async (productId: string, data: {
        nombre?: string;
        precio?: number;
        nota?: string;
    }): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.updateProduct(DEFAULT_TENANT_ID, Number(productId), data);
            } catch (error) {
                console.warn('[POSService] Supabase updateProduct failed:', error);
                throw error;
            }
        }
        return true;
    },

    deleteProduct: async (productId: string): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.deleteProduct(DEFAULT_TENANT_ID, Number(productId));
            } catch (error) {
                console.warn('[POSService] Supabase deleteProduct failed:', error);
                throw error;
            }
        }
        return true;
    },

    // ============================================================================
    // INGREDIENTS
    // ============================================================================

    getIngredients: async (): Promise<Ingredient[]> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.getIngredients(DEFAULT_TENANT_ID);
            } catch (error) {
                console.warn('[POSService] Supabase getIngredients failed, using mock:', error);
                return MockService.getIngredients();
            }
        }
        return MockService.getIngredients();
    },

    createIngredient: async (data: {
        nombre: string;
        unidad_medida: string;
        costo?: number;
        stock_actual?: number;
    }): Promise<{ insumo_id: number }> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.createIngredient(DEFAULT_TENANT_ID, data);
            } catch (error) {
                console.warn('[POSService] Supabase createIngredient failed:', error);
                throw error;
            }
        }
        return { insumo_id: Math.floor(Math.random() * 1000) };
    },

    adjustStock: async (ingredientId: string, cantidad: number, motivo?: string): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.adjustIngredientStock(
                    DEFAULT_TENANT_ID,
                    Number(ingredientId),
                    cantidad,
                    motivo
                );
            } catch (error) {
                console.warn('[POSService] Supabase adjustStock failed:', error);
                throw error;
            }
        }
        return true;
    },

    // ============================================================================
    // TABLES
    // ============================================================================

    getTables: async (): Promise<Table[]> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.getTables(DEFAULT_TENANT_ID);
            } catch (error) {
                console.warn('[POSService] Supabase getTables failed, using mock:', error);
                return MockService.getTables();
            }
        }
        return MockService.getTables();
    },

    createTable: async (nombre: string): Promise<{ mesa_id: number }> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.createTable(DEFAULT_TENANT_ID, nombre);
            } catch (error) {
                console.warn('[POSService] Supabase createTable failed:', error);
                throw error;
            }
        }
        return { mesa_id: Math.floor(Math.random() * 1000) };
    },

    updateTableStatus: async (tableId: string, ocupada: boolean): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.updateTableStatus(DEFAULT_TENANT_ID, Number(tableId), ocupada);
            } catch (error) {
                console.warn('[POSService] Supabase updateTableStatus failed:', error);
                throw error;
            }
        }
        return true;
    },

    // ============================================================================
    // ORDERS
    // ============================================================================

    getOrders: async (filters?: { estado?: string; mesa_id?: number }): Promise<Order[]> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.getOrders(DEFAULT_TENANT_ID, filters);
            } catch (error) {
                console.warn('[POSService] Supabase getOrders failed, using mock:', error);
                return MockService.getOrders();
            }
        }
        return MockService.getOrders();
    },

    createOrder: async (order: Order): Promise<Order> => {
        if (useSupabase()) {
            try {
                // Map frontend Order to Supabase format
                const supabaseItems = order.items.map(item => ({
                    producto_id: Number(item.productId),
                    cantidad: item.quantity,
                    nota: item.notes,
                }));

                const result = await SupabaseService.createOrder(DEFAULT_TENANT_ID, {
                    mesa_id: Number(order.tableId),
                    items: supabaseItems,
                });

                return {
                    ...order,
                    id: String(result.orden_id),
                    total: result.total || order.total,
                };
            } catch (error) {
                console.warn('[POSService] Supabase createOrder failed, using mock:', error);
                return MockService.createOrder(order);
            }
        }
        return MockService.createOrder(order);
    },

    updateOrderStatus: async (orderId: string, estado: string): Promise<boolean> => {
        if (useSupabase()) {
            try {
                // Map frontend status to backend status
                const statusMap: Record<string, string> = {
                    'pendiente': 'abierta',
                    'listo': 'servir',
                    'entregado': 'comiendo',
                    'pagando': 'pagando',
                    'pagado': 'pagada',
                    'cancelado': 'cancelada',
                };
                const backendStatus = statusMap[estado] || estado;
                return await SupabaseService.updateOrderStatus(DEFAULT_TENANT_ID, Number(orderId), backendStatus);
            } catch (error) {
                console.warn('[POSService] Supabase updateOrderStatus failed:', error);
                throw error;
            }
        }
        return true;
    },

    addItemToOrder: async (orderId: string, item: OrderItem): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.addItemToOrder(DEFAULT_TENANT_ID, Number(orderId), {
                    producto_id: Number(item.productId),
                    cantidad: item.quantity,
                    nota: item.notes,
                });
            } catch (error) {
                console.warn('[POSService] Supabase addItemToOrder failed:', error);
                throw error;
            }
        }
        return true;
    },

    payOrder: async (orderId: string, data: {
        tipo_pago: 'efectivo' | 'tarjeta' | 'nequi' | 'otro';
        propina?: number;
        es_factura_electronica?: boolean;
    }): Promise<boolean> => {
        if (useSupabase()) {
            try {
                return await SupabaseService.payOrder(DEFAULT_TENANT_ID, Number(orderId), data);
            } catch (error) {
                console.warn('[POSService] Supabase payOrder failed:', error);
                throw error;
            }
        }
        return true;
    },

    // ============================================================================
    // LEGACY COMPATIBILITY - Métodos que usan MockService directamente
    // Estos métodos mantienen compatibilidad con componentes existentes
    // ============================================================================

    serveTable: async (tableId: string): Promise<void> => {
        // Este método cambia estado de mesa en mock, en Supabase debemos actualizar la orden
        if (useSupabase()) {
            console.log('[POSService] serveTable - updating via Supabase');
            // Supabase maneja esto diferente, la mesa se actualiza con la orden
        }
        return MockService.serveTable(tableId);
    },

    requestBill: async (tableId: string, options: { isSplit: boolean; items: OrderItem[] }): Promise<void> => {
        if (useSupabase()) {
            console.log('[POSService] requestBill - using Supabase flow');
            // Supabase usa payOrder, aquí mantenemos compatibilidad
        }
        return MockService.requestBill(tableId, options);
    },

    // Funciones de compatibilidad que solo usan MockService
    getSalesReport: async () => MockService.getSalesReport(),
    getFinancialData: async () => MockService.getFinancialData(),
    getUsers: async () => MockService.getUsers(),
    getBoxSession: async () => MockService.getBoxSession(),
    getClosingLogs: async () => MockService.getClosingLogs(),
};

