// src/components/revenue/MonthlyReportsCarousel.tsx

'use client';

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { formatCurrency } from '@/lib/utils';
import Link from "next/link"; // Import Link

// *** Update Report interface to include 'key' ***
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
    return (
        <Card>
            <CardHeader className="pb-4"><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="pl-1">
                {reports.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No reports.</p>
                ) : (
                    <Carousel opts={{ align: "start", loop: false }} className="w-full">
                        <CarouselContent>
                            {reports.map((report, index) => {
                                // *** Construct href using the reliable 'key' ***
                                const href = report.key ? `/revenue/reports/${report.key}` : '/revenue'; // Fallback if key missing

                                return (
                                    <CarouselItem
                                        key={report.key || index} // Use key for React key if available
                                        className="basis-2/3 md:basis-1/2 lg:basis-1/3" // Shows ~1.5 / 2 / 3 items
                                    >
                                        <Link href={href} className="block p-2 hover:opacity-90 transition-opacity">
                                            <Card className="text-center p-3">
                                                <p className="text-xs text-muted-foreground">{report.year}</p>
                                                <p className="text-sm font-medium">{report.month}</p>
                                                <p className="text-base font-semibold mt-1">
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