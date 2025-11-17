// src/app/(app)/revenue/reports/[year_month]/page.tsx

import { createClient } from '@/lib/supabase/server'; // Supabase server client
import {
    parse,           // date-fns: parse 'yyyy-MM' format
    format,          // date-fns: format dates
    startOfMonth,    // date-fns: get start of a month
    endOfMonth,      // date-fns: get end of a month
    isValid,         // date-fns: check if a date is valid
    differenceInDays,// date-fns: calculate difference between two dates
    getDaysInMonth,
    parseISO,        // date-fns: get number of days in a month
    max,             // date-fns: get maximum of dates
    min              // date-fns: get minimum of dates
} from 'date-fns';
import { sq } from 'date-fns/locale'; // Albanian locale for date formatting
import { notFound } from 'next/navigation'; // For handling invalid paths/404
import Link from 'next/link'; // Next.js Link component
import { Button } from '@/components/ui/button'; // Shadcn Button
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Shadcn Card components
import { ChevronLeft } from 'lucide-react'; // Icon
import { getDictionary } from '@/lib/dictionary';
import { translateExpenseCategory } from '@/lib/translations';
import { getServerCsrfToken } from '@/lib/csrf';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingsBySourceChart, { BookingSourceData } from '@/components/revenue/report/BookingsBySourceChart';

// --- Import helper and sub-components ---
// Ensure these paths are correct for your project structure
import { formatCurrency } from '@/lib/utils';
import ProfitBreakdownCard from '@/components/revenue/report/ProfitBreakdownCard';
import PerformanceStatsGrid from '@/components/revenue/report/PerformanceStatsGrid';
import MonthlyExpenseBreakdownCard from '@/components/revenue/report/MonthlyExpenseBreakdownCard';
import DownloadReportButton from '@/components/revenue/report/DownloadReportButton';

// --- Import Types ---
import type { Database, Tables } from '@/lib/database.types';
type Booking = Pick<Tables<'bookings'>, 'id' | 'start_date' | 'end_date' | 'total_amount' | 'guest_name' | 'source'>;
type Expense = Pick<Tables<'expenses'>, 'id' | 'date' | 'amount' | 'category_id' | 'description'>;
type ExpenseCategory = Tables<'expense_categories'>;
// Define type for expense breakdown items used locally and passed down
interface ExpenseBreakdownItem { name: string; value: number; percentage: number; }

// Add this helper function at the top
function calculateBookingRevenueForMonth(
    booking: Booking, 
    monthStart: Date, 
    monthEnd: Date
): number {
    if (!booking.start_date || !booking.end_date || !booking.total_amount) return 0;
    
    try {
        const startDate = parseISO(booking.start_date);
        const endDate = parseISO(booking.end_date);
        
        if (!isValid(startDate) || !isValid(endDate)) return 0;
        
        // Calculate total nights and per night rate
        const totalNights = differenceInDays(endDate, startDate);
        if (totalNights <= 0) return 0;
        
        const perNightRate = booking.total_amount / totalNights;
        
        // Calculate nights in this month
        const bookingStartInMonth = max([startDate, monthStart]);
        const bookingEndInMonth = min([endDate, monthEnd]);
        const nightsInMonth = differenceInDays(bookingEndInMonth, bookingStartInMonth);
        
        return nightsInMonth > 0 ? perNightRate * nightsInMonth : 0;
    } catch (error) {
        console.error('Error calculating booking revenue for month:', error);
        return 0;
    }
}

// Define page props including the dynamic route parameter
interface PageProps {
    params: {
        year_month: string; // Expects format "YYYY-MM", e.g., "2025-03"
        lang: string;
    };
}

// --- Default Export: The Monthly Report Page Component ---
export default async function MonthlyReportPage({ params }: PageProps) {
    const { year_month, lang } = params;
    const dictionary = await getDictionary(lang as 'en' | 'sq');
    const supabase = createClient(); // Initialize Supabase server client
    
    // Generate CSRF token for any forms or actions on this page
    const csrfToken = getServerCsrfToken();

    // --- 1. Parse and Validate Date Parameter ---
    let targetMonthDate: Date;
    let monthStart: Date;
    let monthEnd: Date;
    let monthStartString: string;
    let monthEndString: string;

    try {
        // Use parse for 'yyyy-MM' format; provide a reference date (today)
        targetMonthDate = parse(year_month, 'yyyy-MM', new Date());
        if (!isValid(targetMonthDate)) {
            throw new Error('Invalid date format in URL parameter.');
        }
        // Get the start and end dates of the target month
        monthStart = startOfMonth(targetMonthDate);
        monthEnd = endOfMonth(targetMonthDate);
        // Format dates as strings for Supabase query
        monthStartString = format(monthStart, 'yyyy-MM-dd');
        monthEndString = format(monthEnd, 'yyyy-MM-dd');
    } catch (error) {
        console.error("Invalid date parameter:", year_month, error);
        notFound(); // Trigger Next.js 404 page if date is invalid
    }

    // --- 2. Fetch Data for the Specific Month ---
    let bookings: Booking[] = [];
    let expenses: Expense[] = [];
    let categoryMap: Map<string, string> = new Map();

    try {
        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Check if user is authenticated
        if (!user) {
            throw new Error('Authentication required');
        }

        // Fetch bookings, expenses, and categories concurrently
        const [bookingsRes, expensesRes, categoriesRes] = await Promise.all([
            supabase
                .from('bookings')
                .select('id, start_date, end_date, total_amount, guest_name, source')
                .eq('user_id', user.id) // IMPORTANT: Explicitly filter by user_id
                .or(`and(start_date.lte.${monthEndString},end_date.gte.${monthStartString})`)
                .order('start_date', { ascending: true }),
            supabase
                .from('expenses')
                .select('id, date, amount, category_id, description')
                .eq('user_id', user.id) // IMPORTANT: Explicitly filter by user_id
                .gte('date', monthStartString)
                .lte('date', monthEndString)
                .order('date', { ascending: true }),
            supabase
                .from('expense_categories')
                .select('id, name'),
        ]);

        // Handle potential errors from Supabase fetches
        if (bookingsRes.error) {
            console.error("Bookings query:", bookingsRes.error);
            throw new Error(`Bookings fetch error: ${bookingsRes.error.message}`);
        }
        if (expensesRes.error) throw new Error(`Expenses fetch error: ${expensesRes.error.message}`);
        if (categoriesRes.error) throw new Error(`Categories fetch error: ${categoriesRes.error.message}`);


        // Assign data or default to empty arrays
        bookings = bookingsRes.data || [];
        expenses = expensesRes.data || [];
        categoryMap = new Map((categoriesRes.data || []).map(c => [c.id, c.name || 'Uncategorized']));
    } catch (error: any) {
        console.error("Error fetching monthly report data:", error);
        // Display error message if fetching fails
        return <div className="p-6 text-red-500">Failed to load report data: {error.message}</div>;
    }

    // --- 3. Perform Calculations for the Month ---
    let grossProfit = 0;
    let totalExpenses = 0;
    let netProfit = 0;
    let totalNightsReserved = 0;
    let occupancyRate = 0;
    let avgStay = 0;
    let expenseBreakdown: ExpenseBreakdownItem[] = [];
    // Update the type definition to match the component's expected props
    let bookingsBySourceData: BookingSourceData[] = [];

    try {
        // Ensure arrays are arrays before starting calculations
        if (!Array.isArray(bookings) || !Array.isArray(expenses)) {
            console.error("Calculation Start Error: Fetched data is not in array format.", { bookings, expenses });
            throw new Error("Fetched data format error.");
        }

        // --- Profit Breakdown Calculation ---
        grossProfit = bookings.reduce((sum, booking) => {
            const monthlyRevenue = calculateBookingRevenueForMonth(booking, monthStart, monthEnd);
            return sum + monthlyRevenue;
        }, 0);
        totalExpenses = expenses.reduce((sum, e) => sum + (e?.amount || 0), 0);
        netProfit = grossProfit - totalExpenses;

        // --- Performance Stats Calculation ---

        totalNightsReserved = bookings.reduce((sum, b) => {
            if (!b || !b.start_date || !b.end_date) {
                console.warn("Skipping booking due to missing data:", b?.id);
                return sum;
            }
            try {
                const start = parseISO(b.start_date);
                const end = parseISO(b.end_date);

                if (isValid(start) && isValid(end) && end > start) {
                    // --- Accurate Logic for Nights Within the Target Month ---
                    // Find the actual start date within the calculation month
                    const bookingStartInCalcMonth = start < monthStart ? monthStart : start;
                    // Find the actual end date within the calculation month
                    // Use end of the day for end date comparison if needed, or just end date
                    const bookingEndInCalcMonth = end > monthEnd ? endOfMonth(monthEnd) : end;

                    // Ensure the clamped start is strictly before the clamped end
                    if (bookingStartInCalcMonth < bookingEndInCalcMonth) {
                        // differenceInDays typically calculates full days between. Add 1 for nights.
                        // Example: Check out on 3rd, Check in on 1st = differenceInDays is 2. Nights = 2. Seems correct? Test this.
                        const nightsInMonth = differenceInDays(bookingEndInCalcMonth, bookingStartInCalcMonth);
                        return sum + nightsInMonth; // Add nights actually *in* the report month
                    } else {
                         // This happens if the booking range doesn't overlap the calculated range
                         // or if start/end are the same after clamping
                         return sum;
                    }
                } else {
                    console.warn(`Skipping booking ID ${b.id} due to invalid dates or end date not after start date.`);
                    return sum;
                }
            } catch (e) {
                console.error(`Error processing dates for booking ID ${b.id}:`, e);
                return sum;
            }
        }, 0);



        const totalDaysInMonth = getDaysInMonth(targetMonthDate);
        

        // Calculate Occupancy Rate, avoid division by zero
        occupancyRate = totalDaysInMonth > 0 ? (totalNightsReserved / totalDaysInMonth) * 100 : 0;
       

        // Calculate Average Stay, avoid division by zero
        avgStay = bookings.length > 0 ? totalNightsReserved / bookings.length : 0;
        

        // --- Expense Breakdown Calculation ---
        if (!Array.isArray(expenses)) { // Add safety check
            throw new Error("Expense data corrupted before breakdown calculation.");
        }
        const expensesByCategory = expenses.reduce((acc, expense) => {
            if (!expense) return acc;
            const originalCategoryName = expense.category_id ? categoryMap.get(expense.category_id) : 'Uncategorized';
            // Translate the category name based on the current language
            const categoryName = translateExpenseCategory(originalCategoryName, dictionary, params.lang);
            acc[categoryName] = (acc[categoryName] || 0) + (expense.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        expenseBreakdown = Object.entries(expensesByCategory)
            .map(([name, value]) => ({
                name, value,
                percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value); // Sort by value descending

        // --- Bookings and Revenue by Source Calculation ---
        const bookingCountBySource = bookings.reduce((acc, booking) => {
            if (!booking || !booking.source) return acc;
            acc[booking.source] = (acc[booking.source] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const revenueBySource = bookings.reduce((acc, booking) => {
            if (!booking || !booking.source || !booking.total_amount) return acc;
            acc[booking.source] = (acc[booking.source] || 0) + booking.total_amount;
            return acc;
        }, {} as Record<string, number>);

        const totalBookings = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + (booking?.total_amount || 0), 0);

        // Combine both metrics into a single dataset
        const allSources = new Set([
            ...Object.keys(bookingCountBySource),
            ...Object.keys(revenueBySource)
        ]);

        bookingsBySourceData = Array.from(allSources).map(source => ({
            name: source,
            bookings: bookingCountBySource[source] || 0,
            bookingsPercentage: totalBookings > 0 ? ((bookingCountBySource[source] || 0) / totalBookings) * 100 : 0,
            revenue: revenueBySource[source] || 0,
            revenuePercentage: totalRevenue > 0 ? ((revenueBySource[source] || 0) / totalRevenue) * 100 : 0,
            color: source === 'AIRBNB' ? '#ff5a5f' : 
                   source === 'BOOKING' ? '#003580' : '#10b981'
        })).sort((a, b) => b.revenue - a.revenue);

    } catch (calculationError: any) {
        console.error("Error during report calculations:", calculationError);
        // Display error if calculations fail
        return <div className="p-6 text-red-500">Error processing report data: {calculationError.message}</div>;
    }

    // --- 4. Render Page Structure ---
    const formattedMonthYear = format(targetMonthDate, 'MMMM yyyy', { locale: lang === 'sq' ? sq : undefined });

    return (
        // Main container with responsive padding
        <div className="p-2 md:p-4 lg:p-6 pb-20 max-w-7xl mx-auto">
            {/* Header Section - more space on larger screens */}
            <div className="flex items-center justify-between mb-4 md:mb-6 gap-2">
                <div className="flex items-center gap-2">
                    {/* Back Button */}
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/revenue" aria-label={dictionary.back_to_finances || "Back to Finances"}>
                            <ChevronLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    {/* Page Title - larger on bigger screens */}
                    <h3 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100">
                        {formattedMonthYear}
                    </h3>
                </div>
                
                {/* Download Report Button */}
                <div className="w-auto">
                    <DownloadReportButton 
                        month={formattedMonthYear} 
                        yearMonth={year_month}
                        csrfToken={csrfToken}
                    />
                </div>
            </div>

            {/* Main Content Area - grid layout on larger screens */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {/* Profit Breakdown Card - full width on mobile, 2 cols on tablet, 1 col on large screens */}
                <div className="md:col-span-2 lg:col-span-1">
                    <ProfitBreakdownCard
                        netProfit={netProfit}
                        grossProfit={grossProfit}
                        totalExpenses={totalExpenses}
                    />
                </div>

                {/* Performance Statistics Card */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader className="pb-0"><CardTitle>{dictionary.performance_stats || "Performance Statistics"}</CardTitle></CardHeader>
                        <CardContent>
                            <PerformanceStatsGrid
                                nightsReserved={totalNightsReserved}
                                occupancyRate={occupancyRate}
                                averageStay={avgStay}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Expense Breakdown Card */}
                <div className="lg:col-span-1">
                    <MonthlyExpenseBreakdownCard
                        title={dictionary.expense_breakdown || "Expense Breakdown"}
                        data={expenseBreakdown}
                    />
                </div>
            </div>

            {/* Bookings & Revenue by Source and Transactions Tables - side by side on tablet and desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mt-3 md:mt-4">
                {/* Bookings & Revenue by Source Chart - 1/3 width on tablet and desktop */}
                <div className="md:col-span-1">
                    <BookingsBySourceChart
                        title={dictionary.bookings_revenue_by_source || "Bookings & Revenue by Source"}
                        data={bookingsBySourceData}
                    />
                </div>
                
                {/* Monthly Transactions - 2/3 width on tablet and desktop */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle>{dictionary.monthly_transactions || dictionary.transactions || "Monthly Transactions"}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="bookings" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="bookings">{dictionary.bookings || "Bookings"}</TabsTrigger>
                                    <TabsTrigger value="expenses">{dictionary.expenses || "Expenses"}</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="bookings" className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{dictionary.guest_name || 'Guest Name'}</TableHead>
                                                <TableHead>{dictionary.date_range || dictionary.date || 'Dates'}</TableHead>
                                                <TableHead className="hidden md:table-cell">{dictionary.source || 'Source'}</TableHead>
                                                <TableHead className="text-right">{dictionary.amount || 'Amount'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bookings.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                        {dictionary.no_bookings_for_month || dictionary.no_bookings_found || "No bookings for this month"}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                bookings.map((booking) => {
                                                    const startDate = parseISO(booking.start_date);
                                                    const endDate = parseISO(booking.end_date);
                                                    const formattedStartDate = isValid(startDate) ? 
                                                        format(startDate, 'MMM d', { locale: lang === 'sq' ? sq : undefined }) : 'N/A';
                                                    const formattedEndDate = isValid(endDate) ? 
                                                        format(endDate, 'MMM d', { locale: lang === 'sq' ? sq : undefined }) : 'N/A';
                                                    
                                                    return (
                                                        <TableRow key={booking.id}>
                                                            <TableCell className="font-medium">{booking.guest_name || 'N/A'}</TableCell>
                                                            <TableCell>{formattedStartDate} - {formattedEndDate}</TableCell>
                                                            <TableCell className="hidden md:table-cell">
                                                                {booking.source && (
                                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" 
                                                                        style={{ 
                                                                            backgroundColor: booking.source === 'AIRBNB' ? '#ffece6' : 
                                                                                            booking.source === 'BOOKING' ? '#e6f0ff' : '#e6fff0',
                                                                            color: booking.source === 'AIRBNB' ? '#ff5a5f' : 
                                                                                    booking.source === 'BOOKING' ? '#003580' : '#10b981'
                                                                        }}>
                                                                        {booking.source}
                                                                    </span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-right">€{booking.total_amount?.toLocaleString() || '0'}</TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                                
                                <TabsContent value="expenses" className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{dictionary.date || 'Date'}</TableHead>
                                                <TableHead>{dictionary.description || 'Description'}</TableHead>
                                                <TableHead className="hidden md:table-cell">{dictionary.category || 'Category'}</TableHead>
                                                <TableHead className="text-right">{dictionary.amount || 'Amount'}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {expenses.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                                                        {dictionary.no_expenses_for_month || dictionary.no_expenses || "No expenses for this month"}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                expenses.map((expense) => {
                                                    const date = expense.date ? parseISO(expense.date) : null;
                                                    const formattedDate = date && isValid(date) ? 
                                                        format(date, 'MMM d', { locale: lang === 'sq' ? sq : undefined }) : 'N/A';
                                                    const categoryName = expense.category_id ? 
                                                        categoryMap.get(expense.category_id) || 'Uncategorized' : 'Uncategorized';
                                                    
                                                    return (
                                                        <TableRow key={expense.id}>
                                                            <TableCell>{formattedDate}</TableCell>
                                                            <TableCell className="font-medium">{expense.description || 'N/A'}</TableCell>
                                                            <TableCell className="hidden md:table-cell">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                                                    {categoryName}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">€{expense.amount?.toLocaleString() || '0'}</TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
