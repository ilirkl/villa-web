'use client';

import { useEffect, useState, JSX } from 'react';
import { PlusCircle, LayoutGrid, Table as TableIcon, Pencil, Trash2, FileText } from 'lucide-react';
import Image from 'next/image';
import { Booking, BookingFormData, BookingSource } from '@/lib/definitions';
import { createClient } from '@/lib/supabase/client';
import { SearchBar } from '@/components/SearchBar';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { parse, format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteBooking } from '@/lib/actions/bookings';
import { generateInvoice } from '@/lib/actions/invoice';
import { getCsrfToken, resetCsrfToken } from '@/lib/csrf-client';
import { PropertySwitcher } from '@/components/shared/PropertySwitcher';

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

const paymentStatusOptions = [
  { id: 'Paid', name: 'Paid', color: '#10b981' },
  { id: 'Pending', name: 'Pending', color: '#f59e0b' },
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
    return dateString;
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
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
      
      // Get the current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Authentication required');
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .eq('user_id', user.id) // IMPORTANT: Explicitly check user ownership
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
      try {
        const supabase = createClient();
        
        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Authentication required');
          setIsLoading(false);
          return;
        }

        // Get properties with auto-selection for single property case
        const { getPropertiesWithAutoSelection, refreshSelectedPropertyId } = await import('@/lib/property-utils');
        
        // Force refresh the selected property to avoid cache issues
        const refreshedPropertyId = await refreshSelectedPropertyId();
        
        const { properties, selectedPropertyId } = await getPropertiesWithAutoSelection(supabase);
        
        // Use the refreshed property ID if available, otherwise use the one from auto-selection
        const finalPropertyId = refreshedPropertyId || selectedPropertyId;
        
        console.log('Bookings page - User ID:', user.id);
        console.log('Bookings page - Properties found:', properties.length);
        console.log('Bookings page - Selected property ID:', finalPropertyId);
        
        if (properties.length === 0) {
          setError('No properties found. Please add a property first.');
          setIsLoading(false);
          return;
        }
        
        if (!finalPropertyId) {
          setError('Please select a property');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id) // IMPORTANT: Explicitly filter by user_id
          .eq('property_id', finalPropertyId)
          .order('start_date', { ascending: sortOrder === 'asc' });

        console.log('Bookings query - User ID:', user.id);
        console.log('Bookings query - Property ID:', finalPropertyId);
        console.log('Bookings query - Results:', data?.length || 0);

        if (error) {
          setError(error.message);
        } else {
          setBookings(data || []);
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load bookings');
      } finally {
        setIsLoading(false);
      }
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

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      result = result.filter(booking => booking.payment_status === paymentStatusFilter);
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(booking =>
        booking.guest_name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredBookings(result);
  }, [bookings, sourceFilter, paymentStatusFilter, searchTerm]);

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
        dictionary={dictionary}
      />
    );
  }

  // Add function to determine payment status badge styling (consistent with bookings card)
  const getPaymentStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border border-green-200'; // Green for paid
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200'; // Yellow for pending
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200'; // Gray for unknown
    }
  };

  // Add this function to render the table view
  function renderBookingTable(): JSX.Element {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">{dictionary.guest_name || 'Guest Name'}</TableHead>
            <TableHead className="font-bold">{dictionary.dates || 'Dates'}</TableHead>
            <TableHead className="font-bold">{dictionary.source || 'Source'}</TableHead>
            <TableHead className="font-bold">{dictionary.payment_status || 'Payment Status'}</TableHead>
            <TableHead className="text-right font-bold">{dictionary.amount || 'Amount'}</TableHead>
            <TableHead className="text-right font-bold">{dictionary.prepayment || 'Prepayment'}</TableHead>
            <TableHead className="text-right font-bold">{dictionary.actions || 'Actions'}</TableHead>
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
                    <div className="flex items-center justify-center">
                      {booking.source === 'AIRBNB' && (
                        <Image
                          src="/airbnb-icon.svg"
                          alt="Airbnb"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      )}
                      {booking.source === 'BOOKING' && (
                        <Image
                          src="/booking-icon.svg"
                          alt="Booking.com"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      )}
                      {booking.source === 'DIRECT' && (
                        <Image
                          src="/euro-icon.svg"
                          alt="Cash"
                          width={20}
                          height={20}
                          className="h-5 w-5"
                        />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeStyle(booking.payment_status)}`}>
                      {booking.payment_status === 'Paid' ? (dictionary.paid || 'Paid') : (dictionary.pending || 'Pending')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">€{booking.total_amount?.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {booking.prepayment > 0 ? (
                      <span className="text-green-600 font-medium">€{booking.prepayment?.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row expansion
                          handleDownloadInvoice(booking.id, booking.guest_name, booking.start_date);
                        }}
                        className="p-0 bg-transparent border-none"
                      >
                        <FileText className="h-5 w-5 transition-all duration-300 ease-in-out transform
                                text-[#ff5a5f] hover:scale-110
                                active:scale-95 cursor-pointer" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row expansion
                          handleEditBooking(booking.id);
                        }}
                        className="p-0 bg-transparent border-none"
                      >
                        <Pencil className="h-5 w-5 transition-all duration-300 ease-in-out transform
                                text-[#ff5a5f] hover:scale-110
                                active:scale-95 active:rotate-12 cursor-pointer" />
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="p-0 bg-transparent border-none"
                          >
                            <Trash2 className="h-5 w-5 text-[#ff5a5f] cursor-pointer" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{dictionary.are_you_sure || 'Are you sure?'}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {(dictionary.delete_booking_confirmation || 'This action cannot be undone. This will permanently delete the booking for {guest}.')
                                .replace('{guest}', booking.guest_name || '')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{dictionary.cancel || 'Cancel'}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(booking.id)}
                              style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                              className='hover:bg-[#FF5A5F]/90'
                            >
                              {dictionary.delete || 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow key={`${booking.id}-expanded`} className="bg-muted/30">
                    <TableCell colSpan={7} className="px-4 py-3">
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

  // Add this function to your component
  const handleDelete = async (bookingId: string) => {
    try {
      // Always get a fresh token right before deletion
      resetCsrfToken(); // Clear any cached token
      const freshToken = await getCsrfToken(true); // Force refresh
      
      await deleteBooking(bookingId, freshToken);
      toast.success('Booking deleted successfully');
      handleRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete booking');
    }
  };

  // Handle invoice download for table view
  const handleDownloadInvoice = async (bookingId: string, guestName: string, startDate: string) => {
    try {
      toast.info(dictionary.generating_invoice || 'Generating invoice...');
      
      // We'll rely on authentication instead of CSRF token
      const response = await generateInvoice(bookingId, 'not-used');

      if (!response) {
        throw new Error('No response received from server');
      }

      let pdfBuffer: Uint8Array;
      if (response instanceof Uint8Array) {
        pdfBuffer = response;
      } else if (Array.isArray(response)) {
        pdfBuffer = new Uint8Array(response);
      } else if (typeof response === 'object' && response !== null && 'buffer' in response) {
        // Handle ArrayBuffer-like objects
        pdfBuffer = new Uint8Array(response as ArrayBufferLike);
      } else {
        throw new Error(`Unexpected response type: ${typeof response}`);
      }

      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const newWindow = window.open(url, '_blank');

      if (!newWindow) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${guestName}-${format(new Date(startDate), 'yyyy-MM-dd')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      toast.success(dictionary.invoice_generated_successfully || 'Invoice generated successfully');
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : (dictionary.failed_to_generate_invoice || 'Failed to generate invoice')
      );
    }
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

  if (!bookings || bookings.length === 0) {
    return (
      <div className="pb-18">
        <div className="flex justify-between items-center mb-1">
          <AddButton />
        </div>
  
        {/* Property Switcher - Add this to allow manual property selection */}
        <div className="mb-4">
          <PropertySwitcher dictionary={dictionary} onPropertyChange={handleRefresh} />
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
            paymentStatusFilterOptions={paymentStatusOptions}
            currentPaymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
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
            paymentStatusFilterOptions={paymentStatusOptions}
            currentPaymentStatusFilter={paymentStatusFilter}
            onPaymentStatusFilterChange={setPaymentStatusFilter}
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
