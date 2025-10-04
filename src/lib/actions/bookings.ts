'use server';

import { z } from 'zod';
import { createActionClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Constants } from '@/lib/database.types';
import { BookingSource } from '@/lib/definitions';
import { getServerCsrfToken } from '@/lib/csrf';

// Zod schema for validation (reuse or adapt from form schema)
const BookingSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation
  start_date: z.coerce.date(), // Coerce string/date to Date object
  end_date: z.coerce.date(),
  guest_name: z.string().min(1, 'Guest name is required'),
  total_amount: z.coerce.number().min(0, 'Total amount must be positive'),
  prepayment: z.coerce.number().min(0, 'Prepayment must be positive').default(0),
  source: z.enum(Constants.public.Enums.booking_source, {
    errorMap: (issue, ctx) => ({ message: 'Please select a valid booking source.' }) // Optional custom error
 }),
 // ^^^ CHANGE HERE ^^^
 notes: z.string().optional().nullable(),
 property_id: z.string().uuid('Property is required'),
});

// Ensure end_date is after start_date
const RefinedBookingSchema = BookingSchema.refine(
    (data) => data.end_date > data.start_date,
    {
        message: 'End date must be after start date',
        path: ['end_date'], // Path of error
    }
);


export type BookingState = {
  errors?: {
    start_date?: string[];
    end_date?: string[];
    guest_name?: string[];
    total_amount?: string[];
    prepayment?: string[];
    source?: string[];
    notes?: string[];
    property_id?: string[];
    database?: string[]; // For general DB errors
  };
  message?: string | null;
};

export async function createOrUpdateBooking(prevState: BookingState | undefined, formData: FormData): Promise<BookingState> {
  // Verify CSRF token from form data
  const formCsrfToken = formData.get('csrf_token') as string;
  const serverCsrfToken = getServerCsrfToken();
  
  if (!formCsrfToken || !serverCsrfToken || formCsrfToken !== serverCsrfToken) {
    return { 
      errors: { database: ["Invalid security token"] },
      message: "Security verification failed" 
    };
  }

  const cookieStore = cookies();
  const supabase = createActionClient();

  // 1. Validate User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Authentication required.' };
  }

  // 2. Validate Form Data
  const validatedFields = RefinedBookingSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid form data. Please check the fields.',
    };
  }

  const { id, start_date, end_date, property_id, ...bookingData } = validatedFields.data;
  const startDateString = start_date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const endDateString = end_date.toISOString().split('T')[0];     // Format as YYYY-MM-DD

  try {
    let result;
    if (id) {
      // Update existing booking
      result = await supabase
        .from('bookings')
        .update({
          ...bookingData,
          start_date: startDateString,
          end_date: endDateString,
          property_id: property_id,
          user_id: user.id, // IMPORTANT: Always set user_id explicitly on update
          updated_at: new Date().toISOString(),
         })
        .eq('id', id)
        .select()
        .single();

    } else {
      // Create new booking
      result = await supabase
        .from('bookings')
        .insert({
           ...bookingData,
           start_date: startDateString,
           end_date: endDateString,
           property_id: property_id,
           user_id: user.id, // IMPORTANT: Always set user_id explicitly on insert
         })
        .select()
        .single();
    }

    const { error } = result;

    if (error) {
      console.error("Supabase DB Error:", error);
      return { message: `Database Error: ${error.message}` };
    }

  } catch (error) {
    console.error("Catch Error:", error);
    return { message: 'An unexpected error occurred.' };
  }

  // 3. Revalidate cache and redirect (or return success)
  revalidatePath('/dashboard'); // Revalidate calendar view
  revalidatePath('/bookings'); // Revalidate bookings list
  // You might want to redirect after success, e.g., redirect('/bookings')
  // For useFormState, returning a success message is often better
  return { message: id ? 'Booking updated successfully.' : 'Booking created successfully.' };
}

export async function deleteBooking(id: string, csrfToken: string) {
    const cookieStore = cookies();
    const supabase = createActionClient();
    const serverCsrfToken = getServerCsrfToken();
    
    // Add debugging logs
    console.log("Client CSRF token:", csrfToken.substring(0, 5) + "...");
    console.log("Server CSRF token:", serverCsrfToken.substring(0, 5) + "...");
    
    // Verify CSRF token
    if (!csrfToken || !serverCsrfToken || csrfToken !== serverCsrfToken) {
      console.error("CSRF token mismatch:", {
        clientToken: csrfToken ? csrfToken.substring(0, 10) + "..." : "null",
        serverToken: serverCsrfToken ? serverCsrfToken.substring(0, 10) + "..." : "null"
      });
      throw new Error('Security verification failed');
    }

    // 1. Validate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required.');
    }

    // Optional: Check if user owns this booking if needed, though trigger handles insert user_id
    // const { data: booking } = await supabase.from('bookings').select('user_id').eq('id', id).single();
    // if (booking?.user_id !== user.id) {
    //     throw new Error('Unauthorized');
    // }


    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) {
        console.error("Supabase Delete Error:", error);
        throw new Error(`Database Error: Failed to delete booking. ${error.message}`);
    }

    revalidatePath('/dashboard');
    revalidatePath('/bookings');
    // No redirect needed usually, the UI should update
    return { message: 'Booking deleted successfully.' };
}
