-- Add color column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6'; -- Default to blue-500

-- Add ical_token column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ical_token text UNIQUE;

-- Create index for faster lookups by token
CREATE INDEX IF NOT EXISTS profiles_ical_token_idx ON public.profiles(ical_token);
