import { api } from '../lib/axios';
import type {
    Table,
    CreateTableDTO
} from '../types/models';

export const tablesService = {
    /**
     * List all tables
     */
    getTables: async (): Promise<Table[]> => {
        const response = await api.get<Table[]>('/api/v1/tables/');
        return response.data;
    },

    /**
     * Create a new table
     */
    createTable: async (data: CreateTableDTO): Promise<Table> => {
        const response = await api.post<Table>('/api/v1/tables/', data);
        return response.data;
    },

    /**
     * Mark table as occupied
     */
    occupyTable: async (id: number): Promise<void> => {
        await api.patch(`/api/v1/tables/${id}/ocupar`);
    },

    /**
     * Release table (free it)
     */
    releaseTable: async (id: number): Promise<void> => {
        await api.patch(`/api/v1/tables/${id}/liberar`);
    }
};
