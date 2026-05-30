import { useEffect } from 'react';
import { TURKEY_CITIES } from '@/data/locations';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
    selectedCity: string;
    selectedDistrict: string;
    onCityChange: (city: string) => void;
    onDistrictChange: (district: string) => void;
    className?: string;
}

export function LocationSelector({
    selectedCity,
    selectedDistrict,
    onCityChange,
    onDistrictChange,
    className
}: LocationSelectorProps) {

    // Helper to find current city data
    const currentCityData = TURKEY_CITIES.find(c => c.name === selectedCity);

    // Reset district if city changes
    useEffect(() => {
        if (selectedCity && currentCityData && !currentCityData.districts.includes(selectedDistrict)) {
            onDistrictChange('');
        }
    }, [selectedCity, currentCityData, selectedDistrict, onDistrictChange]);

    return (
        <div className={cn("flex gap-2 items-center", className)}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                    value={selectedCity}
                    onChange={(e) => onCityChange(e.target.value)}
                    className="h-10 pl-9 pr-8 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none appearance-none cursor-pointer hover:bg-accent/50 transition-colors w-[140px]"
                    aria-label="Şehir Seçiniz"
                >
                    <option value="">Tüm Türkiye</option>
                    {TURKEY_CITIES.map(city => (
                        <option key={city.name} value={city.name}>{city.name}</option>
                    ))}
                </select>
                {/* Custom Arrow Icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>

            <div className="relative">
                <select
                    value={selectedDistrict}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    disabled={!selectedCity}
                    className="h-10 pl-3 pr-8 text-sm bg-background border border-input rounded-md focus:ring-2 focus:ring-ring focus:outline-none appearance-none cursor-pointer hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-[140px]"
                    aria-label="İlçe Seçiniz"
                >
                    <option value="">Tüm İlçeler</option>
                    {currentCityData?.districts.map(district => (
                        <option key={district} value={district}>{district}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-muted-foreground opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
        </div>
    );
}
