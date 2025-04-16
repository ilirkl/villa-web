// Example: app/(app)/bookings/add/page.tsx
import { BookingForm } from '@/components/bookings/BookingForm';

export default function AddBookingPage() {
  return (
    <div> 
      <h1 className="text-2xl font-semibold mb-6">Add New Booking</h1>
      <BookingForm />
    </div>
  );
}
