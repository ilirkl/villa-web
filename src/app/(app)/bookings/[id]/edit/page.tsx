// Example: app/(app)/bookings/[id]/edit/page.tsx
import { BookingForm } from '@/components/bookings/BookingForm';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

interface EditBookingPageProps {
    params: { id: string };
}

export default async function EditBookingPage({ params }: EditBookingPageProps) {
  const { id } = params;
  const supabase = createClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !booking) {
    notFound(); // Show 404 if booking not found or error
  }

  // Prepare initial data for the form, converting date strings to Date objects
  const initialFormData = {
      ...booking,
      start_date: new Date(booking.start_date),
      end_date: new Date(booking.end_date),
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Booking</h1>
      <BookingForm initialData={initialFormData} />
    </div>
  );
}