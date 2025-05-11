-- Add airbnb_id column to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS airbnb_id TEXT DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_airbnb_id ON public.bookings(airbnb_id);

-- Add comment for documentation
COMMENT ON COLUMN public.bookings.airbnb_id IS 'Unique identifier from Airbnb iCal feed';