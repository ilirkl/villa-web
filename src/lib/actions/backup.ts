'use server';

import { createActionClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
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
    console.log('Dictionary loaded for language:', lang);

    // Check if we have translations in a different structure
    console.log('Dictionary keys:', Object.keys(dictionary));

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

    // Fetch expense categories first to create a lookup map
    console.log('Fetching expense categories...');
    const { data: categories, error: categoriesError } = await supabase
      .from('expense_categories')
      .select('id, name');

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
    }
    console.log(`Retrieved ${categories?.length || 0} expense categories`);

    // Create a map of category IDs to names
    const categoryMap = new Map();
    categories?.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });

    console.log('Fetching expenses data...');
    // Fetch expenses with category_id
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, date, amount, description, category_id')
      .eq('user_id', user.id);

    if (expensesError) {
      throw new Error(`Failed to fetch expenses: ${expensesError.message}`);
    }
    console.log(`Retrieved ${expenses?.length || 0} expenses`);

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Villa Manager';
    workbook.lastModifiedBy = 'Villa Manager';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add bookings worksheet
    console.log('Creating bookings worksheet...');
    const bookingsSheet = workbook.addWorksheet('Bookings');
    
    // Add headers
    bookingsSheet.columns = [
      { header: 'Guest Name', key: 'guestName', width: 20 },
      { header: 'Check-in Date', key: 'startDate', width: 15 },
      { header: 'Check-out Date', key: 'endDate', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Prepayment', key: 'prepayment', width: 15 },
      { header: 'Source', key: 'source', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    
    // Add data
    bookings.forEach(booking => {
      bookingsSheet.addRow({
        guestName: booking.guest_name || '',
        startDate: booking.start_date || '',
        endDate: booking.end_date || '',
        totalAmount: booking.total_amount || 0,
        prepayment: booking.prepayment || 0,
        source: booking.source || '',
        notes: booking.notes || ''
      });
    });
    
    // Format headers
    bookingsSheet.getRow(1).font = { bold: true };
    
    // Add expenses worksheet
    console.log('Creating expenses worksheet...');
    const expensesSheet = workbook.addWorksheet('Expenses');
    
    // Add headers
    expensesSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 20 }
    ];
    
    // Add data with translated categories
    expenses.forEach(expense => {
      // Get the category name using the category_id and the lookup map
      const categoryName = expense.category_id ? categoryMap.get(expense.category_id) : null;
      
      // Log for debugging
      console.log(`Original category: ${categoryName}, Language: ${lang}`);
      
      // Translate the category name based on the current language
      let translatedCategory;

      // Use type assertion to access expense_categories safely
      const expenseCategories = (dictionary as any)?.expense_categories;
      
      // Check if we have translations in the expense_categories dictionary structure
      if (expenseCategories && 
          typeof expenseCategories === 'object' && 
          categoryName && 
          expenseCategories[categoryName]) {
        translatedCategory = expenseCategories[categoryName];
        console.log(`Using dictionary.expense_categories: ${translatedCategory}`);
      } else {
        // Fall back to the old translation method
        translatedCategory = translateExpenseCategory(
          categoryName, 
          dictionary, 
          lang
        );
        console.log(`Using translateExpenseCategory: ${translatedCategory}`);
      }
      
      // Log the translation result
      console.log(`Translated to: ${translatedCategory}`);
      
      expensesSheet.addRow({
        date: expense.date || '',
        amount: expense.amount || 0,
        description: expense.description || '',
        category: translatedCategory || 'Uncategorized'
      });
    });
    
    // Format headers
    expensesSheet.getRow(1).font = { bold: true };
    
    // Generate buffer
    console.log('Writing Excel file to buffer...');
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Convert buffer to base64
    const base64 = Buffer.from(buffer).toString('base64');
    
    console.log('Excel file generated successfully as base64 string');
    
    // Return the base64 string
    return base64;
  } catch (error) {
    console.error('Backup generation error:', error);
    throw error;
  }
}


























