import { api } from '../lib/axios';
import type { Product, CreateProductDTO, Insumo } from '../types/api';
import type { UpdateProductDTO } from '../types/models';

export const inventoryService = {
    getInsumos: async () => {
        const { data } = await api.get<Insumo[]>('/api/v1/inventory/insumos/');
        return data;
    },
};

export const productsService = {
    getProducts: async () => {
        const { data } = await api.get<Product[]>('/api/v1/products/');
        return data;
    },

    createProduct: async (product: CreateProductDTO) => {
        const { data } = await api.post<Product>('/api/v1/products/', product);
        return data;
    },

    getProduct: async (id: number) => {
        const { data } = await api.get<Product>(`/api/v1/products/${id}`);
        return data;
    },

    // Alias for backward compatibility
    getProductById: async (id: number) => {
        const { data } = await api.get<Product>(`/api/v1/products/${id}`);
        return data;
    },

    updateProduct: async (id: number, product: UpdateProductDTO) => {
        const { data } = await api.put<Product>(`/api/v1/products/${id}`, product);
        return data;
    },

    deleteProduct: async (id: number) => {
        await api.delete(`/api/v1/products/${id}`);
    },
};
