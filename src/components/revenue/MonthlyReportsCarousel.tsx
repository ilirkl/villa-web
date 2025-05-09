// src/components/revenue/MonthlyReportsCarousel.tsx
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { formatCurrency } from '@/lib/utils';
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface Report {
    key: string; // Expect the YYYY-MM key
    year: string;
    month: string;
    amount: number;
}

interface MonthlyReportsCarouselProps {
    title: string;
    reports: Report[];
}

export default function MonthlyReportsCarousel({
    title,
    reports,
}: MonthlyReportsCarouselProps) {
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
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent className="pl-1">
                    <div className="animate-pulse flex space-x-2">
                        <div className="h-12 w-22 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-12 w-22 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-12 w-22 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-0"><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="pl-1">
                {reports.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {dictionary.no_reports || 'No reports.'}
                    </p>
                ) : (
                    <Carousel opts={{ align: "start", loop: false }} className="w-full">
                        <CarouselContent className="pb-0">
                            {reports.map((report, index) => {
                                // *** Construct href using the reliable 'key' ***
                                const href = report.key ? `/revenue/reports/${report.key}` : '/revenue'; // Fallback if key missing

                                return (
                                    <CarouselItem
                                        key={report.key || index} // Use key for React key if available
                                        className="basis-3/4 md:basis-1/2 lg:basis-1/3 pb-0" // Shows ~1.5 / 2 / 3 items
                                    >
                                        <Link href={href} className="block p-0 hover:opacity-90 transition-opacity">
                                            <Card className="text-center pb-1">
                                                <p className="text-xs text-muted-foreground">{report.year}</p>
                                                <p className="text-sm font-medium">{report.month}</p>
                                                <p className="text-base font-semibold mt-0">
                                                    {formatCurrency(report.amount)}
                                                </p>
                                            </Card>
                                        </Link>
                                    </CarouselItem>
                                );
                            })}
                        </CarouselContent>
                        {/* Arrows hidden */}
                    </Carousel>
                )}
            </CardContent>
        </Card>
    );
}
