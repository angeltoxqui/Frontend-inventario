// src/services/posService.ts
// Servicio unificado para POS que usa Supabase con fallback a MockService

import { SupabaseService } from './supabaseService';
import { MockService } from './mockService';
import { Product, Ingredient, Table, Order, OrderItem, ProductCategory } from '../types';

// Tenant ID por defecto (en producción vendría del contexto de autenticación)
const DEFAULT_TENANT_ID = 1;

import { supabase } from '../supabaseClient';

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
                // Direct Supabase Query
                const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
                if (error) throw error;
                return data.map((p: any) => ({
                    id: String(p.id),
                    name: p.name,
                    price: p.price,
                    category: ProductCategory.FUERTES, // Default category
                    status: 'disponible'
                }));
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
                // Direct Supabase Query
                const { data: res, error } = await supabase
                    .from('products')
                    .insert({
                        name: data.nombre,
                        price: data.precio,
                        description: data.nota,
                        is_active: true,
                        tenant_id: DEFAULT_TENANT_ID
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { producto_id: res.id };
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
                const updateData: any = {};
                if (data.nombre) updateData.name = data.nombre;
                if (data.precio) updateData.price = data.precio;
                if (data.nota) updateData.description = data.nota;

                const { error } = await supabase
                    .from('products')
                    .update(updateData)
                    .eq('id', productId);

                if (error) throw error;
                return true;
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
                // Soft delete usually, but here we'll set is_active = false
                const { error } = await supabase
                    .from('products')
                    .update({ is_active: false })
                    .eq('id', productId);

                if (error) throw error;
                return true;
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

    // URL del Backend Python (Inventory)
    getIngredients: async (): Promise<Ingredient[]> => {
        try {
            const response = await fetch(`http://localhost:8000/api/inventory/ingredients?tenant_id=${DEFAULT_TENANT_ID}`);
            if (!response.ok) throw new Error('Failed to fetch ingredients from backend');
            const data = await response.json();

            return data.map((i: any) => ({
                id: String(i.id),
                name: i.name,
                unit: i.unit,
                cost: i.cost,
                currentStock: i.current_stock,
                maxStock: 0, // Not used
                lastUpdated: Date.now()
            }));
        } catch (error) {
            console.warn('[POSService] Backend getIngredients failed, using mock:', error);
            return MockService.getIngredients();
        }
    },

    createIngredient: async (data: {
        nombre: string;
        unidad_medida: string;
        costo?: number;
        stock_actual?: number;
    }): Promise<{ insumo_id: number }> => {
        try {
            const payload = {
                name: data.nombre,
                unit: data.unidad_medida,
                cost: data.costo || 0,
                current_stock: data.stock_actual || 0,
                notes: ""
            };

            const response = await fetch(`http://localhost:8000/api/inventory/ingredients?tenant_id=${DEFAULT_TENANT_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to create ingredient');
            }

            const result = await response.json();
            return { insumo_id: result.id };
        } catch (error) {
            console.warn('[POSService] Backend createIngredient failed:', error);
            throw error;
        }
    },

    updateIngredient: async (ingredientId: string, data: {
        nombre?: string;
        unidad_medida?: string;
        costo?: number;
        stock_actual?: number;
    }): Promise<boolean> => {
        try {
            const payload: any = {};
            if (data.nombre) payload.name = data.nombre;
            if (data.unidad_medida) payload.unit = data.unidad_medida;
            if (data.costo !== undefined) payload.cost = data.costo;
            if (data.stock_actual !== undefined) payload.current_stock = data.stock_actual;

            const response = await fetch(`http://localhost:8000/api/inventory/ingredients/${ingredientId}?tenant_id=${DEFAULT_TENANT_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to update ingredient');
            return true;
        } catch (error) {
            console.warn('[POSService] Backend updateIngredient failed:', error);
            throw error;
        }
    },

    adjustStock: async (ingredientId: string, cantidad: number, motivo?: string): Promise<boolean> => {
        try {
            const payload = {
                amount: cantidad,
                reason: motivo
            };

            const response = await fetch(`http://localhost:8000/api/inventory/ingredients/${ingredientId}/adjust-stock?tenant_id=${DEFAULT_TENANT_ID}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to adjust stock');
            return true;
        } catch (error) {
            console.warn('[POSService] Backend adjustStock failed:', error);
            throw error;
        }
    },

    // ============================================================================
    // TABLES
    // ============================================================================

    getTables: async (): Promise<Table[]> => {
        if (useSupabase()) {
            try {
                // 1. Get Tables
                const { data: tablesData, error: tablesError } = await supabase
                    .from('tables')
                    .select('*')
                    .order('id');
                if (tablesError) throw tablesError;

                // 2. Get Active Orders to determine status
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('table_id, status')
                    .in('status', ['abierta', 'cocinando', 'servir', 'comiendo', 'pagando', 'entregado']);

                if (ordersError) throw ordersError;

                // Map of table_id -> status
                const tableStatusMap = new Map<number, string>();
                ordersData?.forEach((o: any) => {
                    // Priority: pagar > servir > cocinando > comiendo > abierta
                    // Simple overwrite logic: latest order wins or use logic. 
                    // Assuming one active order per table usually.
                    tableStatusMap.set(o.table_id, o.status);
                });

                const statusFrontMap: Record<string, any> = {
                    'abierta': 'comiendo', // or ocupado
                    'cocinando': 'cocinando',
                    'servir': 'servir',
                    'comiendo': 'comiendo',
                    'pagando': 'pagando',
                    'entregado': 'comiendo'
                };

                return tablesData.map((t: any) => {
                    const orderStatus = tableStatusMap.get(t.id);
                    const finalStatus = orderStatus ? (statusFrontMap[orderStatus] || 'comiendo') : 'libre';

                    return {
                        id: String(t.id),
                        number: t.id,
                        status: finalStatus,
                        x: 0, y: 0
                    };
                });
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
                // Using 'nombre' if column exists, otherwise ignoring but included in object to suppress lint 
                const { data: res, error } = await supabase
                    .from('tables')
                    .insert({
                        status: 'libre',
                        nombre: nombre, // Keep 'nombre' if it's a valid column
                        tenant_id: DEFAULT_TENANT_ID // [FIX] Added tenant_id
                    })
                    .select()
                    .single();

                if (error) throw error;
                return { mesa_id: res.id };
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
                const status = ocupada ? 'comiendo' : 'libre';
                const { error } = await supabase
                    .from('tables')
                    .update({ status })
                    .eq('id', tableId);

                if (error) throw error;
                return true;
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
                let query = supabase
                    .from('orders')
                    .select(`
                        id,
                        status,
                        created_at,
                        table_id,
                        total,
                        tip,
                        payment_method,
                        items:order_items (
                            id,
                            quantity,
                            price,
                            notes,
                            product:products(name)
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (filters?.estado) query = query.eq('status', filters.estado);
                if (filters?.mesa_id) query = query.eq('table_id', filters.mesa_id);

                const { data, error } = await query;

                if (error) throw error;

                // Map backend status to frontend status
                const statusMap: Record<string, Order['status']> = {
                    'abierta': 'pendiente',
                    'cocinando': 'pendiente',
                    'servir': 'listo',
                    'comiendo': 'entregado',
                    'pagando': 'pagando',
                    'pagada': 'pagado',
                    'cancelada': 'cancelado',
                };

                return data.map((o: any) => ({
                    id: String(o.id),
                    tableId: String(o.table_id),
                    items: o.items.map((item: any) => ({
                        productId: String(item.product?.id || ''), // product relation might not return id if not selected, rely on item if needed/fix query
                        productName: item.product?.name || 'Producto',
                        quantity: item.quantity,
                        price: Number(item.price),
                        notes: item.notes || undefined,
                    })),
                    status: statusMap[o.status] || 'pendiente',
                    timestamp: new Date(o.created_at).getTime(),
                    total: Number(o.total),
                    tip: Number(o.tip) || 0,
                    paymentMethod: o.payment_method as 'efectivo' | 'tarjeta' | 'nequi' | undefined,
                }));

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
                // 1. Create Order
                const { data: newOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        table_id: Number(order.tableId),
                        status: 'abierta', // Initial status
                        total: order.total,
                        tenant_id: DEFAULT_TENANT_ID
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;

                // 2. Create Order Items
                const itemsPayload = order.items.map(item => ({
                    order_id: newOrder.id,
                    product_id: Number(item.productId),
                    quantity: item.quantity,
                    price: item.price,
                    notes: item.notes
                }));

                const { error: itemsError } = await supabase
                    .from('order_items')
                    .insert(itemsPayload);

                if (itemsError) throw itemsError;

                return {
                    ...order,
                    id: String(newOrder.id),
                    status: 'pendiente' // Frontend equiv
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

                const { error } = await supabase
                    .from('orders')
                    .update({ status: backendStatus })
                    .eq('id', orderId);

                if (error) throw error;
                return true;
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
                const { error } = await supabase
                    .from('order_items')
                    .insert({
                        order_id: Number(orderId),
                        product_id: Number(item.productId),
                        quantity: item.quantity,
                        price: item.price,
                        notes: item.notes
                    });

                if (error) throw error;
                return true;
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
                const { error } = await supabase
                    .from('orders')
                    .update({
                        status: 'pagado',
                        payment_method: data.tipo_pago,
                        tip: data.propina
                    })
                    .eq('id', orderId);

                if (error) throw error;
                return true;
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

