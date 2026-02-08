import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../services/reportsService';

const REPORTS_KEYS = {
    daily: ['reports', 'daily'] as const,
    dashboard: ['reports', 'dashboard'] as const,
    stock: ['reports', 'stock'] as const,
    movements: ['reports', 'movements'] as const,
};

export function useReports() {
    const useDailyReport = () => useQuery({
        queryKey: REPORTS_KEYS.daily,
        queryFn: reportsService.getDailyReport,
    });

    const useDashboardStats = () => useQuery({
        queryKey: REPORTS_KEYS.dashboard,
        queryFn: reportsService.getDashboardStats,
    });

    const useStockReport = () => useQuery({
        queryKey: REPORTS_KEYS.stock,
        queryFn: reportsService.getStockReport,
    });

    const useMovements = () => useQuery({
        queryKey: REPORTS_KEYS.movements,
        queryFn: reportsService.getMovements,
    });

    return {
        useDailyReport,
        useDashboardStats,
        useStockReport,
        useMovements,
    };
}
