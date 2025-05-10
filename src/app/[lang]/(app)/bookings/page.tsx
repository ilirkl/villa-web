'use client';

import { useEffect, useState, Suspense, JSX } from 'react';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Booking, BookingFormData, BookingSource } from '@/lib/definitions';
import { createClient } from '@/lib/supabase/client';
import { SearchBar } from '@/components/SearchBar';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { parse, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Database } from '@/lib/database.types';
import { toast } from 'sonner';

// Dynamically import components
const BookingCard = dynamic(() => import('@/components/bookings/BookingCard').then(mod => ({ default: mod.BookingCard })), {
  loading: () => <div className="animate-pulse h-32 bg-muted rounded-lg"></div>
});

const FilterSheet = dynamic(() => import('@/components/FilterSheet').then(mod => ({ default: mod.FilterSheet })));
const BookingForm = dynamic(() => import('@/components/bookings/BookingForm').then(mod => ({ default: mod.BookingForm })));

const bookingSourceOptions = [
  { id: 'DIRECT', name: 'Direct', color: '#10b981' },
  { id: 'AIRBNB', name: 'Airbnb', color: '#ff5a5f' },
  { id: 'BOOKING', name: 'Booking', color: '#003580' },
];

const sortOptions = [
  { field: 'start_date', label: 'Check-in Date' }
];

// Helper function to safely parse and format dates
const formatBookingDate = (dateString: string | null | undefined, lang: string | string[]): string => {
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dictionary, setDictionary] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<BookingFormData | null>(null);
  
  const { lang } = useParams();

  // Define modalTitle based on whether we're adding or editing
  const modalTitle = currentBooking?.id 
    ? (dictionary.edit_booking || "Edit Booking") 
    : (dictionary.add_new_booking || "Add New Booking");

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

  // Function to handle opening the modal for adding a new booking
  const handleAddBooking = () => {
    setCurrentBooking(null); // Reset current booking (for adding new)
    setIsModalOpen(true);
  };

  // Function to handle opening the modal for editing an existing booking
  const handleEditBooking = async (bookingId: string) => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();
        
      if (error) throw error;
      
      // Convert date strings to Date objects for the form
      const bookingData: BookingFormData = {
        ...data,
        start_date: data.start_date ? new Date(data.start_date + 'T00:00:00') : undefined,
        end_date: data.end_date ? new Date(data.end_date + 'T00:00:00') : undefined,
      };
      
      setCurrentBooking(bookingData);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Error fetching booking:', err);
      toast.error(dictionary.error_loading_booking || "Error loading booking");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle form submission success
  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setCurrentBooking(null);
    handleRefresh();
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
  }, [sortOrder, refreshTrigger]);

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

  // Replace the AddButton component with this floating version
  const AddButton = () => (
    <button 
      onClick={handleAddBooking}
      className="fixed bottom-25 right-6 z-10 group"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-white shadow-lg"></div>
        <PlusCircle 
          className="h-12 w-12 transition-all duration-300 ease-in-out transform 
                     group-hover:scale-110 group-hover:rotate-90 
                     active:scale-95 active:rotate-180 relative z-10" 
          style={{ 
            color: '#ff5a5f',
            filter: 'drop-shadow(0 0 0.75rem rgba(255, 90, 95, 0.5))'
          }} 
        />
        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 
                      transition-opacity duration-300 z-20"></div>
      </div>
    </button>
  );

  // Render loading state
  if (isLoading) {
    return <div>{dictionary.loading_bookings || 'Loading bookings...'}</div>;
  }

  // Render error state
  if (error) {
    return (
      <div className="pb-18">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-1xl font-semibold">{dictionary.bookings || 'Bookings'}</h3>
          <AddButton />
        </div>
        <p>{dictionary.error_loading_bookings || 'Error loading bookings:'} {error}</p>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
            </DialogHeader>
            {isModalOpen && (
              <BookingForm 
                initialData={currentBooking} 
                dictionary={dictionary} 
                onSuccess={handleFormSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render empty state
  if (!bookings || bookings.length === 0) {
    return (
      <div className="pb-18">
        <div className="flex justify-between items-center mb-1">
          <h3 className="text-1xl font-semibold">{dictionary.bookings || 'Bookings'}</h3>
          <AddButton />
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
            onSortFieldChange={() => {}}
            onSortOrderChange={setSortOrder}
            onFilterChange={(filter) => setSourceFilter(filter as BookingSource | 'all')}
          />
        </div>
        
        <p className="text-center py-10">{dictionary.no_bookings_found || 'No bookings found.'}</p>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
            </DialogHeader>
            {isModalOpen && (
              <BookingForm 
                initialData={currentBooking} 
                dictionary={dictionary} 
                onSuccess={handleFormSuccess} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  function renderBookingCard(booking: { created_at: string | null; end_date: string; guest_name: string; id: string; notes: string | null; prepayment: number; source: Database["public"]["Enums"]["booking_source"]; start_date: string; total_amount: number; updated_at: string | null; user_id: string | null; }): JSX.Element {
    // Format dates for display
    const formattedStartDate = formatBookingDate(booking.start_date, lang);
    const formattedEndDate = formatBookingDate(booking.end_date, lang);
    
    return (
      <BookingCard
        key={booking.id}
        booking={booking}
        formattedStartDate={formattedStartDate}
        formattedEndDate={formattedEndDate}
        onDelete={handleRefresh}
        onEdit={() => handleEditBooking(booking.id)}
      />
    );
  }

  // Render normal state with bookings
  return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-1xl font-semibold">{dictionary.bookings || 'Bookings'}</h3>
        <AddButton />
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
          onSortFieldChange={() => {}}
          onSortOrderChange={setSortOrder}
          onFilterChange={(filter) => setSourceFilter(filter as BookingSource | 'all')}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBookings.map(booking => renderBookingCard(booking))}
      </div>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          {isModalOpen && (
            <BookingForm 
              initialData={currentBooking} 
              dictionary={dictionary} 
              onSuccess={handleFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
