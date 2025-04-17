// src/components/revenue/BookingListCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns';
import type { Locale } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // *** IMPORT THE UTILITY ***

interface BookingListItem {
    id: string | number;
    start_date: string;
    total_amount: number | null;
}
interface BookingListCardProps {
    title: string;
    bookings: BookingListItem[];
    statusLabel: string;
    locale: Locale; // Still needed for date formatting
    seeAllLink?: string;
    showSeeAllButton?: boolean;
    // formatCurrency prop removed
}

export default function BookingListCard({
    title,
    bookings,
    statusLabel,
    locale, // Keep locale prop
    seeAllLink,
    showSeeAllButton = false,
}: BookingListCardProps) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} bookings.</p>
                ) : (
                    <ul className="divide-y divide-border -mx-6 px-6">
                        {bookings.map((booking) => {
                            let formattedDate = 'Invalid Date';
                            try {
                                const parsed = parseISO(booking.start_date);
                                if (isValid(parsed)) {
                                    formattedDate = format(parsed, 'd MMMM', { locale }); // Use passed locale
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
                                            {/* *** USE IMPORTED FUNCTION *** */}
                                            {formatCurrency(booking.total_amount)}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {showSeeAllButton && seeAllLink && (
                    <div className="mt-4 pt-4 border-t border-border">
                        <Button variant="outline" className="w-full" asChild>
                             {/* Adjust button text if needed based on new list meaning */}
                            <Link href={seeAllLink}>Shiko të gjitha</Link>
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}