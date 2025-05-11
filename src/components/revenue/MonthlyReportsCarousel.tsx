// src/components/revenue/MonthlyReportsCarousel.tsx
'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { formatCurrency } from '@/lib/utils';
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface MonthlyReportItem {
    id: string;
    key: string;
    month: string;
    year: string;
    yearMonth: string;
    netProfit: number;
    grossProfit: number;
    expenses: number;
    amount: number;
}

interface MonthlyReportsCarouselProps {
    title: string;
    reports: MonthlyReportItem[];
    csrfToken?: string; // Add CSRF token prop
}

export default function MonthlyReportsCarousel({
    title,
    reports,
    csrfToken, // Accept CSRF token
}: MonthlyReportsCarouselProps) {
    const params = useParams();
    const lang = params?.lang as string || 'en';
    const [dictionary, setDictionary] = useState<any>({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

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

    // If you have any actions that need CSRF protection, use the token here
    const handleReportAction = async (yearMonth: string) => {
        // Example of using CSRF token for an action
        if (!csrfToken) {
            console.error('CSRF token not available');
            return;
        }
        
        try {
            const response = await fetch(`/api/reports/${yearMonth}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken,
                },
                body: JSON.stringify({ action: 'someAction' }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to perform action');
            }
            
            // Handle success
        } catch (error) {
            console.error('Error performing report action:', error);
            // Handle error
        }
    };

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
                        <CarouselContent className="-ml-2 pb-0">
                            {reports.map((report, index) => {
                                // Construct href using the yearMonth
                                const href = `/revenue/reports/${report.yearMonth}`;

                                return (
                                    <CarouselItem
                                        key={report.id}
                                        className="pl-2 basis-2/5 md:basis-1/3 lg:basis-1/4 pb-0" // Show 2.5 cards
                                    >
                                        <Link href={href} className="block p-0 hover:opacity-90 transition-opacity">
                                            <Card className="bg-white border rounded-xl shadow-sm max-w-[120px] mx-auto p-3 flex flex-col h-[100px]">
                                                <div className="text-left">
                                                    <p className="text-xs text-gray-500 mb-0.5">{report.year}</p>
                                                    <p className="text-lg font-medium text-gray-800 mt-4">{report.month}</p>
                                                </div>
                                                <div className="-mt-6">
                                                    <p className="text-sm font-semibold text-left text-[#FF5A5F]">
                                                        {formatCurrency(report.amount || report.netProfit || 0)}
                                                    </p>
                                                </div>
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
