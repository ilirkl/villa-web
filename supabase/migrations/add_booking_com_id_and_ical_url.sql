-- Add booking_com_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_com_id TEXT DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_booking_com_id ON public.bookings(booking_com_id);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.booking_com_id IS 'Unique identifier from Booking.com iCal feed';

-- Add booking_com_ical_url column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS booking_com_ical_url TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.booking_com_ical_url IS 'URL for Booking.com iCal feed';