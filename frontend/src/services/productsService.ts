import { api } from '../lib/axios';
import type {
    Product,
    CreateProductDTO,
    UpdateProductDTO
} from '../types/models';

export const productsService = {
    /**
     * List all products
     */
    getProducts: async (): Promise<Product[]> => {
        const response = await api.get<Product[]>('/api/v1/products/');
        return response.data;
    },

    /**
     * Get a single product
     */
    getProduct: async (id: number): Promise<Product> => {
        const response = await api.get<Product>(`/api/v1/products/${id}`);
        return response.data;
    },

    /**
     * Create a new product
     */
    createProduct: async (data: CreateProductDTO): Promise<Product> => {
        const response = await api.post<Product>('/api/v1/products/', data);
        return response.data;
    },

    /**
     * Update a product
     */
    updateProduct: async (id: number, data: UpdateProductDTO): Promise<void> => {
        await api.put(`/api/v1/products/${id}`, data);
    },

    /**
     * Delete a product
     */
    deleteProduct: async (id: number): Promise<void> => {
        await api.delete(`/api/v1/products/${id}`);
    }
};
