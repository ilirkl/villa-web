'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { MonthlyReportPDF } from '../pdf/MonthlyReportPDF';
import { createClient } from '../supabase/server';
import { format, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { sq } from 'date-fns/locale';
import { getDictionary } from '@/lib/dictionary';

export type ReportBuffer = Uint8Array;

export async function generateMonthlyReport(month: string, year: string, lang: string = 'en'): Promise<ReportBuffer> {
  try {
    console.log('Starting report generation for:', { month, year, lang });
    const supabase = createClient();

    // Parse the month and year as numbers
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    // Validate inputs
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid month or year: month=${month}, year=${year}`);
    }

    // Create date objects for the start and end of the month
    const monthStart = new Date(yearNum, monthNum - 1, 1); // Month is 0-indexed in JS Date
    const monthEnd = endOfMonth(monthStart);

    // Format dates for Supabase queries
    const monthStartString = format(monthStart, 'yyyy-MM-dd');
    const monthEndString = format(monthEnd, 'yyyy-MM-dd');

    console.log('Date range:', { monthStartString, monthEndString });

    // Fetch data in parallel
    const [bookingsRes, expensesRes, categoriesRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, start_date, end_date, total_amount')
        .or(`and(start_date.lte.${monthEndString},end_date.gte.${monthStartString})`)
        .order('start_date', { ascending: true }),
      supabase
        .from('expenses')
        .select('id, date, amount, category_id')
        .gte('date', monthStartString)
        .lte('date', monthEndString)
        .order('date', { ascending: true }),
      supabase
        .from('expense_categories')
        .select('id, name')
    ]);

    // Error handling
    if (bookingsRes.error) throw new Error(`Bookings query error: ${bookingsRes.error.message}`);
    if (expensesRes.error) throw new Error(`Expenses query error: ${expensesRes.error.message}`);
    if (categoriesRes.error) throw new Error(`Categories query error: ${categoriesRes.error.message}`);

    const bookings = bookingsRes.data || [];
    const expenses = expensesRes.data || [];
    const categoryMap = new Map(
      (categoriesRes.data || []).map(c => [c.id, c.name || 'Uncategorized'])
    );

    // Calculate gross profit from bookings
    let grossProfit = 0;
    let totalNightsReserved = 0;

    bookings.forEach(booking => {
      try {
        const startDate = parseISO(booking.start_date);
        const endDate = parseISO(booking.end_date);
        
        // Calculate total nights and per night rate
        const totalNights = differenceInDays(endDate, startDate);
        if (totalNights <= 0) return;
        
        const perNightRate = booking.total_amount / totalNights;
        
        // Calculate nights in this month
        const bookingStartInMonth = startDate < monthStart ? monthStart : startDate;
        const bookingEndInMonth = endDate > monthEnd ? monthEnd : endDate;
        const nightsInMonth = differenceInDays(bookingEndInMonth, bookingStartInMonth);
        
        if (nightsInMonth > 0) {
          const revenueForMonth = perNightRate * nightsInMonth;
          grossProfit += revenueForMonth;
          totalNightsReserved += nightsInMonth;
        }
      } catch (error) {
        console.error('Error calculating booking revenue:', error);
      }
    });

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense?.amount || 0), 0);

    // Calculate net profit
    const netProfit = grossProfit - totalExpenses;

    // Calculate occupancy rate
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const occupancyRate = daysInMonth > 0 ? (totalNightsReserved / daysInMonth) * 100 : 0;

    // Calculate average stay
    const averageStay = bookings.length > 0 ? totalNightsReserved / bookings.length : 0;

    // Prepare expense breakdown
    const expensesByCategory = new Map<string, number>();
    
    expenses.forEach(expense => {
      const categoryId = expense.category_id;
      const categoryName = categoryMap.get(categoryId) || 'Uncategorized';
      const currentAmount = expensesByCategory.get(categoryName) || 0;
      expensesByCategory.set(categoryName, currentAmount + (expense.amount || 0));
    });

    const expenseBreakdown = Array.from(expensesByCategory.entries())
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending

    // Format month name based on language
    const monthName = format(monthStart, 'MMMM', { locale: lang === 'sq' ? sq : undefined });

    // Get the dictionary for the specified language
    const dictionary = await getDictionary(lang as 'en' | 'sq');

    // Generate PDF
    console.log('Creating PDF document...');
    const document = React.createElement(MonthlyReportPDF, {
      month: monthName,
      year: year,
      lang: lang as 'en' | 'sq',
      dictionary,
      data: {
        grossProfit,
        totalExpenses,
        netProfit,
        occupancyRate,
        totalNightsReserved,
        averageStay,
        expenseBreakdown,
      }
    });

    console.log('Rendering PDF to buffer...');
    const buffer = await renderToBuffer(document as any);
    
    if (!buffer || !(buffer instanceof Uint8Array)) {
      throw new Error('Invalid PDF buffer generated');
    }
    
    console.log('PDF generated successfully, buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Error in generateMonthlyReport:', error);
    throw error;
  }
}


