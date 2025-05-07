// app/(app)/bookings/add/page.tsx
import { BookingForm } from '@/components/bookings/BookingForm';
import { getDictionary } from '@/lib/dictionary';

export default async function AddBookingPage({ params }: { params: { lang: string } }) {
  const dictionary = await getDictionary(params.lang as 'en' | 'sq');
  
  return (
    <div> 
      <h1 className="text-2xl font-semibold mb-6">{dictionary.add_new_booking || "Add New Booking"}</h1>
      <BookingForm dictionary={dictionary} />
    </div>
  );
}
