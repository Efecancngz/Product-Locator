import { useState, useMemo, useEffect, useRef } from 'react'
import { ProductStock } from '@/types/api'
import { Store, ExternalLink, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/ui/Pagination'
import gsap from 'gsap'

interface ProductListWithPaginationProps {
    products: ProductStock[]
    totalFound: number
}

const ITEMS_PER_PAGE = 9

export function ProductListWithPagination({ products, totalFound }: ProductListWithPaginationProps) {
    const [currentPage, setCurrentPage] = useState(1)
    const cardsRef = useRef<HTMLDivElement>(null)
    const countRef = useRef<HTMLSpanElement>(null)

    // Reset to page 1 when products change
    useEffect(() => {
        setCurrentPage(1)
    }, [products])

    // Count-up animation for total found
    useEffect(() => {
        if (countRef.current && totalFound > 0) {
            const obj = { val: 0 }
            gsap.to(obj, {
                val: totalFound,
                duration: 1.2,
                ease: 'power2.out',
                onUpdate: () => {
                    if (countRef.current) {
                        countRef.current.textContent = Math.round(obj.val).toString()
                    }
                }
            })
        }
    }, [totalFound])

    // Stagger animation for cards
    useEffect(() => {
        if (cardsRef.current) {
            const cards = cardsRef.current.querySelectorAll('.product-card')
            gsap.fromTo(cards,
                { y: 30, opacity: 0, scale: 0.96 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    stagger: 0.06,
                    ease: 'power2.out',
                    clearProps: 'transform'
                }
            )
        }
    }, [currentPage, products])

    const totalPages = Math.ceil(products.length / ITEMS_PER_PAGE)

    const paginatedProducts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return products.slice(start, start + ITEMS_PER_PAGE)
    }, [products, currentPage])

    // Process unique store brand lowest prices for the comparison chart
    const comparisonChartData = useMemo(() => {
        const storePrices: { [key: string]: number } = {}
        products.forEach(p => {
            if (p.stock_status === 'IN_STOCK' && typeof p.price === 'number') {
                const storeName = p.store_location.store_name
                if (!storePrices[storeName] || p.price < storePrices[storeName]) {
                    storePrices[storeName] = p.price
                }
            }
        })
        return Object.entries(storePrices)
            .map(([store, price]) => ({ store, price }))
            .sort((a, b) => a.price - b.price)
    }, [products])

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 overflow-auto flex-1">
                <div className="flex items-center gap-3 mb-6">
                    <h2 className="text-xl font-bold">
                        <span ref={countRef}>0</span> Sonuç Bulundu
                    </h2>
                    <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Dynamic Store Price Comparison Chart (Bar Chart) */}
                {comparisonChartData.length > 1 && (
                    <div className="glass-strong rounded-2xl p-5 mb-6 shadow-md border border-primary/10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            <h3 className="text-xs font-bold text-foreground tracking-tight uppercase">
                                📊 En Uygun Şube Fiyat Kıyaslama Grafiği (Elden Teslim)
                            </h3>
                        </div>
                        <div className="space-y-3.5">
                            {(() => {
                                const maxPrice = Math.max(...comparisonChartData.map(d => d.price))
                                return comparisonChartData.map((data, index) => {
                                    const percentage = (data.price / maxPrice) * 100
                                    return (
                                        <div key={index} className="space-y-1.5">
                                            <div className="flex justify-between text-[11px] font-semibold">
                                                <span className="text-muted-foreground">{data.store}</span>
                                                <span className="text-primary font-mono">{data.price.toLocaleString('tr-TR')} TRY</span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/40 relative">
                                                <div 
                                                    className="h-full rounded-full gradient-primary glow-primary transition-all duration-1000 ease-out"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </div>
                )}

                <div ref={cardsRef} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {paginatedProducts.map((product, idx) => (
                        <div
                            key={`${currentPage}-${idx}`}
                            className="product-card group glass-strong p-5 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30"
                        >
                            {/* Header with Name and Stock Badge */}
                            <div className="flex justify-between items-start gap-3 mb-3">
                                <h3 className="font-bold text-foreground text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                    {product.product_name}
                                </h3>
                                <span className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${product.stock_status === 'IN_STOCK'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                    {product.stock_status === 'IN_STOCK' ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                            Stokta
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                                            Stok Yok
                                        </>
                                    )}
                                </span>
                            </div>

                            {/* Store Info Card */}
                            <div className="flex items-start gap-3 mb-4 bg-primary/5 p-3 rounded-xl border border-primary/10">
                                <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center shrink-0 shadow-md">
                                    <Store className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-foreground truncate">
                                        {product.store_location.store_name}
                                    </span>
                                    {product.store_location.branch && product.store_location.branch !== '/' && (
                                        <span className="text-sm text-primary font-medium truncate">
                                            📍 {product.store_location.branch}
                                        </span>
                                    )}
                                    {(product.store_location.district || product.store_location.city) && (
                                        <span className="text-xs text-muted-foreground">
                                            {[product.store_location.district, product.store_location.city].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                    {product.store_location.latitude && product.store_location.longitude && (
                                        <a 
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${product.store_location.latitude},${product.store_location.longitude}`}
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 mt-1.5 transition-colors hover:underline"
                                        >
                                            <MapPin className="w-3 h-3 text-indigo-400" />
                                            Yol Tarifi Al (Google Maps)
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Price and Action */}
                            <div className="flex justify-between items-center pt-3 border-t border-border/50">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Fiyat</span>
                                    <span className="font-bold text-xl gradient-text">
                                        {typeof product.price === 'number'
                                            ? product.price.toLocaleString('tr-TR')
                                            : product.price} {product.currency}
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    className="gradient-primary text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
                                    asChild
                                >
                                    <a href={product.source_url} target="_blank" rel="noreferrer">
                                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                        Mağazaya Git
                                    </a>
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pagination at bottom */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={products.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    )
}
