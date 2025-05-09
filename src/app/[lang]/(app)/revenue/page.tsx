// src/app/[lang]/(app)/revenue/page.tsx

import { createClient } from '@/lib/supabase/server'; // Supabase server client
import { Suspense } from 'react'; // For loading states
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Shadcn Card
import { Button } from '@/components/ui/button'; // Shadcn Button
import {
    format,           // date-fns: format dates
    startOfMonth,     // date-fns: get start of a month
    endOfMonth,       // date-fns: get end of a month
    subMonths,        // date-fns: subtract months from a date
    parseISO,         // date-fns: parse ISO date strings
    isValid,          // date-fns: check if a date is valid
    isFuture,         // date-fns: check if a date is in the future
    isPast,           // date-fns: check if a date is in the past
    addMonths,        // date-fns: add months to a date
    eachDayOfInterval, // date-fns: get all days in a date interval
    differenceInDays, // date-fns: get the difference in days between two dates
    max,              // date-fns: get the maximum of two dates
    min               // date-fns: get the minimum of two dates
} from 'date-fns';
import { sq } from 'date-fns/locale'; // Albanian locale for date formatting
import { ScrollArea } from '@/components/ui/scroll-area'; // Optional: for long lists
// Removed toast import as errors are now rendered directly or logged server-side
// import { toast } from 'sonner';

// --- Import Child Components ---
// Ensure these paths match your project structure
import MonthlySummaryCard from '@/components/revenue/MonthlySummaryCard';
import RevenueLineChart from '@/components/revenue/RevenueLineChart';
import BookingListCard from '@/components/revenue/BookingListCard';
import ExpenseBreakdownCard from '@/components/revenue/ExpenseBreakdownCard';
import MonthlyReportsCarousel from '@/components/revenue/MonthlyReportsCarousel';
import { getDictionary } from '@/lib/dictionary';
import { translateExpenseCategory } from '@/lib/translations';

// --- Import Types ---
// Import types generated from your Supabase schema
import type { Database, Tables } from '@/lib/database.types';

// Define specific types based on Tables helper for better readability
type Booking = Tables<'bookings'>;
type Expense = Tables<'expenses'>;
type ExpenseCategory = Tables<'expense_categories'>;

// Add partial types for the revenue page
type PartialBooking = Pick<Booking, 'id' | 'start_date' | 'end_date' | 'total_amount'>;
type PartialExpense = Pick<Expense, 'id' | 'date' | 'amount' | 'category_id'>;
type PartialExpenseCategory = Pick<ExpenseCategory, 'id' | 'name'>;

// --- Helper Functions --- Defined in utils.ts ---
// import { formatCurrency } from '@/lib/utils';

// Helper function to split booking revenue across months
function allocateBookingRevenueAcrossMonths(booking: PartialBooking): { monthKey: string; amount: number }[] {
    if (!booking.start_date || !booking.end_date || !booking.total_amount) return [];
    
    try {
        const startDate = parseISO(booking.start_date);
        const endDate = parseISO(booking.end_date);
        
        if (!isValid(startDate) || !isValid(endDate)) return [];
        
        // Get total nights
        const totalNights = differenceInDays(endDate, startDate);
        if (totalNights <= 0) return [];
        
        // Calculate per night rate
        const perNightRate = booking.total_amount / totalNights;
        
        // Get all the months this booking spans
        const result: { monthKey: string; amount: number }[] = [];
        let currentDate = startDate;
        
        while (currentDate < endDate) {
            const monthKey = format(currentDate, 'yyyy-MM');
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            
            // Calculate nights in this month
            const monthStartDate = max([currentDate, monthStart]);
            const monthEndDate = min([endDate, monthEnd]);
            const nightsInMonth = differenceInDays(monthEndDate, monthStartDate);
            
            if (nightsInMonth > 0) {
                result.push({
                    monthKey,
                    amount: perNightRate * nightsInMonth
                });
            }
            
            // Move to next month
            currentDate = addMonths(monthStart, 1);
        }
        
        return result;
    } catch (error) {
        console.error('Error allocating booking revenue:', error);
        return [];
    }
}

// --- Server Component: RevenueData ---
// Fetches data and performs calculations on the server
async function RevenueData({ params }: { params: { lang: string } }) {
    const supabase = createClient(); // Initialize Supabase server client
    const dictionary = await getDictionary(params.lang as 'en' | 'sq');
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    
    // Adjust the date range to 3 months past and 3 months future
    const threeMonthsAgo = startOfMonth(subMonths(now, 3));
    const threeMonthsAhead = endOfMonth(addMonths(now, 3));

    // Define interfaces for data structures
    interface RevenueChartItem {
        name: string;
        [key: string]: string | number; // Allow dynamic keys for translated labels
    }

    interface BookingListItem {
        id: string | number;
        start_date: string;
        total_amount: number | null;
    }

    interface ExpenseBreakdownItem {
        name: string;
        value: number;
        percentage: number;
    }

    interface MonthlyReportItem {
        key: string;
        year: string;
        month: string;
        amount: number;
    }

    // Initialize data variables with default empty/zero states to prevent errors
    let allBookings: PartialBooking[] = [];
    let allExpenses: PartialExpense[] = [];
    let categories: PartialExpenseCategory[] = [];
    let categoryMap: Map<string, string> = new Map();

    let currentMonthGrossRevenue = 0;
    let currentMonthTotalExpenses = 0;
    let currentMonthNetProfit = 0;
    let futureGrossRevenue = 0;

    let monthlyChartData: RevenueChartItem[] = [];
    let futureBookings: BookingListItem[] = [];
    let pastBookings: BookingListItem[] = [];
    let expenseBreakdownData: ExpenseBreakdownItem[] = [];
    let monthlyReportData: MonthlyReportItem[] = [];

    // --- Fetch Data from Supabase ---
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
                .select('id, start_date, end_date, total_amount') // NO 'status'
                .eq('user_id', user.id) // IMPORTANT: Explicitly filter by user_id
                .gte('start_date', format(threeMonthsAgo, 'yyyy-MM-dd'))
                .lte('start_date', format(threeMonthsAhead, 'yyyy-MM-dd'))
                .order('start_date', { ascending: false }),
            supabase
                .from('expenses')
                .select('id, date, amount, category_id')
                .eq('user_id', user.id) // IMPORTANT: Explicitly filter by user_id
                .gte('date', format(threeMonthsAgo, 'yyyy-MM-dd'))
                .lte('date', format(threeMonthsAhead, 'yyyy-MM-dd'))
                .order('date', { ascending: false }),
            supabase
                .from('expense_categories')
                .select('id, name'),
        ]);

        // Check for errors and assign data
        if (bookingsRes.error) throw new Error(`Bookings fetch error: ${bookingsRes.error.message}`);
        if (expensesRes.error) throw new Error(`Expenses fetch error: ${expensesRes.error.message}`);
        if (categoriesRes.error) throw new Error(`Categories fetch error: ${categoriesRes.error.message}`);

        allBookings = bookingsRes.data || [];
        allExpenses = expensesRes.data || [];
        categories = categoriesRes.data || [];

        // Create a map of category IDs to names for easier lookup
        categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));

    } catch (error: any) {
        console.error("Error fetching revenue data:", error);
        // Render an error message if fetching fails
        return <p className="text-red-500 text-center p-4">{dictionary.error_loading_revenue_data} {error.message}</p>;
    }

    // --- Perform Calculations ---
    try {
        // Ensure arrays are arrays before starting calculations
        if (!Array.isArray(allBookings) || !Array.isArray(allExpenses)) {
            console.error("Calculation Start Error: Fetched data is not in array format.", { allBookings, allExpenses });
            throw new Error("Fetched data format error.");
        }

        // 1. Current Month Summary Data & Future Gross
        const currentMonthBookings = allBookings.filter(b => {
            if (!b || !b.start_date) return false;
            try {
                const startDate = parseISO(b.start_date);
                return isValid(startDate) && startDate >= currentMonthStart && startDate <= currentMonthEnd;
            } catch { return false; }
        });
        const currentMonthExpenses = allExpenses.filter(e => {
            if (!e || !e.date) return false;
            try {
                const expenseDate = parseISO(e.date);
                return isValid(expenseDate) && expenseDate >= currentMonthStart && expenseDate <= currentMonthEnd;
            } catch { return false; }
        });

        currentMonthGrossRevenue = currentMonthBookings
            .reduce((sum, b) => sum + (b?.total_amount || 0), 0);
        currentMonthTotalExpenses = currentMonthExpenses
            .reduce((sum, e) => sum + (e?.amount || 0), 0);
        currentMonthNetProfit = currentMonthGrossRevenue - currentMonthTotalExpenses;

        futureGrossRevenue = allBookings
            .filter(b => {
                if (!b || !b.start_date) return false;
                try {
                    const startDate = parseISO(b.start_date);
                    return isValid(startDate) && isFuture(startDate);
                } catch { return false; }
            })
            .reduce((sum, b) => sum + (b?.total_amount || 0), 0);

        // 2. Monthly Data for Line Chart (Last 6 Months)
        const monthlyDataMap: Record<string, { revenue: number; expenses: number; name: string }> = {};
        for (let i = -3; i <= 2; i++) {
            const monthDate = addMonths(now, i);
            const monthKey = format(monthDate, 'yyyy-MM');
            // Use the appropriate locale based on language
            const monthShort = format(monthDate, 'MMM', { locale: params.lang === 'sq' ? sq : undefined });
            monthlyDataMap[monthKey] = { revenue: 0, expenses: 0, name: monthShort };
        }

        // Process bookings with monthly allocation
        allBookings.forEach(booking => {
            const allocatedRevenue = allocateBookingRevenueAcrossMonths(booking);
            allocatedRevenue.forEach(({ monthKey, amount }) => {
                if (monthlyDataMap[monthKey]) {
                    monthlyDataMap[monthKey].revenue += amount;
                }
            });
        });

        // Process expenses (remains the same as they're single-day entries)
        allExpenses.forEach(expense => {
            if (!expense || !expense.date || !expense.amount) return;
            
            try {
                const expenseDate = parseISO(expense.date);
                if (!isValid(expenseDate)) return;
                
                const monthKey = format(expenseDate, 'yyyy-MM');
                if (monthlyDataMap[monthKey]) {
                    monthlyDataMap[monthKey].expenses += expense.amount;
                }
            } catch (error) {
                console.error('Error processing expense:', error);
            }
        });

        // Calculate current month metrics with proper allocation
        currentMonthGrossRevenue = allBookings.reduce((sum, booking) => {
            const allocatedRevenue = allocateBookingRevenueAcrossMonths(booking);
            const currentMonthKey = format(now, 'yyyy-MM');
            const currentMonthRevenue = allocatedRevenue
                .find(rev => rev.monthKey === currentMonthKey)?.amount || 0;
            return sum + currentMonthRevenue;
        }, 0);

        // Convert monthlyDataMap to array for chart
        monthlyChartData = Object.entries(monthlyDataMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([_, data]) => ({
                name: data.name,
                [dictionary.bookings_label]: Math.round(data.revenue * 100) / 100,
                [dictionary.net_profit_label]: Math.round((data.revenue - data.expenses) * 100) / 100
            }));

        

        // 3. Future / Past Bookings for Lists
        if (!Array.isArray(allBookings)) throw new Error("allBookings corrupted before future/past list calculation."); // Check again
        futureBookings = allBookings
            .filter(b => {
                if (!b || !b.start_date) return false;
                try {
                    const startDate = parseISO(b.start_date);
                    return isValid(startDate) && isFuture(startDate);
                } catch { return false; }
            })
            .slice(0, 5)
            .map(b => ({ id: b.id, start_date: b.start_date, total_amount: b?.total_amount ?? null }));

        if (!Array.isArray(allBookings)) throw new Error("allBookings corrupted before past list calculation."); // Check again
        pastBookings = allBookings
            .filter(b => {
                if (!b || !b.start_date) return false;
                try {
                    const startDate = parseISO(b.start_date);
                    return isValid(startDate) && isPast(startDate);
                } catch { return false; }
            })
            .filter(b => isValid(parseISO(b.start_date)))
            .sort((a, b) => parseISO(b.start_date).getTime() - parseISO(a.start_date).getTime())
            .slice(0, 5)
            .map(b => ({ id: b.id, start_date: b.start_date, total_amount: b?.total_amount ?? null }));

        // 4. Expense Breakdown Data
         if (!Array.isArray(allExpenses)) throw new Error("allExpenses corrupted before breakdown calculation."); // Check again
        const expensesByCategory = allExpenses.reduce((acc, expense) => {
            if (!expense) return acc;
            const categoryId = expense.category_id;
            const originalCategoryName = categoryId ? categoryMap.get(categoryId) : 'Uncategorized';
            // Translate the category name based on the current language
            const categoryName = translateExpenseCategory(originalCategoryName, dictionary, params.lang);
            acc[categoryName] = (acc[categoryName] || 0) + (expense.amount || 0);
            return acc;
        }, {} as Record<string, number>);

        const totalExpensesForBreakdown = allExpenses
            .reduce((sum, e) => sum + (e?.amount || 0), 0);

        expenseBreakdownData = Object.entries(expensesByCategory)
            .map(([name, value]) => ({
                name, value,
                percentage: totalExpensesForBreakdown > 0 ? (value / totalExpensesForBreakdown) * 100 : 0,
            }))
            .sort((a, b) => b.value - a.value);

        // 5. Monthly Reports Grid Data (For Carousel)
        monthlyReportData = Object.entries(monthlyDataMap)
            .sort(([a], [b]) => b.localeCompare(a)) // Reverse sort for display
            .map(([key, data]) => {
                try {
                    const date = parseISO(key + '-01');
                    if (!isValid(date)) return null;
                    return {
                        key: key,
                        year: format(date, 'yyyy'),
                        month: format(date, 'MMMM', { locale: params.lang === 'sq' ? sq : undefined }),
                        amount: Math.round(data.revenue * 100) / 100,
                    };
                } catch { return null; }
            })
            .filter((report): report is MonthlyReportItem => report !== null); // Filter out nulls and assert type

    } catch (calculationError: any) {
        console.error("Error during data calculations:", calculationError);
        // Display error message if calculations fail
        return <p className="text-red-500 text-center p-4">Error processing revenue data: {calculationError.message}</p>;
    }


    // --- Render Components ---
    // Pass the calculated data to the respective presentation components
    return (
        <div className="flex flex-col gap-2">
            {/* Summary Card */}
            <MonthlySummaryCard
                currentMonthProfit={currentMonthNetProfit}
                pendingGross={futureGrossRevenue}
                currentMonthGross={currentMonthGrossRevenue}
                currentMonthExpenses={currentMonthTotalExpenses}
            />
            {/* Revenue Chart Card */}
            <Card>
                <CardHeader><CardTitle>{dictionary.monthly_net_profit}</CardTitle></CardHeader>
                <CardContent className="h-[300px] md:h-[350px]">
                    <Suspense fallback={<div className="flex items-center justify-center h-full">{dictionary.loading_chart}</div>}>
                        {monthlyChartData && monthlyChartData.length > 0 ? (
                            <RevenueLineChart data={monthlyChartData} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                {dictionary.no_chart_data || 'No chart data available.'}
                            </div>
                        )}
                    </Suspense>
                </CardContent>
            </Card>
            {/* Future Bookings List Card */}
            <BookingListCard
                title={dictionary.future_bookings}
                bookings={futureBookings}
                statusLabel={dictionary.future}
                seeAllLink="/bookings?filter=future"
            />
            {/* Past Bookings List Card */}
            <BookingListCard
                title={dictionary.past_bookings}
                bookings={pastBookings}
                statusLabel={dictionary.past}
                showSeeAllButton={true}
                seeAllLink="/bookings?filter=past"
            />
            {/* Expense Breakdown Card */}
            <ExpenseBreakdownCard
                title={dictionary.expense_breakdown}
                data={expenseBreakdownData}
            />
            {/* Monthly Reports Carousel */}
            <MonthlyReportsCarousel
                title={dictionary.monthly_reports}
                reports={monthlyReportData}
            />
        </div>
    );
}

// --- Main Page Component ---
// Wraps the data fetching component with Suspense for loading state
export default async function RevenuePage({ params }: { params: { lang: string } }) {
    const dictionary = await getDictionary(params.lang as 'en' | 'sq');
    
    return (
        // Main page container with padding, including bottom padding
        <div className="p-4 md:p-6 pb-20"> {/* Added bottom padding */}
            {/* Page Title */}
            <h3 className="text-1xl font-semibold mb-1">
                {dictionary.finances}
            </h3>
            {/* Suspense handles the loading state while RevenueData fetches */}
            <Suspense fallback={<div className="text-center p-10">{dictionary.loading_revenue_data}</div>}>
                {/* Render the server component that fetches and processes data */}
                <RevenueData params={params} />
            </Suspense>
        </div>
    );
}
