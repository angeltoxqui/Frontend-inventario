import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsService } from '../../services/productsService';
import type { CreateProductDTO, UpdateProductDTO } from '../../types/models';
import { toast } from 'sonner';

const PRODUCTS_KEYS = {
    products: ['products', 'list'] as const,
    product: (id: number) => ['products', 'detail', id] as const,
};

export function useProducts() {
    const queryClient = useQueryClient();

    const {
        data: products,
        isLoading: isLoadingProducts,
        isError: isErrorProducts,
    } = useQuery({
        queryKey: PRODUCTS_KEYS.products,
        queryFn: productsService.getProducts,
    });

    const createProductMutation = useMutation({
        mutationFn: productsService.createProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRODUCTS_KEYS.products });
            toast.success('Product created successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to create product');
        },
    });

    const updateProductMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdateProductDTO }) =>
            productsService.updateProduct(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: PRODUCTS_KEYS.products });
            queryClient.invalidateQueries({ queryKey: PRODUCTS_KEYS.product(variables.id) });
            toast.success('Product updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to update product');
        },
    });

    const deleteProductMutation = useMutation({
        mutationFn: productsService.deleteProduct,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRODUCTS_KEYS.products });
            toast.success('Product deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.detail || 'Failed to delete product');
        },
    });

    return {
        products,
        isLoadingProducts,
        isErrorProducts,
        createProduct: createProductMutation.mutate,
        isCreatingProduct: createProductMutation.isPending,
        updateProduct: updateProductMutation.mutate,
        deleteProduct: deleteProductMutation.mutate,
    };
}

export function useProduct(id: number, enabled = true) {
    return useQuery({
        queryKey: PRODUCTS_KEYS.product(id),
        queryFn: () => productsService.getProduct(id),
        enabled
    });
}
