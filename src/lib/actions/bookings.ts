'use server';

import { z } from 'zod';
import { createActionClient } from '@/lib/supabase/server'; // Use action client if needed
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Constants } from '@/lib/database.types'; // Import the generated Constants
import { BookingSource } from '@/lib/definitions'; // Import your enum/type

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
    database?: string[]; // For general DB errors
  };
  message?: string | null;
};

export async function createOrUpdateBooking(prevState: BookingState | undefined, formData: FormData): Promise<BookingState> {
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

  const { id, start_date, end_date, ...bookingData } = validatedFields.data;
  const startDateString = start_date.toISOString().split('T')[0];
  const endDateString = end_date.toISOString().split('T')[0];

  // Add debug logging
  console.log('Received dates:', {
    original_start: start_date,
    original_end: end_date,
    startDateString,
    endDateString
  });

  try {
    let result;
    if (id) {
      // Update existing booking
      const updateData = {
        start_date: startDateString,
        end_date: endDateString,
        ...bookingData,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      
      console.log('Update data:', updateData);

      result = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (result.error) {
        console.error("Update Error:", result.error);
        return {
          message: `Failed to update booking: ${result.error.message}`,
          errors: { database: [result.error.message] }
        };
      }

      // Verify the update
      const verifyResult = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      console.log('Updated booking:', verifyResult.data);

    } else {
      // Create new booking
      result = await supabase
        .from('bookings')
        .insert({
          start_date: startDateString,
          end_date: endDateString,
          ...bookingData,
        })
        .select()
        .single();

      if (result.error) {
        console.error("Insert Error:", result.error);
        return {
          message: `Failed to create booking: ${result.error.message}`,
          errors: { database: [result.error.message] }
        };
      }
    }

  } catch (error) {
    console.error("Unexpected Error:", error);
    return {
      message: 'An unexpected error occurred.',
      errors: { database: ['Internal server error'] }
    };
  }

  // Force revalidation of all relevant paths
  revalidatePath('/dashboard');
  revalidatePath('/bookings');
  revalidatePath(`/bookings/${id}`);
  revalidatePath(`/bookings/${id}/edit`);
  
  return { 
    message: id ? 'Booking updated successfully.' : 'Booking created successfully.',
  };
}

export async function deleteBooking(id: string) {
    const cookieStore = cookies();
    const supabase = createActionClient();

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
