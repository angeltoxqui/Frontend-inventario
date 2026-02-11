import { api } from '../lib/axios';
import type {
    DailyReport,
    DashboardStats,
    StockItem,
    Movement
} from '../types/models';

export const reportsService = {
    /**
     * Get daily sales report
     */
    getDailyReport: async (): Promise<DailyReport> => {
        const response = await api.get<DailyReport>('/api/v1/reports/today');
        return response.data;
    },

    /**
     * Get dashboard statistics
     */
    getDashboardStats: async (): Promise<DashboardStats> => {
        const response = await api.get<DashboardStats>('/api/v1/reports/dashboard');
        return response.data;
    },

    /**
     * Get current stock report
     */
    getStockReport: async (): Promise<StockItem[]> => {
        const response = await api.get<StockItem[]>('/api/v1/reports/stock');
        return response.data;
    },

    /**
     * Get recent movements
     */
    getMovements: async (): Promise<Movement[]> => {
        const response = await api.get<Movement[]>('/api/v1/reports/movements');
        return response.data;
    },
};
