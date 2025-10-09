-- Migration to add payment_status columns to bookings and expenses tables

-- Create payment_status enum type
CREATE TYPE payment_status AS ENUM ('Paid', 'Pending');

-- Add payment_status column to bookings table with default 'Pending'
ALTER TABLE bookings 
ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'Pending';

-- Add payment_status column to expenses table with default 'Pending'
ALTER TABLE expenses 
ADD COLUMN payment_status payment_status NOT NULL DEFAULT 'Pending';

-- Add indexes for better query performance
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX idx_expenses_payment_status ON expenses(payment_status);