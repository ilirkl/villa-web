// src/components/revenue/BookingListCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns';
import { sq } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface BookingListItem {
    id: string | number;
    start_date: string;
    total_amount: number | null;
}
interface BookingListCardProps {
    title: string;
    bookings: BookingListItem[];
    statusLabel: string;
    seeAllLink?: string;
    showSeeAllButton?: boolean;
}

export default function BookingListCard({
    title,
    bookings,
    statusLabel,
    seeAllLink,
    showSeeAllButton = false,
}: BookingListCardProps) {
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
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-3">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{title}</CardTitle>
                {showSeeAllButton && seeAllLink && (
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="hover:bg-[#FF5A5F]/10" 
                        style={{ borderColor: '#FF5A5F', color: '#FF5A5F' }}
                        asChild
                    >
                        <Link href={seeAllLink}>{dictionary.see_all || 'See All'}</Link>
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                        {dictionary.no_bookings?.replace('{type}', title.toLowerCase()) || `No ${title.toLowerCase()} bookings.`}
                    </p>
                ) : (
                    <ul className="divide-y divide-border">
                        {bookings.map((booking) => {
                            let formattedDate = 'Invalid Date';
                            try {
                                const parsed = parseISO(booking.start_date);
                                if (isValid(parsed)) {
                                    formattedDate = format(parsed, 'd MMMM', { 
                                        locale: lang === 'sq' ? sq : undefined 
                                    });
                                }
                            } catch (e) { console.error(`Error parsing date: ${booking.start_date}`, e); }

                            return (
                                <li key={booking.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium">{formattedDate}</p>
                                        <p className="text-xs text-muted-foreground">{statusLabel}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-sm font-semibold mr-2">
                                            {formatCurrency(booking.total_amount)}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
