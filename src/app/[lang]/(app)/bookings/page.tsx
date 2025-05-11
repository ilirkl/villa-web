'use client';

import { useEffect, useState, Suspense, JSX } from 'react';
import { PlusCircle, LayoutGrid, Table as TableIcon } from 'lucide-react';
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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

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
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [isMobile, setIsMobile] = useState(false);
  // Add state to track expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // Add this useEffect to detect mobile screens
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileScreen = window.innerWidth < 768;
      setIsMobile(isMobileScreen);
      
      // Set default view mode based on screen size
      // Mobile: card view, Non-mobile: table view
      setViewMode(isMobileScreen ? 'card' : 'table');
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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

  function renderBookingCard(booking: Booking): JSX.Element {
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

  // Add this function to render the table view
  function renderBookingTable(): JSX.Element {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dictionary.guest_name || 'Guest Name'}</TableHead>
            <TableHead>{dictionary.dates || 'Dates'}</TableHead>
            <TableHead>{dictionary.source || 'Source'}</TableHead>
            <TableHead className="text-right">{dictionary.amount || 'Amount'}</TableHead>
            <TableHead className="text-right">{dictionary.actions || 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredBookings.map((booking) => {
            const formattedStartDate = formatBookingDate(booking.start_date, lang);
            const formattedEndDate = formatBookingDate(booking.end_date, lang);
            const isExpanded = expandedRows.has(booking.id);
            
            return (
              <>
                <TableRow 
                  key={booking.id} 
                  className={`cursor-pointer ${isExpanded ? 'bg-muted/50' : ''}`}
                  onClick={() => toggleRowExpansion(booking.id)}
                >
                  <TableCell className="font-medium">{booking.guest_name}</TableCell>
                  <TableCell>{formattedStartDate} - {formattedEndDate}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                          style={{ 
                            backgroundColor: booking.source === 'AIRBNB' ? '#ffece6' : 
                                            booking.source === 'BOOKING' ? '#e6f0ff' : '#e6fff0',
                            color: booking.source === 'AIRBNB' ? '#ff5a5f' : 
                                   booking.source === 'BOOKING' ? '#003580' : '#10b981'
                          }}>
                      {booking.source}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">€{booking.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row expansion when clicking the edit button
                        handleEditBooking(booking.id);
                      }}
                    >
                      {dictionary.edit || 'Edit'}
                    </Button>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${booking.id}-expanded`} className="bg-muted/30">
                    <TableCell colSpan={5} className="px-4 py-3">
                      <div className="text-sm">
                        <span className="font-medium"></span> 
                        {booking.notes ? (
                          <span className="ml-2">{booking.notes}</span>
                        ) : (
                          <span className="ml-2 text-muted-foreground italic">
                            {dictionary.no_notes || 'No notes available'}
                          </span>
                        )}
                      </div>
                      {booking.prepayment > 0 && (
                        <div className="text-sm mt-1">
                          <span className="font-medium">{dictionary.prepayment || 'Prepayment'}:</span> 
                          <span className="ml-2">€{booking.prepayment.toLocaleString()}</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  // Function to toggle row expansion
  const toggleRowExpansion = (bookingId: string) => {
    setExpandedRows(prevExpandedRows => {
      const newExpandedRows = new Set(prevExpandedRows);
      if (newExpandedRows.has(bookingId)) {
        newExpandedRows.delete(bookingId);
      } else {
        newExpandedRows.add(bookingId);
      }
      return newExpandedRows;
    });
  };

  // Render loading state
  if (isLoading) {
    return <div>{dictionary.loading_bookings || 'Loading bookings...'}</div>;
  }

  // Render error state
  if (error) {
    return (
      <div className="pb-18">
        <div className="flex justify-between items-center mb-1">
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

  // Render normal state with bookings
  return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <AddButton />
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <SearchBar 
            onSearch={setSearchTerm}
            placeholder={dictionary.search_guest_name || "Search guest name..."}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle Button - Only show on non-mobile */}
          <div className="hidden md:flex border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <LayoutGrid size={16} className="mr-1" />
              {dictionary.cards || 'Cards'}
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <TableIcon size={16} className="mr-1" />
              {dictionary.table || 'Table'}
            </Button>
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
      </div>

      {/* Conditionally render card or table view based on viewMode */}
      {viewMode === 'card' || isMobile ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBookings.map(booking => renderBookingCard(booking))}
        </div>
      ) : (
        <div className="rounded-md border">
          {renderBookingTable()}
        </div>
      )}
      
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
