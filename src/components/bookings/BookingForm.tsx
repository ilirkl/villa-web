// components/bookings/BookingForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Constants } from '@/lib/database.types'; // <--- IMPORT Constants
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
import { useEffect } from 'react';
import { toast } from "sonner"; // Import sonner toast
import { useRouter } from 'next/navigation';

// Zod schema (remains the same)
const FormSchema = z.object({
  id: z.string().uuid().optional(),
  guest_name: z.string().min(1, 'Guest name is required'),
  start_date: z.date({ required_error: 'Start date is required.' }),
  end_date: z.date({ required_error: 'End date is required.' }),
  total_amount: z.coerce.number().min(0, 'Must be positive'),
  prepayment: z.coerce.number().min(0, 'Must be positive').default(0),
  source: z.enum(Constants.public.Enums.booking_source, {
    errorMap: (issue, ctx) => ({ message: 'Please select a valid booking source.' }) // Optional custom error
 }),  notes: z.string().nullable().optional(),
}).refine((data) => data.end_date > data.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  });

type FormSchemaType = z.infer<typeof FormSchema>;

interface BookingFormProps {
  initialData?: BookingFormData | null;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Booking' : 'Create Booking')}
        </Button>
    );
}

export function BookingForm({ initialData }: BookingFormProps) {
  const isEditing = !!initialData?.id;
  const router = useRouter();
  // Remove useToast hook: const { toast } = useToast();

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
             toast.error("Action Failed", {
                 description: state.message,
                 // you can add duration, action buttons etc. here
             });
        } else if (!state.errors) {
             // Success Toast
             toast.success(isEditing ? "Booking Updated" : "Booking Created", {
                 description: state.message,
             });
             if (!isEditing) {
                // Debounce or delay redirect slightly to allow user to see toast
                 setTimeout(() => router.push('/bookings'), 500);
             } else {
                 // Force a hard refresh of the page data
                 router.refresh();
                 // Optional: redirect back to bookings list
                 setTimeout(() => router.push('/bookings'), 500);
             }
        }
     }
     // Remove toast from dependency array
 }, [state, isEditing, router]);

  // onSubmit remains the same
  const onSubmit = (formData: FormSchemaType) => {
    const data = new FormData();
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
                <FormLabel>Guest Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
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
                <FormLabel>Source</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select booking source" />
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
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'pl-3 text-left font-normal w-full',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
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
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'pl-3 text-left font-normal w-full',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < (form.getValues("start_date") || new Date(new Date().setHours(0, 0, 0, 0)))
                      }
                      initialFocus
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

        {/* Amounts in one line */}
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="total_amount"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Total Amount (€)</FormLabel>
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
                <FormLabel>Prepayment (€)</FormLabel>
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
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any relevant notes about the booking..."
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <SubmitButton isEditing={isEditing} />
        </div>
      </form>
    </Form>
  );
}
