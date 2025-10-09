// components/bookings/BookingForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Constants } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl, // Make sure this is imported
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { BookingFormData } from '@/lib/definitions';
import { createOrUpdateBooking, BookingState } from '@/lib/actions/bookings';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';
import { getCsrfToken } from '@/lib/csrf-client';
import { createClient } from '@/lib/supabase/client';
import { getSelectedPropertyId } from '@/lib/property-utils';

// Zod schema update (unchanged)
const FormSchema = z.object({
  id: z.string().uuid().optional(),
  guest_name: z.string().min(1, 'Guest name is required').transform(val =>
    DOMPurify.sanitize(val)),
  start_date: z.date({ required_error: 'Start date is required.' }),
  end_date: z.date({ required_error: 'End date is required.' }),
  total_amount: z.coerce.number().min(0, 'Must be positive'),
  prepayment: z.coerce.number().min(0, 'Must be positive'),
  source: z.enum(Constants.public.Enums.booking_source, {
    errorMap: (issue, ctx) => ({ message: 'Please select a valid booking source.' })
  }),
  payment_status: z.enum(Constants.public.Enums.payment_status, {
    errorMap: (issue, ctx) => ({ message: 'Please select a valid payment status.' })
  }),
  notes: z.string().nullable().optional().transform(val =>
    val ? DOMPurify.sanitize(val) : val),
  property_id: z.string().uuid('Property is required'),
}).refine((data) => data.end_date > data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type FormSchemaType = z.infer<typeof FormSchema>;

interface BookingFormProps {
  initialData?: BookingFormData | null;
  dictionary?: any;
  onSuccess?: () => void;
}

function SubmitButton({ isEditing, dictionary }: { isEditing: boolean, dictionary?: any }) {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            style={{ backgroundColor: '#FF5A5F', color: 'white' }}
            className="hover:bg-[#FF5A5F]/90"
        >
        {pending ? (isEditing ? dictionary?.updating || 'Updating...' : dictionary?.saving || 'Creating...') :
                  (isEditing ? dictionary?.update_booking || 'Update Booking' : dictionary?.create_booking || 'Create Booking')}
        </Button>
    );
}

export function BookingForm({ initialData, dictionary = {}, onSuccess }: BookingFormProps) {
  const isEditing = !!initialData?.id;
  const router = useRouter();
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [propertyId, setPropertyId] = useState<string>('');

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id: initialData?.id ?? undefined,
      guest_name: initialData?.guest_name ?? '',
      // Ensure default date values are properly initialized as Date objects
      start_date: initialData?.start_date ? new Date(initialData.start_date) : undefined,
      end_date: initialData?.end_date ? new Date(initialData.end_date) : undefined,
      total_amount: initialData?.total_amount ?? 0,
      prepayment: initialData?.prepayment ?? 0,
      source: initialData?.source ?? 'DIRECT',
      payment_status: initialData?.payment_status ?? 'Pending',
      notes: initialData?.notes ?? '',
      property_id: propertyId,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
      
      const selectedPropertyId = await getSelectedPropertyId();
      setPropertyId(selectedPropertyId ?? '');
    };
    fetchData();
  }, []);

  // Update form property_id when propertyId changes
  useEffect(() => {
    if (propertyId) {
      form.setValue('property_id', propertyId);
    }
  }, [propertyId, form]);

  const initialState: BookingState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createOrUpdateBooking, initialState);

   useEffect(() => {
     if (state?.message) {
        if (state.errors && Object.keys(state.errors).length > 0) {
             toast.error(dictionary.action_failed || "Action Failed", {
                 description: state.message,
             });
        } else if (!state.errors) {
             toast.success(isEditing ? (dictionary.booking_updated || "Booking Updated") :
                                      (dictionary.booking_created || "Booking Created"), {
                 description: state.message,
             });
             if (onSuccess) {
               onSuccess();
             } else {
               setTimeout(() => router.push('/bookings'), 500);
             }
        }
     }
 }, [state, isEditing, router, dictionary, onSuccess]);

  const checkForOverlappingBookings = async (startDate: Date, endDate: Date, excludeBookingId?: string) => {
    const supabase = createClient();
    
    // Get the selected property ID
    const selectedPropertyId = await getSelectedPropertyId();
    
    if (!selectedPropertyId) {
      console.error('No property selected for overlap check');
      return null;
    }

    // Format dates for comparison - ensure we're using UTC dates for consistency
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    console.log('Checking for overlapping bookings:', {
      startDateStr,
      endDateStr,
      excludeBookingId,
      selectedPropertyId,
      originalStartDate: startDate,
      originalEndDate: endDate
    });
    
    // Overlap logic:
    // New booking overlaps with existing if:
    // new_start < existing_end AND new_end > existing_start
    // This means we need to adjust the comparison to account for exclusive end dates
    // Since bookings are stored as full days, we need to use lt/gt instead of lte/gte
    
    // Query for overlapping bookings - check if any booking overlaps with the selected dates
    // Overlap condition: new booking starts before existing booking ends AND new booking ends after existing booking starts
    // This translates to: existing_booking.start_date <= new_booking.end_date AND existing_booking.end_date >= new_booking.start_date
    // Build query conditionally
    // Correct overlap logic: new booking overlaps with existing if:
    // new_start < existing_end AND new_end > existing_start
    // This translates to: existing_booking.start_date < new_booking.end_date AND existing_booking.end_date > new_booking.start_date
    let query = supabase
      .from('bookings')
      .select('id, guest_name, start_date, end_date')
      .eq('property_id', selectedPropertyId) // Filter by selected property
      .lt('start_date', endDateStr)  // existing booking starts before new booking ends
      .gt('end_date', startDateStr)  // existing booking ends after new booking starts
      .limit(1);
    
    // Only add neq filter if excludeBookingId is provided
    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }
    
    const { data: overlappingBookings, error } = await query;
    
    console.log('Overlap check result:', { overlappingBookings, error });
    
    if (error) {
      console.error('Error checking for overlapping bookings:', error);
      return null;
    }
    
    return overlappingBookings && overlappingBookings.length > 0 ? overlappingBookings[0] : null;
  };

  const onSubmit = async (formData: FormSchemaType) => {
    console.log('Form submission started:', { formData, isEditing, initialData });
    
    // Check for overlapping bookings (only for new bookings or when dates change in edits)
    if (!isEditing || formData.start_date !== initialData?.start_date || formData.end_date !== initialData?.end_date) {
      console.log('Performing overlap check...');
      const overlappingBooking = await checkForOverlappingBookings(
        formData.start_date,
        formData.end_date,
        formData.id
      );
      
      if (overlappingBooking) {
        console.log('Overlap detected:', overlappingBooking);
        console.log('Raw dates from database:', {
          start_date: overlappingBooking.start_date,
          end_date: overlappingBooking.end_date,
          start_date_type: typeof overlappingBooking.start_date,
          end_date_type: typeof overlappingBooking.end_date
        });
        
        // Fix timezone issue - database dates are stored as UTC strings
        // Parse them as UTC to avoid timezone conversion
        const startDate = new Date(overlappingBooking.start_date + 'T00:00:00Z');
        const endDate = new Date(overlappingBooking.end_date + 'T00:00:00Z');
        
        console.log('Parsed dates (UTC):', { startDate, endDate });
        
        // Use UTC date formatting to avoid timezone issues
        const startDateStr = format(startDate, 'MMM dd');
        const endDateStr = format(endDate, 'MMM dd');
        
        console.log('Formatted dates for display:', { startDateStr, endDateStr });
        
        const description = dictionary.overlapping_booking_details
          ? dictionary.overlapping_booking_details
              .replace('{{guest_name}}', overlappingBooking.guest_name)
              .replace('{{start_date}}', startDateStr)
              .replace('{{end_date}}', endDateStr)
          : `These dates overlap with an existing booking for ${overlappingBooking.guest_name} (${startDateStr} - ${endDateStr})`;
        
        toast.error(dictionary.overlapping_booking_error || 'Booking conflict detected', {
          description,
        });
        return; // Stop form submission
      } else {
        console.log('No overlap detected');
      }
    } else {
      console.log('Skipping overlap check (editing without date change)');
    }

    const data = new FormData();
    data.append('csrf_token', csrfToken);

    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          const dateString = format(value, 'yyyy-MM-dd');
          data.append(key, dateString);
          console.log(`Submitting ${key}:`, dateString);
        } else {
          data.append(key, String(value));
        }
      }
    });
    console.log('Dispatching form data...');
    dispatch(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        {isEditing && <input type="hidden" {...form.register('id')} />}

        {/* Hidden property_id field - automatically uses the currently selected property */}
        <input type="hidden" {...form.register('property_id')} />

        {/* Guest Name and Source */}
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="guest_name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.guest_name || "Guest Name"}</FormLabel>
                <FormControl>
                  <Input placeholder={dictionary.guest_name_placeholder || "John Doe"} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem className="w-[200px]">
                <FormLabel>{dictionary.source || "Source"}</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => field.onChange('AIRBNB')}
                      className={`p-2 rounded-md border transition-all ${
                        field.value === 'AIRBNB'
                          ? 'bg-[#ffece6] border-[#ff5a5f] ring-2 ring-[#ff5a5f] ring-opacity-50'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Image
                        src="/airbnb-icon.svg"
                        alt="Airbnb"
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('BOOKING')}
                      className={`p-2 rounded-md border transition-all ${
                        field.value === 'BOOKING'
                          ? 'bg-[#e6f0ff] border-[#003580] ring-2 ring-[#003580] ring-opacity-50'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Image
                        src="/booking-icon.svg"
                        alt="Booking.com"
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange('DIRECT')}
                      className={`p-2 rounded-md border transition-all ${
                        field.value === 'DIRECT'
                          ? 'bg-[#e6fff0] border-[#10b981] ring-2 ring-[#10b981] ring-opacity-50'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Image
                        src="/euro-icon.svg"
                        alt="Cash"
                        width={20}
                        height={20}
                        className="h-5 w-5"
                      />
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         {/* Start Date Field */}
         <div className="flex gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.start_date || "Start Date"}</FormLabel>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    {/* Reverted FormControl back around the Button */}
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'pl-3 text-left font-normal w-full',
                          !field.value && 'text-muted-foreground'
                        )}
                        // Explicitly set type to button to prevent form submission issues
                        type="button"
                        // Pass react-hook-form's ref to the button element
                        ref={field.ref}
                        // Explicitly manage the popover open state
                        onClick={() => setStartDateOpen(true)}
                        // Add accessibility attributes commonly used for date pickers
                        role="combobox"
                        aria-expanded={startDateOpen}
                        aria-controls="start-date-calendar" // Link to calendar's id
                        // Ensure button is focusable for touch/keyboard
                        tabIndex={0}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>{dictionary.pick_date || "Pick a date"}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                              field.onChange(date); // Update react-hook-form value
                              setStartDateOpen(false); // Close popover after selection
                          }}
                          initialFocus
                          id="start-date-calendar" // Add ID to link with aria-controls
                      />
                  </PopoverContent>
                </Popover>
                {/* FormMessage should be directly under FormItem */}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date Field */}
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.end_date || "End Date"}</FormLabel>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'pl-3 text-left font-normal w-full',
                          !field.value && 'text-muted-foreground'
                        )}
                        type="button"
                        ref={field.ref}
                        onClick={() => setEndDateOpen(true)}
                        role="combobox"
                        aria-expanded={endDateOpen}
                        aria-controls="end-date-calendar" // Link to calendar's id
                        tabIndex={0}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>{dictionary.pick_date || "Pick a date"}</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setEndDateOpen(false);
                      }}
                      disabled={(date) =>
                          date < (form.getValues("start_date") || new Date(new Date().setHours(0, 0, 0, 0)))
                        }
                      initialFocus
                      id="end-date-calendar" // Add ID to link with aria-controls
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
                {form.formState.errors.end_date?.message && !form.getFieldState('end_date').error && (
                  <p className="text-sm font-medium text-destructive">{form.formState.errors.end_date.message}</p>
                )}
              </FormItem>
            )}
          />
        </div>

        {/* Payment Status */}
        <FormField
          control={form.control}
          name="payment_status"
          render={({ field }) => (
            <FormItem className="w-[200px]">
              <FormLabel>{dictionary.payment_status || "Payment Status"}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Pending">
                    {dictionary.pending || "Pending"}
                  </SelectItem>
                  <SelectItem value="Paid">
                    {dictionary.paid || "Paid"}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amounts */}
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.total_amount || "Total Amount"} (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="prepayment"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.prepayment || "Prepayment"} (€)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.notes || "Notes"}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={dictionary.booking_notes_placeholder || "Any relevant notes about the booking..."}
                  className="resize-none"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error messages and buttons */}
        {state?.errors?.database && (
          <p className="text-sm font-medium text-destructive">{state.errors.database.join(', ')}</p>
        )}

        {/* Hidden CSRF token input */}
        <input type="hidden" name="csrf_token" value={csrfToken} />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess ? onSuccess() : router.back()}
          >
            {dictionary.cancel || "Cancel"}
          </Button>
          <SubmitButton isEditing={isEditing} dictionary={dictionary} />
        </div>
      </form>
    </Form>
  );
}