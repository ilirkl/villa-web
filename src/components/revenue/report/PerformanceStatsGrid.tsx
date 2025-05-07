'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface PerformanceStatsGridProps {
    nightsReserved: number;
    occupancyRate: number;
    averageStay: number;
}

export default function PerformanceStatsGrid({
    nightsReserved,
    occupancyRate,
    averageStay,
}: PerformanceStatsGridProps) {
    const params = useParams();
    const lang = params?.lang as string || 'en';
    const [dictionary, setDictionary] = useState<any>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function loadDictionary() {
            try {
                const dict = await getDictionary(lang as 'en' | 'sq');
                setDictionary(dict);
                setIsLoaded(true);
            } catch (error) {
                console.error('Failed to load dictionary:', error);
                setIsLoaded(true);
            }
        }
        loadDictionary();
    }, [lang]);

    if (!isLoaded) {
        return (
            <div className="grid grid-cols-3 gap-4">
                <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center p-3 border rounded-md">
                <span className="text-sm text-muted-foreground mb-1">{dictionary.nights_reserved || 'Nights Reserved'}</span>
                <span className="text-xl font-bold">{nightsReserved}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 border rounded-md">
                <span className="text-sm text-muted-foreground mb-1">{dictionary.occupancy_rate || 'Occupancy Rate'}</span>
                <span className="text-xl font-bold">{occupancyRate.toFixed(1)}%</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 border rounded-md">
                <span className="text-sm text-muted-foreground mb-1">{dictionary.average_stay || 'Average Stay'}</span>
                <span className="text-xl font-bold">{averageStay.toFixed(1)}</span>
            </div>
        </div>
    );
}
