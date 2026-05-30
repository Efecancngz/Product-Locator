import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { SearchResult } from '../types/api';

const fetchProducts = async (
    query: string,
    city?: string,
    district?: string,
    category?: string
): Promise<SearchResult> => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (city) params.append('city', city);
    if (district) params.append('district', district);
    if (category && category !== 'all') params.append('category', category);

    const { data } = await apiClient.get<SearchResult>('/search', { params });
    return data;
};

/**
 * Hook for product search - only triggers when searchId changes
 * @param searchId - Unique ID that changes when user clicks "Bul" button
 * @param query - Search query string
 * @param city - Optional city filter
 * @param district - Optional district filter
 * @param category - Optional category filter
 */
export const useProductSearch = (
    searchId: number,  // Changes only when user clicks "Bul"
    query: string,
    city?: string,
    district?: string,
    category?: string
) => {
    return useQuery({
        // searchId is the primary trigger - only refetch when it changes
        queryKey: ['search', searchId],
        queryFn: () => fetchProducts(query, city, district, category),
        enabled: searchId > 0 && query.length > 2,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        retry: 1,
        // Don't refetch on window focus or reconnect
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
};
