// src/services/supabaseService.ts
// Cliente para consumir las Edge Functions de Supabase

import { Store, SuperAdminUser, MigrationLog, Product, Ingredient, Table, Order, ProductCategory, TableStatus } from '../types';

// Configuración - estas variables deben estar en .env
// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

import { supabase } from '../supabaseClient';

/**
 * Llamar a una Edge Function de Supabase
 */
async function callEdgeFunction<T>(
    functionName: string,
    payload: Record<string, unknown>
): Promise<T> {
    const { data: responseData, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        method: 'POST',
    });

    if (error) {
        throw error;
    }

    // El backend devuelve { success: boolean, ...data, error?: string }
    // A veces el invoke exitoso devuelve data directamente, pero según nuestro backend
    // siempre devuelve un JSON.

    // Verificamos si la respuesta del backend indica error de negocio
    if (responseData && typeof responseData === 'object' && 'success' in responseData && !responseData.success) {
        throw new Error((responseData as any).error || `Error en ${functionName}`);
    }

    return responseData as T;
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

interface TenantListResponse {
    success: boolean;
    action: 'list';
    data: Array<{
        tenant_id: number;
        schema_name: string;
        name: string;
        owner_email: string;
        owner_name: string | null;
        plan: 'basic' | 'pro' | 'enterprise';
        status: 'active' | 'suspended' | 'pending';
        created_at: string;
        meta?: Record<string, unknown>;
    }>;
}

interface TenantCreateResponse {
    success: boolean;
    action: 'create';
    tenant_id: number;
    schema_name: string;
    owner_email: string;
    data: Record<string, unknown>;
}

interface TenantOperationResponse {
    success: boolean;
    action: string;
    tenant_id: number;
    data?: Record<string, unknown>;
    error?: string;
}

export const SupabaseService = {
    /**
     * Obtener lista de tenants (tiendas)
     */
    getTenants: async (): Promise<Store[]> => {
        const response = await callEdgeFunction<TenantListResponse>('tenant_management', {
            action: 'list',
        });

        // Mapear respuesta de Supabase a estructura Store del frontend
        return response.data.map(tenant => ({
            tenant_id: tenant.tenant_id,
            schema_name: tenant.schema_name,
            name: tenant.name,
            adminName: tenant.owner_name || 'Sin nombre',
            adminEmail: tenant.owner_email,
            status: tenant.status === 'pending' ? 'suspended' : tenant.status as 'active' | 'suspended',
            plan: tenant.plan,
            nextPayment: tenant.meta?.nextPayment as string || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            revenue: tenant.meta?.revenue as number || 0,
        }));
    },

    /**
     * Crear nuevo tenant
     */
    createTenant: async (data: {
        name: string;
        adminEmail: string;
        adminName?: string;
        plan?: 'basic' | 'pro' | 'enterprise';
        owner_password?: string;
    }): Promise<TenantCreateResponse> => {
        return callEdgeFunction<TenantCreateResponse>('tenant_management', {
            action: 'create',
            name: data.name,
            owner_email: data.adminEmail,
            owner_name: data.adminName || null,
            plan: data.plan || 'basic',
        });
    },

    /**
     * Pausar/Suspender tenant
     */
    pauseTenant: async (tenantId: number, reason?: string): Promise<TenantOperationResponse> => {
        return callEdgeFunction<TenantOperationResponse>('tenant_management', {
            action: 'pause',
            tenant_id: tenantId,
            reason,
        });
    },

    /**
     * Reanudar tenant
     */
    resumeTenant: async (tenantId: number): Promise<TenantOperationResponse> => {
        return callEdgeFunction<TenantOperationResponse>('tenant_management', {
            action: 'resume',
            tenant_id: tenantId,
        });
    },

    /**
     * Actualizar tenant
     */
    updateTenant: async (
        tenantId: number,
        data: { name?: string; plan?: 'basic' | 'pro' | 'enterprise'; meta?: Record<string, unknown> }
    ): Promise<TenantOperationResponse> => {
        return callEdgeFunction<TenantOperationResponse>('tenant_management', {
            action: 'update',
            tenant_id: tenantId,
            ...data,
        });
    },

    // ============================================================================
    // SUPERADMIN MANAGEMENT
    // ============================================================================

    /**
     * Obtener lista de superadmins
     */
    getSuperAdmins: async (): Promise<SuperAdminUser[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            action: 'list';
            data: Array<{
                user_id: string;
                email: string;
                name: string | null;
                is_active: boolean;
                created_at: string;
            }>;
        }>('superadmin_management', { action: 'list' });

        return response.data.map(sa => ({
            user_id: sa.user_id,
            email: sa.email,
            display: sa.name || sa.email.split('@')[0],
            role: 'dev' as const, // El backend no tiene distinto role, asumimos dev
            is_active: sa.is_active,
            created_at: sa.created_at,
        }));
    },

    /**
     * Crear superadmin
     */
    createSuperAdmin: async (data: { email: string; display?: string; role?: 'dev' | 'admin' }): Promise<unknown> => {
        return callEdgeFunction('superadmin_management', {
            action: 'create',
            email: data.email,
            name: data.display || null,
        });
    },

    /**
     * Pausar superadmin
     */
    pauseSuperAdmin: async (userId: string, reason?: string): Promise<unknown> => {
        return callEdgeFunction('superadmin_management', {
            action: 'pause',
            user_id: userId,
            reason,
        });
    },

    /**
     * Reactivar superadmin
     */
    resumeSuperAdmin: async (userId: string): Promise<unknown> => {
        return callEdgeFunction('superadmin_management', {
            action: 'resume',
            user_id: userId,
        });
    },

    // ============================================================================
    // SCHEMA MANAGEMENT (Migraciones)
    // ============================================================================

    /**
     * Obtener estado de migraciones de un schema
     */
    getSchemaStatus: async (schemaName: string): Promise<MigrationLog[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            action: 'status';
            schema_name: string;
            data: {
                total_migrations: number;
                all_migrations: Array<{
                    id?: string;
                    migration_name: string;
                    applied_at: string;
                    applied_by?: string;
                    checksum?: string;
                    status?: string;
                }>;
            };
        }>('schema_management', {
            action: 'status',
            schema_name: schemaName,
        });

        return response.data.all_migrations.map((m, idx) => ({
            id: m.id || `migration-${idx}`,
            migration_name: m.migration_name,
            applied_at: m.applied_at,
            status: 'success' as const,
            tenants_applied: 1,
        }));
    },

    /**
     * Obtener todas las migraciones (placeholder - necesita schema principal)
     */
    getMigrations: async (): Promise<MigrationLog[]> => {
        // Por ahora retornamos array vacío hasta definir schema principal
        // En producción, esto debería iterar sobre todos los schemas o usar un schema público
        console.warn('[SupabaseService] getMigrations necesita definir schema principal para obtener migraciones globales');
        return [];
    },

    // ============================================================================
    // UTILIDADES
    // ============================================================================

    /**
     * Verificar si Supabase está configurado
     */
    /**
     * Verificar si Supabase está configurado
     */
    isConfigured: () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),

    /**
     * Trigger de migración (placeholder - requiere implementación backend)
     */
    triggerMigration: async (_tenantId: number): Promise<string> => {
        console.warn('[SupabaseService] triggerMigration no está implementado en el backend');
        return 'not-implemented';
    },

    /**
     * Exportar backup (placeholder - requiere implementación backend)
     */
    exportBackup: async (_tenantId: number): Promise<string> => {
        console.warn('[SupabaseService] exportBackup no está implementado en el backend');
        return '#';
    },

    /**
     * Eliminar tenant (placeholder - requiere implementación backend)
     */
    deleteTenant: async (_tenantId: number): Promise<boolean> => {
        console.warn('[SupabaseService] deleteTenant no está implementado en el backend');
        return false;
    },

    // ============================================================================
    // PRODUCT MANAGEMENT
    // ============================================================================

    /**
     * Obtener lista de productos
     */
    getProducts: async (tenantId: number): Promise<Product[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            action: 'list';
            data: Array<{
                id: number;
                nombre: string;
                precio: number;
                nota: string | null;
            }>;
        }>('product_management', {
            action: 'list',
            tenant_id: tenantId,
        });

        return response.data.map(p => ({
            id: String(p.id),
            name: p.nombre,
            price: Number(p.precio),
            category: 'fuertes' as ProductCategory, // Default category
            status: 'disponible',
        }));
    },

    /**
     * Crear producto
     */
    createProduct: async (tenantId: number, data: {
        nombre: string;
        precio: number;
        nota?: string;
        receta?: Array<{ insumo_id: number; cantidad: number }>;
    }): Promise<{ producto_id: number }> => {
        const response = await callEdgeFunction<{
            success: boolean;
            producto_id: number;
        }>('product_management', {
            action: 'create',
            tenant_id: tenantId,
            ...data,
        });
        return { producto_id: response.producto_id };
    },

    /**
     * Actualizar producto
     */
    updateProduct: async (tenantId: number, productoId: number, data: {
        nombre?: string;
        precio?: number;
        nota?: string;
    }): Promise<boolean> => {
        await callEdgeFunction('product_management', {
            action: 'update',
            tenant_id: tenantId,
            producto_id: productoId,
            ...data,
        });
        return true;
    },

    /**
     * Eliminar producto
     */
    deleteProduct: async (tenantId: number, productoId: number): Promise<boolean> => {
        await callEdgeFunction('product_management', {
            action: 'delete',
            tenant_id: tenantId,
            producto_id: productoId,
        });
        return true;
    },

    // ============================================================================
    // INGREDIENT MANAGEMENT
    // ============================================================================

    /**
     * Obtener lista de ingredientes
     */
    getIngredients: async (tenantId: number): Promise<Ingredient[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            data: Array<{
                id: number;
                nombre: string;
                unidad_medida: string;
                costo: number;
                stock_actual: number;
                nota: string | null;
            }>;
        }>('ingredient_management', {
            action: 'list',
            tenant_id: tenantId,
        });

        return response.data.map(i => ({
            id: String(i.id),
            name: i.nombre,
            unit: i.unidad_medida as 'kg' | 'lt' | 'und' | 'gr' | 'ml',
            cost: Number(i.costo),
            currentStock: Number(i.stock_actual),
            maxStock: Number(i.stock_actual) * 2, // Estimate max stock
            lastUpdated: Date.now(),
        }));
    },

    /**
     * Crear ingrediente
     */
    createIngredient: async (tenantId: number, data: {
        nombre: string;
        unidad_medida: string;
        costo?: number;
        stock_actual?: number;
        nota?: string;
    }): Promise<{ insumo_id: number }> => {
        const response = await callEdgeFunction<{
            success: boolean;
            insumo_id: number;
        }>('ingredient_management', {
            action: 'create',
            tenant_id: tenantId,
            ...data,
        });
        return { insumo_id: response.insumo_id };
    },

    /**
     * Actualizar ingrediente
     */
    updateIngredient: async (tenantId: number, insumoId: number, data: {
        nombre?: string;
        unidad_medida?: string;
        costo?: number;
        nota?: string;
    }): Promise<boolean> => {
        await callEdgeFunction('ingredient_management', {
            action: 'update',
            tenant_id: tenantId,
            insumo_id: insumoId,
            ...data,
        });
        return true;
    },

    /**
     * Ajustar stock de ingrediente
     */
    adjustIngredientStock: async (tenantId: number, insumoId: number, cantidad: number, motivo?: string): Promise<boolean> => {
        await callEdgeFunction('ingredient_management', {
            action: 'adjust_stock',
            tenant_id: tenantId,
            insumo_id: insumoId,
            cantidad,
            motivo,
        });
        return true;
    },

    // ============================================================================
    // TABLE MANAGEMENT
    // ============================================================================

    /**
     * Obtener lista de mesas
     */
    getTables: async (tenantId: number): Promise<Table[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            data: Array<{
                id: number;
                nombre: string;
                ocupada: boolean;
                notas: string | null;
            }>;
        }>('table_management', {
            action: 'list',
            tenant_id: tenantId,
        });

        return response.data.map(t => ({
            id: String(t.id),
            number: t.id,
            status: t.ocupada ? 'comiendo' as TableStatus : 'libre' as TableStatus,
        }));
    },

    /**
     * Crear mesa
     */
    createTable: async (tenantId: number, nombre: string, notas?: string): Promise<{ mesa_id: number }> => {
        const response = await callEdgeFunction<{
            success: boolean;
            mesa_id: number;
        }>('table_management', {
            action: 'create',
            tenant_id: tenantId,
            nombre,
            notas,
        });
        return { mesa_id: response.mesa_id };
    },

    /**
     * Actualizar estado de mesa
     */
    updateTableStatus: async (tenantId: number, mesaId: number, ocupada: boolean): Promise<boolean> => {
        await callEdgeFunction('table_management', {
            action: 'update_status',
            tenant_id: tenantId,
            mesa_id: mesaId,
            ocupada,
        });
        return true;
    },

    // ============================================================================
    // ORDER MANAGEMENT
    // ============================================================================

    /**
     * Obtener lista de órdenes
     */
    getOrders: async (tenantId: number, filters?: { estado?: string; mesa_id?: number }): Promise<Order[]> => {
        const response = await callEdgeFunction<{
            success: boolean;
            data: Array<{
                id: number;
                mesa_id: number;
                mesa_nombre: string;
                estado: string;
                fecha_creacion: string;
                total: number;
                propina: number;
                tipo_pago: string | null;
                items: Array<{
                    id: number;
                    producto_id: number;
                    producto_nombre: string;
                    cantidad: number;
                    precio_unitario: number;
                    subtotal: number;
                    nota: string | null;
                }>;
            }>;
        }>('order_management', {
            action: 'list',
            tenant_id: tenantId,
            ...filters,
        });

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

        return response.data.map(o => ({
            id: String(o.id),
            tableId: String(o.mesa_id),
            items: o.items.map(item => ({
                productId: String(item.producto_id),
                productName: item.producto_nombre,
                quantity: item.cantidad,
                price: Number(item.precio_unitario),
                notes: item.nota || undefined,
            })),
            status: statusMap[o.estado] || 'pendiente',
            timestamp: new Date(o.fecha_creacion).getTime(),
            total: Number(o.total),
            tip: Number(o.propina) || 0,
            paymentMethod: o.tipo_pago as 'efectivo' | 'tarjeta' | 'nequi' | undefined,
        }));
    },

    /**
     * Crear orden
     */
    createOrder: async (tenantId: number, data: {
        mesa_id: number;
        cliente_id?: number;
        items: Array<{ producto_id: number; cantidad: number; nota?: string }>;
    }): Promise<{ orden_id: number; total: number }> => {
        const response = await callEdgeFunction<{
            success: boolean;
            orden_id: number;
            data: { total: number };
        }>('order_management', {
            action: 'create',
            tenant_id: tenantId,
            ...data,
        });
        return { orden_id: response.orden_id, total: response.data?.total || 0 };
    },

    /**
     * Actualizar estado de orden
     */
    updateOrderStatus: async (tenantId: number, ordenId: number, estado: string): Promise<boolean> => {
        await callEdgeFunction('order_management', {
            action: 'update_status',
            tenant_id: tenantId,
            orden_id: ordenId,
            estado,
        });
        return true;
    },

    /**
     * Agregar item a orden existente
     */
    addItemToOrder: async (tenantId: number, ordenId: number, data: {
        producto_id: number;
        cantidad: number;
        nota?: string;
    }): Promise<boolean> => {
        await callEdgeFunction('order_management', {
            action: 'add_item',
            tenant_id: tenantId,
            orden_id: ordenId,
            ...data,
        });
        return true;
    },

    /**
     * Pagar orden
     */
    payOrder: async (tenantId: number, ordenId: number, data: {
        tipo_pago: 'efectivo' | 'tarjeta' | 'nequi' | 'otro';
        propina?: number;
        es_factura_electronica?: boolean;
    }): Promise<boolean> => {
        await callEdgeFunction('order_management', {
            action: 'pay',
            tenant_id: tenantId,
            orden_id: ordenId,
            ...data,
        });
        return true;
    },
};
