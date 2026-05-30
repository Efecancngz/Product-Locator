// Basic Turkey City/District Data for Demo
// In a real app, this could be a larger JSON or fetched from an API

export interface CityData {
    name: string;
    districts: string[];
}

export const TURKEY_CITIES: CityData[] = [
    {
        name: "İstanbul",
        districts: ["Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Maltepe", "Ataşehir", "Bakırköy", "Beylikdüzü", "Fatih", "Sarıyer"]
    },
    {
        name: "Ankara",
        districts: ["Çankaya", "Keçiören", "Yenimahalle", "Mamak", "Etimesgut", "Sincan", "Altındağ"]
    },
    {
        name: "İzmir",
        districts: ["Konak", "Karşıyaka", "Bornova", "Buca", "Çiğli", "Gaziemir", "Balçova"]
    },
    {
        name: "Bursa",
        districts: ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya", "Gemlik"]
    },
    {
        name: "Antalya",
        districts: ["Muratpaşa", "Kepez", "Konyaaltı", "Alanya", "Manavgat"]
    }
];
