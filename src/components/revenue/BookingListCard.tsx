// src/components/revenue/BookingListCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { parseISO, isValid, format } from 'date-fns'; // Import parseISO and other date-fns functions
import { sq } from 'date-fns/locale'; // Import Albanian locale
import { ChevronRight } from 'lucide-react'; // Import ChevronRight icon if used

interface BookingListItem {
  id: string;
  start_date: string; // Changed from startDate to match the data structure
  end_date?: string; // Changed from endDate and made optional
  total_amount: number | null; // Updated to allow null
}

interface BookingListCardProps {
  title: string;
  bookings: BookingListItem[];
  statusLabel: string;
  showSeeAllButton?: boolean;
  seeAllLink?: string;
  csrfToken?: string; // Add CSRF token prop
}

export default function BookingListCard({
  title,
  bookings,
  statusLabel,
  showSeeAllButton = false,
  seeAllLink = '/bookings',
  csrfToken, // Accept CSRF token
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

  // If you have any actions that need CSRF protection, use the token here
  const handleBookingAction = async (bookingId: string) => {
    // Example of using CSRF token for an action
    if (!csrfToken) {
      console.error('CSRF token not available');
      return;
    }
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/action`, {
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
      console.error('Error performing booking action:', error);
      // Handle error
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base md:text-lg">{title}</CardTitle>
          {showSeeAllButton && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={seeAllLink}>
                {dictionary.see_all || 'See all'}
              </Link>
            </Button>
          )}
        </div>
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
                      {formatCurrency(booking.total_amount || 0)}
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
