import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Store categories matching backend store_registry.py
export type StoreCategory = 'all' | 'electronics' | 'appliances' | 'clothing' | 'sports' | 'cosmetics'

export interface CategoryInfo {
    id: StoreCategory
    label: string
    icon: string
    stores: string[]
}

export const CATEGORIES: CategoryInfo[] = [
    { id: 'all', label: 'Tüm Kategoriler', icon: '🏪', stores: [] },
    { id: 'electronics', label: 'Elektronik', icon: '📱', stores: ['Teknosa', 'Vatan Bilgisayar', 'MediaMarkt', 'Hepsiburada', 'Trendyol'] },
    { id: 'appliances', label: 'Beyaz Eşya', icon: '🏠', stores: ['Arçelik', 'Beko', 'Vestel', 'Bosch', 'Siemens'] },
    { id: 'clothing', label: 'Giyim', icon: '👕', stores: ['Flo', 'LC Waikiki', 'Koton', 'Boyner', 'DeFacto'] },
    { id: 'sports', label: 'Spor', icon: '⚽', stores: ['Decathlon', 'Nike', 'Adidas', 'Intersport', 'Sportive'] },
    { id: 'cosmetics', label: 'Kozmetik', icon: '💄', stores: ['Gratis', 'Watsons', 'Sephora', 'Rossmann', 'Eve'] },
]

interface CategoryFilterProps {
    selectedCategory: StoreCategory
    onCategoryChange: (category: StoreCategory) => void
    className?: string
}

export function CategoryFilter({ selectedCategory, onCategoryChange, className }: CategoryFilterProps) {
    const [open, setOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const currentCategory = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0]

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <Button
                variant="outline"
                onClick={() => setOpen(!open)}
                className="justify-between h-12 min-w-[160px] w-full"
            >
                <span className="flex items-center gap-2 truncate">
                    <span>{currentCategory.icon}</span>
                    <span className="hidden sm:inline">{currentCategory.label}</span>
                </span>
                <ChevronDown className={`ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>

            {open && (
                <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border rounded-lg shadow-lg z-50 p-2">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                onCategoryChange(category.id)
                                setOpen(false)
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                ${selectedCategory === category.id
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'hover:bg-gray-100 text-gray-700'
                                }`}
                        >
                            <span className="text-xl">{category.icon}</span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium">{category.label}</div>
                                {category.stores.length > 0 && (
                                    <div className="text-xs text-gray-500 truncate">
                                        {category.stores.slice(0, 3).join(', ')}{category.stores.length > 3 ? '...' : ''}
                                    </div>
                                )}
                            </div>
                            {selectedCategory === category.id && (
                                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// Helper to get stores for a category
export function getStoresForCategory(category: StoreCategory): string[] {
    if (category === 'all') {
        return CATEGORIES.flatMap(c => c.stores)
    }
    return CATEGORIES.find(c => c.id === category)?.stores || []
}
