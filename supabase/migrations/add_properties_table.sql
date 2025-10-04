-- Add properties table and update existing tables for multi-property support

-- Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Add property_id to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS property_id uuid,
ADD CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);

-- Add property_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN IF NOT EXISTS property_id uuid,
ADD CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id);

-- Add default_property_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_property_id uuid,
ADD CONSTRAINT profiles_default_property_id_fkey FOREIGN KEY (default_property_id) REFERENCES public.properties(id);

-- Enable RLS on properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for properties table
CREATE POLICY "Users can view their own properties" ON public.properties
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties" ON public.properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" ON public.properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" ON public.properties
  FOR DELETE USING (auth.uid() = user_id);

-- Update RLS policies for bookings table to include property_id
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
CREATE POLICY "Users can create their own bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own bookings" ON public.bookings;
CREATE POLICY "Users can delete their own bookings" ON public.bookings
  FOR DELETE USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

-- Update RLS policies for expenses table to include property_id
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create their own expenses" ON public.expenses;
CREATE POLICY "Users can create their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  ) WITH CHECK (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (
    auth.uid() = user_id AND 
    property_id IN (SELECT id FROM public.properties WHERE user_id = auth.uid())
  );

-- Create function to set default property for existing users
CREATE OR REPLACE FUNCTION public.create_default_property_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_property_id uuid;
BEGIN
  -- Create a default property for the new user
  INSERT INTO public.properties (name, user_id)
  VALUES ('My Villa', NEW.id)
  RETURNING id INTO default_property_id;
  
  -- Update the profile with the default property
  UPDATE public.profiles 
  SET default_property_id = default_property_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to create default property when user signs up
DROP TRIGGER IF EXISTS create_default_property ON auth.users;
CREATE TRIGGER create_default_property
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_property_for_user();

-- Migrate existing data to have property assignments
DO $$ 
DECLARE
  user_record RECORD;
  property_record RECORD;
BEGIN
  -- For each user, create a default property if they don't have one
  FOR user_record IN SELECT DISTINCT user_id FROM public.bookings WHERE user_id IS NOT NULL
  LOOP
    -- Check if user already has properties
    SELECT id INTO property_record FROM public.properties WHERE user_id = user_record.user_id LIMIT 1;
    
    IF property_record.id IS NULL THEN
      -- Create default property
      INSERT INTO public.properties (name, user_id)
      VALUES ('My Villa', user_record.user_id)
      RETURNING id INTO property_record;
    END IF;
    
    -- Update bookings with the property_id
    UPDATE public.bookings 
    SET property_id = property_record.id
    WHERE user_id = user_record.user_id AND property_id IS NULL;
    
    -- Update expenses with the property_id
    UPDATE public.expenses 
    SET property_id = property_record.id
    WHERE user_id = user_record.user_id AND property_id IS NULL;
    
    -- Update profile with default property
    UPDATE public.profiles 
    SET default_property_id = property_record.id
    WHERE id = user_record.user_id AND default_property_id IS NULL;
  END LOOP;
END $$;