import { api } from '../lib/axios';
import type { Product, CreateProductDTO, Insumo } from '../types/api';

export const inventoryService = {
    getInsumos: async () => {
        const { data } = await api.get<Insumo[]>('/api/v1/inventory/insumos/');
        return data;
    },
    // Placeholder for other inventory methods if needed by components, 
    // but strictly following user's snippet for now which only showed getInsumos in this file context
    // or it was split. Since the user combined them in the prompt, placing them here.
};

export const productsService = {
    getProducts: async () => {
        const { data } = await api.get<Product[]>('/api/v1/products/');
        return data;
    },

    createProduct: async (product: CreateProductDTO) => {
        // La API espera { nombre, precio, ingredientes: [{ insumo_id, cantidad_requerida }] }
        const { data } = await api.post<Product>('/api/v1/products/', product);
        return data;
    },

    getProductById: async (id: number) => {
        const { data } = await api.get<Product>(`/api/v1/products/${id}`);
        return data;
    }
};
