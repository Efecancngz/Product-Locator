export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "LIMITED" | "UNKNOWN";

export interface StoreLocation {
    city: string;
    district?: string;
    branch?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    store_name: string;
}

export interface ProductStock {
    product_name: string;
    price?: number;
    currency: string;
    stock_status: StockStatus;
    store_location: StoreLocation;
    source_url: string;
    last_updated: string;
}

export interface SearchResult {
    query: string;
    found_products: ProductStock[];
    total_found: number;
}
