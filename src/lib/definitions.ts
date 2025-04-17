// src/lib/definitions.ts

import { Database } from './database.types'; // Import the generated types

// --- CORRECT: Export the BookingSource enum type FROM generated types ---
export type BookingSource = Database['public']['Enums']['booking_source'];
// --- DELETE the line below (if it still exists): ---
// export type BookingSource = 'DIRECT' | 'AIRBNB' | 'BOOKING'; // <-- DELETE THIS MANUAL REDECLARATION

// --- Your other type exports remain the same ---
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Expense = Database['public']['Tables']['expenses']['Row'] & {
    expense_categories?: ExpenseCategory | null;
};
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  phone_number: string | null;
  address: string | null;
  website: string | null;
  vat_number: string | null;
  updated_at: string;
};

// --- Form Data types (will now use the correctly exported BookingSource) ---
export type BookingFormData = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
    id?: string;
    start_date: Date;
    end_date: Date;
    // No change needed here, as it uses the exported BookingSource type
    // source: BookingSource;
};

export type ExpenseFormData = Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'expense_categories'> & {
    id?: string;
    date: Date;
    category_id?: string | null;
};
