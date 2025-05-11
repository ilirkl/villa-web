'use server';

import { createActionClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';
import { getDictionary } from '@/lib/dictionary';
import { translateExpenseCategory } from '@/lib/translations';

export async function generateDataBackup(lang: string = 'en'): Promise<string> {
  try {
    console.log('Starting backup generation...');
    console.log('Using language:', lang);
    const supabase = createActionClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Load dictionary for translations
    const dictionary = await getDictionary(lang as 'en' | 'sq');

    console.log('Fetching bookings data...');
    // Fetch bookings with explicit user_id check
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('guest_name, start_date, end_date, total_amount, prepayment, notes, source')
      .eq('user_id', user.id);

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }
    console.log(`Retrieved ${bookings?.length || 0} bookings`);

    console.log('Fetching expenses data...');
    // Fetch expenses with categories
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select(`
        date, 
        amount, 
        description, 
        expense_categories(id, name)
      `)
      .eq('user_id', user.id);

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }
    console.log(`Retrieved ${expenses?.length || 0} expenses`);

    // Create simple arrays of objects with basic properties
    console.log('Formatting booking data for Excel...');
    const bookingsData = bookings.map(booking => ({
      GuestName: String(booking.guest_name || ''),
      CheckInDate: String(booking.start_date || ''),
      CheckOutDate: String(booking.end_date || ''),
      TotalAmount: Number(booking.total_amount || 0),
      Prepayment: Number(booking.prepayment || 0),
      Source: String(booking.source || ''),
      Notes: String(booking.notes || '')
    }));

    console.log('Formatting expense data for Excel with translations...');
    const expensesData = expenses.map(expense => {
      // Get the original category name
      const originalCategoryName = expense.expense_categories?.[0]?.name || null;
      
      // Translate the category name based on the current language
      const translatedCategory = translateExpenseCategory(
        originalCategoryName, 
        dictionary, 
        lang
      );
      
      return {
        Date: String(expense.date || ''),
        Amount: Number(expense.amount || 0),
        Description: String(expense.description || ''),
        Category: translatedCategory
      };
    });

    // Create workbook
    console.log('Creating Excel workbook...');
    const wb = XLSX.utils.book_new();
    
    // Add bookings sheet
    console.log('Adding bookings sheet...');
    const bookingsSheet = XLSX.utils.json_to_sheet(bookingsData);
    XLSX.utils.book_append_sheet(wb, bookingsSheet, 'Bookings');
    
    // Add expenses sheet
    console.log('Adding expenses sheet...');
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, expensesSheet, 'Expenses');
    
    // Generate base64 string
    console.log('Writing Excel file to base64 string...');
    const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
    
    console.log('Excel file generated successfully as base64 string');
    
    // Return the base64 string
    return base64;
  } catch (error) {
    console.error('Backup generation error:', error);
    throw error;
  }
}













