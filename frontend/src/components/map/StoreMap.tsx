import { Map, Marker, Overlay } from 'pigeon-maps';
import { useMemo, useState } from 'react';
import { ProductStock } from '@/types/api';
import { MapPin, Store, X, ExternalLink } from 'lucide-react';

interface StoreMapProps {
    products: ProductStock[];
    className?: string;
}

export function StoreMap({ products, className }: StoreMapProps) {
    const [selectedProduct, setSelectedProduct] = useState<ProductStock | null>(null);

    // Default to Turkey/İzmir center
    const defaultCenter: [number, number] = [38.4237, 27.1428];

    // Filter products with valid coordinates
    const validProducts = useMemo(() => {
        return products.filter(p =>
            p.store_location.latitude &&
            p.store_location.longitude &&
            !isNaN(p.store_location.latitude) &&
            !isNaN(p.store_location.longitude)
        );
    }, [products]);

    // Calculate center and zoom from valid products
    const { center, zoom } = useMemo(() => {
        if (validProducts.length === 0) return { center: defaultCenter, zoom: 10 };

        const lats = validProducts.map(p => p.store_location.latitude!);
        const lngs = validProducts.map(p => p.store_location.longitude!);

        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        // Calculate appropriate zoom based on spread
        const latSpread = Math.max(...lats) - Math.min(...lats);
        const lngSpread = Math.max(...lngs) - Math.min(...lngs);
        const spread = Math.max(latSpread, lngSpread);

        let zoom = 12;
        if (spread > 1) zoom = 8;
        else if (spread > 0.5) zoom = 9;
        else if (spread > 0.2) zoom = 10;
        else if (spread > 0.1) zoom = 11;

        return { center: [avgLat, avgLng] as [number, number], zoom };
    }, [validProducts]);

    // Show message if no valid coordinates
    if (validProducts.length === 0 && products.length > 0) {
        return (
            <div className={`w-full h-full rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center ${className}`}>
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Harita Görünümü Hazırlanıyor
                    </h3>
                    <p className="text-gray-600 mb-1">
                        Mağaza konumları henüz yüklenemedi
                    </p>
                    <p className="text-sm text-gray-500">
                        Sonuçları liste görünümünde inceleyebilirsiniz
                    </p>
                </div>
            </div>
        );
    }

    // No products at all
    if (products.length === 0) {
        return (
            <div className={`w-full h-full rounded-xl bg-gray-100 flex items-center justify-center ${className}`}>
                <div className="text-center p-8">
                    <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Arama yaparak mağaza konumlarını görün</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full rounded-xl overflow-hidden relative ${className}`}>
            <Map
                center={center}
                zoom={zoom}
                defaultCenter={defaultCenter}
                defaultZoom={10}
            >
                {validProducts.map((product, idx) => (
                    <Marker
                        key={idx}
                        anchor={[product.store_location.latitude!, product.store_location.longitude!]}
                        onClick={() => setSelectedProduct(product)}
                    >
                        <div
                            className={`
                                w-10 h-10 rounded-full flex items-center justify-center cursor-pointer
                                shadow-lg transition-transform hover:scale-110
                                ${product.stock_status === 'IN_STOCK'
                                    ? 'bg-green-500 hover:bg-green-600'
                                    : 'bg-red-500 hover:bg-red-600'
                                }
                            `}
                        >
                            <Store className="w-5 h-5 text-white" />
                        </div>
                    </Marker>
                ))}

                {/* Popup overlay for selected product */}
                {selectedProduct && selectedProduct.store_location.latitude && selectedProduct.store_location.longitude && (
                    <Overlay
                        anchor={[selectedProduct.store_location.latitude, selectedProduct.store_location.longitude]}
                        offset={[140, 260]}
                    >
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[280px] overflow-hidden">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(null); }}
                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2 mb-1">
                                    <Store className="w-5 h-5" />
                                    <span className="font-semibold">{selectedProduct.store_location.store_name}</span>
                                </div>
                                {selectedProduct.store_location.branch && (
                                    <p className="text-blue-100 text-sm">📍 {selectedProduct.store_location.branch}</p>
                                )}
                                {(selectedProduct.store_location.district || selectedProduct.store_location.city) && (
                                    <p className="text-blue-100 text-xs mt-1">
                                        {[selectedProduct.store_location.district, selectedProduct.store_location.city].filter(Boolean).join(', ')}
                                    </p>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className="p-4">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2 line-clamp-2">
                                    {selectedProduct.product_name}
                                </h4>

                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-xl text-blue-600">
                                        {selectedProduct.price?.toLocaleString('tr-TR')} {selectedProduct.currency}
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${selectedProduct.stock_status === 'IN_STOCK'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                        }`}>
                                        {selectedProduct.stock_status === 'IN_STOCK' ? '✓ Stokta' : '✗ Stok Yok'}
                                    </span>
                                </div>

                                <a
                                    href={selectedProduct.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Mağazaya Git
                                </a>
                            </div>
                        </div>
                    </Overlay>
                )}
            </Map>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200">
                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-green-500"></div>
                        <span className="text-gray-700">Stokta</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-red-500"></div>
                        <span className="text-gray-700">Stok Yok</span>
                    </div>
                </div>
            </div>

            {/* Product count badge */}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 border border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                    {validProducts.length} mağaza haritada
                </span>
            </div>
        </div>
    );
}
