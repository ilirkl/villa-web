'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { MonthlyReportPDF } from '../pdf/MonthlyReportPDF';
import { createClient } from '../supabase/server';
import { format, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';

export type ReportBuffer = Uint8Array;

export async function generateMonthlyReport(month: string, year: string): Promise<ReportBuffer> {
  try {
    console.log('Starting report generation for:', { month, year });
    const supabase = createClient();

    // Convert month and year to numbers
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Validate inputs
    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      throw new Error(`Invalid month or year: month=${month}, year=${year}`);
    }

    // Create date objects (subtract 1 from month since JS months are 0-based)
    const monthStart = startOfMonth(new Date(yearNum, monthNum - 1));
    const monthEnd = endOfMonth(monthStart);

    // Format dates for Supabase query
    const monthStartStr = format(monthStart, 'yyyy-MM-dd');
    const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

    console.log('Fetching data for date range:', { monthStartStr, monthEndStr });

    // Fetch data
    const [bookingsRes, expensesRes, categoriesRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('id, start_date, end_date, total_amount')
        .or(`and(start_date.lte.${monthEndStr},end_date.gte.${monthStartStr})`)
        .order('start_date', { ascending: true }),
      supabase
        .from('expenses')
        .select('id, date, amount, category_id')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
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

    console.log('Data fetched successfully:', {
      bookingsCount: bookings.length,
      expensesCount: expenses.length,
      categoriesCount: categoryMap.size
    });

    // Calculate metrics
    const grossProfit = bookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    const netProfit = grossProfit - totalExpenses;

    // Calculate occupancy metrics
    const daysInMonth = differenceInDays(monthEnd, monthStart) + 1;
    const totalNightsReserved = bookings.reduce((sum, booking) => {
      try {
        const start = parseISO(booking.start_date);
        const end = parseISO(booking.end_date);
        const nights = differenceInDays(end, start);
        return sum + (nights > 0 ? nights : 0);
      } catch (e) {
        console.error('Error calculating nights for booking:', booking.id, e);
        return sum;
      }
    }, 0);

    const occupancyRate = (totalNightsReserved / daysInMonth) * 100;
    const averageStay = bookings.length > 0 ? totalNightsReserved / bookings.length : 0;

    // Calculate expense breakdown
    const expenseBreakdown = Array.from(categoryMap.entries()).map(([id, name]) => {
      const categoryExpenses = expenses.filter(e => e.category_id === id);
      const value = categoryExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const percentage = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
      return { name, value, percentage };
    });

    console.log('Metrics calculated:', {
      grossProfit,
      totalExpenses,
      netProfit,
      occupancyRate,
      totalNightsReserved,
      averageStay
    });

    // Generate PDF
    console.log('Creating PDF document...');
    const document = React.createElement(MonthlyReportPDF, {
      month: format(monthStart, 'MMMM'),
      year: year,
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
    const buffer = await renderToBuffer(document);
    
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



