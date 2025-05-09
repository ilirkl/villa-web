'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import { CalendarDays, PercentIcon, Clock } from 'lucide-react';

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
        <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                    {dictionary.nights_reserved || 'Nights Reserved'}
                </span>
                <div className="flex items-center gap-1 justify-center">
                    <CalendarDays className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="text-base md:text-xl font-bold">{nightsReserved}</span>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                    {dictionary.occupancy_rate || 'Occupancy Rate'}
                </span>
                <div className="flex items-center gap-1 justify-center">
                    <PercentIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="text-base md:text-xl font-bold">{occupancyRate.toFixed(1)}%</span>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                    {dictionary.average_stay || 'Average Stay'}
                </span>
                <div className="flex items-center gap-1 justify-center">
                    <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                    <span className="text-base md:text-xl font-bold">{averageStay.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
}
