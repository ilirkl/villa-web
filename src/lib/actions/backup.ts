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

    // Fetch all properties for the user to create a lookup map
    console.log('Fetching properties data...');
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, name')
      .eq('user_id', user.id);

    if (propertiesError) {
      throw new Error(`Failed to fetch properties: ${propertiesError.message}`);
    }
    console.log(`Retrieved ${properties?.length || 0} properties`);

    // Create a map of property IDs to names
    const propertyMap = new Map();
    properties?.forEach(property => {
      propertyMap.set(property.id, property.name);
    });

    console.log('Fetching bookings data...');
    // Fetch ALL bookings for the user (from all properties)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('guest_name, start_date, end_date, total_amount, prepayment, notes, source, property_id')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true }); // Order by date to show historical data

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
    // Fetch ALL expenses for the user (from all properties)
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, date, amount, description, category_id, property_id')
      .eq('user_id', user.id)
      .order('date', { ascending: true }); // Order by date to show historical data

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
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Guest Name', key: 'guestName', width: 20 },
      { header: 'Check-in Date', key: 'startDate', width: 15 },
      { header: 'Check-out Date', key: 'endDate', width: 15 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Prepayment', key: 'prepayment', width: 15 },
      { header: 'Source', key: 'source', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 }
    ];
    
    // Add data with property information
    bookings.forEach(booking => {
      const propertyName = booking.property_id ? propertyMap.get(booking.property_id) : 'Unknown Property';
      
      bookingsSheet.addRow({
        property: propertyName || 'Unknown Property',
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
      { header: 'Property', key: 'property', width: 20 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 20 }
    ];
    
    // Add data with translated categories and property information
    expenses.forEach(expense => {
      // Get the category name using the category_id and the lookup map
      const categoryName = expense.category_id ? categoryMap.get(expense.category_id) : null;
      
      // Get the property name
      const propertyName = expense.property_id ? propertyMap.get(expense.property_id) : 'Unknown Property';
      
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
        property: propertyName || 'Unknown Property',
        date: expense.date || '',
        amount: expense.amount || 0,
        description: expense.description || '',
        category: translatedCategory || 'Uncategorized'
      });
    });
    
    // Format headers
    expensesSheet.getRow(1).font = { bold: true };
    
    // Add summary worksheet
    console.log('Creating summary worksheet...');
    const summarySheet = workbook.addWorksheet('Summary');
    
    // Add summary information
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];
    
    // Calculate summary statistics
    const totalBookings = bookings?.length || 0;
    const totalExpenses = expenses?.length || 0;
    const totalProperties = properties?.length || 0;
    
    const totalBookingRevenue = bookings?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;
    const totalExpenseAmount = expenses?.reduce((sum, expense) => sum + (expense.amount || 0), 0) || 0;
    
    // Add summary data
    summarySheet.addRow({ metric: 'Total Properties', value: totalProperties });
    summarySheet.addRow({ metric: 'Total Bookings', value: totalBookings });
    summarySheet.addRow({ metric: 'Total Expenses', value: totalExpenses });
    summarySheet.addRow({ metric: 'Total Booking Revenue', value: totalBookingRevenue });
    summarySheet.addRow({ metric: 'Total Expense Amount', value: totalExpenseAmount });
    summarySheet.addRow({ metric: 'Net Profit', value: totalBookingRevenue - totalExpenseAmount });
    summarySheet.addRow({ metric: 'Backup Generated', value: new Date().toLocaleString() });
    
    // Format headers
    summarySheet.getRow(1).font = { bold: true };
    
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


























