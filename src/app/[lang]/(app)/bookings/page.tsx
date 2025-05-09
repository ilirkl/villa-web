'use client';

import { useEffect, useState, Suspense } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Booking, BookingSource } from '@/lib/definitions';
import { createClient } from '@/lib/supabase/client';
import { SearchBar } from '@/components/SearchBar';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { parse, format } from 'date-fns';

// Dynamically import components
const BookingCard = dynamic(() => import('@/components/bookings/BookingCard').then(mod => ({ default: mod.BookingCard })), {
  loading: () => <div className="animate-pulse h-32 bg-muted rounded-lg"></div>
});

const FilterSheet = dynamic(() => import('@/components/FilterSheet').then(mod => ({ default: mod.FilterSheet })));

const bookingSourceOptions = [
  { id: 'DIRECT', name: 'Direct', color: '#10b981' },
  { id: 'AIRBNB', name: 'Airbnb', color: '#ff5a5f' },
  { id: 'BOOKING', name: 'Booking', color: '#003580' },
];

const sortOptions = [
  { field: 'start_date', label: 'Check-in Date' }
];

// Helper function to safely parse and format dates
const formatBookingDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    // Parse the date string explicitly as YYYY-MM-DD
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    // Format the date object
    return format(date, 'dd MMM'); // e.g., "18 Apr"
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return dateString; // Fallback to original string on error
  }
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<BookingSource | 'all'>('all');
  // Add refresh trigger state
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dictionary, setDictionary] = useState<any>({});
  const { lang } = useParams();

  // Load dictionary
  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await import('@/lib/dictionary').then(mod => mod.getDictionary(lang as 'en' | 'sq'));
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
  }, [lang]);

  // Update sort options with translations
  useEffect(() => {
    if (dictionary.check_in_date) {
      sortOptions[0].label = dictionary.check_in_date;
    }
  }, [dictionary]);

  // Add refresh handler
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchBookings = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_date', { ascending: sortOrder === 'asc' });

      if (error) {
        setError(error.message);
      } else {
        setBookings(data || []);
      }
      setIsLoading(false);
    };

    fetchBookings();
  }, [sortOrder, refreshTrigger]); // Add refreshTrigger to dependencies

  // Apply filters and search
  useEffect(() => {
    let result = [...bookings];

    // Apply source filter
    if (sourceFilter !== 'all') {
      result = result.filter(booking => booking.source === sourceFilter);
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(booking =>
        booking.guest_name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(result);
  }, [bookings, sourceFilter, searchTerm]);

  if (isLoading) return <div>{dictionary.loading_bookings || 'Loading bookings...'}</div>;
  if (error) return <p>{dictionary.error_loading_bookings || 'Error loading bookings:'} {error}</p>;
  if (!bookings || bookings.length === 0) return <p>{dictionary.no_bookings_found || 'No bookings found.'}</p>;

  return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-1xl font-semibold">{dictionary.bookings || 'Bookings'}</h3>
        <Link href="/bookings/add" className="group relative">
          <PlusCircle 
            className="h-8 w-8 transition-all duration-300 ease-in-out transform 
                       group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-lg 
                       active:scale-95 active:rotate-180" 
            style={{ 
              color: '#ff5a5f',
              filter: 'drop-shadow(0 0 0.5rem rgba(255, 90, 95, 0.3))'
            }} 
          />
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <SearchBar 
            onSearch={setSearchTerm}
            placeholder={dictionary.search_guest_name || "Search guest name..."}
          />
        </div>
        <FilterSheet 
          title={dictionary.filter_bookings || "Filter Bookings"}
          sortOptions={sortOptions}
          filterOptions={bookingSourceOptions}
          currentSortField="start_date"
          currentSortOrder={sortOrder}
          currentFilter={sourceFilter}
          onSortFieldChange={() => {}} // Only one sort field, so no need to change
          onSortOrderChange={setSortOrder}
          onFilterChange={(filter) => setSourceFilter(filter as BookingSource | 'all')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBookings.map((booking: Booking) => (
          <BookingCard 
            key={booking.id} 
            booking={booking} 
            onDelete={handleRefresh}
            formattedStartDate={formatBookingDate(booking.start_date)}
            formattedEndDate={formatBookingDate(booking.end_date)}
          />
        ))}
      </div>
    </div>
  );
}
