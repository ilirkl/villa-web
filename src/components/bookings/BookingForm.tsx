// components/bookings/BookingForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Constants } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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

// Zod schema update
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
  notes: z.string().nullable().optional().transform(val => 
    val ? DOMPurify.sanitize(val) : val),
}).refine((data) => data.end_date > data.start_date, {
  message: 'End date must be after start date',
  path: ['end_date'],
});

type FormSchemaType = z.infer<typeof FormSchema>;

interface BookingFormProps {
  initialData?: BookingFormData | null;
  dictionary?: any;
  onSuccess?: () => void; // New prop for modal integration
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

  // Fetch CSRF token on component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
    };
    
    fetchCsrfToken();
  }, []);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id: initialData?.id ?? undefined,
      guest_name: initialData?.guest_name ?? '',
      start_date: initialData?.start_date ?? undefined,
      end_date: initialData?.end_date ?? undefined,
      total_amount: initialData?.total_amount ?? 0,
      prepayment: initialData?.prepayment ?? 0,
      source: initialData?.source ?? 'DIRECT', 
      notes: initialData?.notes ?? '',
    },
  });

  const initialState: BookingState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createOrUpdateBooking, initialState);

   // Show toast on success/error messages from server action using sonner
   useEffect(() => {
     if (state?.message) {
        if (state.errors && Object.keys(state.errors).length > 0) {
             // Error Toast
             toast.error(dictionary.action_failed || "Action Failed", {
                 description: state.message,
             });
        } else if (!state.errors) {
             // Success Toast
             toast.success(isEditing ? (dictionary.booking_updated || "Booking Updated") : 
                                      (dictionary.booking_created || "Booking Created"), {
                 description: state.message,
             });
             
             // Call onSuccess if provided (for modal use)
             if (onSuccess) {
               onSuccess();
             } else {
               // Original redirect behavior for page-based form
               setTimeout(() => router.push('/bookings'), 500);
             }
        }
     }
 }, [state, isEditing, router, dictionary, onSuccess]);

  // onSubmit remains the same
  const onSubmit = (formData: FormSchemaType) => {
    const data = new FormData();
    
    // Add CSRF token to form data
    data.append('csrf_token', csrfToken);
    
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (value instanceof Date) {
          // Ensure we're using the correct date by handling timezone offset
          const date = new Date(value);
          // Format date as YYYY-MM-DD, ensuring we use UTC to avoid timezone issues
          const dateString = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .split('T')[0];
          data.append(key, dateString);
          console.log(`Submitting ${key}:`, dateString); // Debug log
        } else {
          data.append(key, String(value));
        }
      }
    });
    dispatch(data);
  };

  // Form rendering remains the same
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        {isEditing && <input type="hidden" {...form.register('id')} />}

        {/* Guest Name and Source in one line */}
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={dictionary.select_booking_source || "Select booking source"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Constants.public.Enums.booking_source.map((sourceValue) => (
                      <SelectItem key={sourceValue} value={sourceValue}>
                        {sourceValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

         {/* Dates in one line */}
         <div className="flex gap-4">
          <FormField
            control={form.control}
            name="start_date"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.start_date || "Start Date"}</FormLabel>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    {/* MODIFICATION: FormControl removed from here. */}
                    <Button
                      variant={'outline'}
                      className={cn(
                        'pl-3 text-left font-normal w-full',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>{dictionary.pick_date || "Pick a date"}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* MODIFICATION: FormControl wraps the Calendar. */}
                    <FormControl>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setStartDateOpen(false);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                    </FormControl>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_date"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.end_date || "End Date"}</FormLabel>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    {/* MODIFICATION: FormControl removed from here. */}
                    <Button
                      variant={'outline'}
                      className={cn(
                        'pl-3 text-left font-normal w-full',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP') : <span>{dictionary.pick_date || "Pick a date"}</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* MODIFICATION: FormControl wraps the Calendar. */}
                    <FormControl>
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
                      />
                    </FormControl>
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
        {/* Amounts in one line */}
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
