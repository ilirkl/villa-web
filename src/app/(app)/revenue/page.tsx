// app/(app)/revenue/page.tsx
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RevenueChart from '@/components/revenue/RevenueChart'; // Create this
import ExpenseBreakdownChart from '@/components/revenue/ExpenseBreakdownChart'; // Create this
import ProfitSummary from '@/components/revenue/ProfitSummary'; // Create this

async function RevenueData() {
  const supabase = createClient();

  // Fetch all relevant data concurrently
  const [bookingsRes, expensesRes, categoriesRes] = await Promise.all([
    supabase.from('bookings').select('start_date, total_amount'),
    supabase.from('expenses').select('date, amount, category_id'),
    supabase.from('expense_categories').select('id, name'),
  ]);

  if (bookingsRes.error || expensesRes.error || categoriesRes.error) {
    console.error("Error fetching revenue data:", bookingsRes.error || expensesRes.error || categoriesRes.error);
    return <p>Error loading revenue data.</p>;
  }

  const bookings = bookingsRes.data || [];
  const expenses = expensesRes.data || [];
  const categories = categoriesRes.data || [];

  // --- Perform Calculations ---

  // Example: Total Revenue
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Example: Total Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Example: Net Profit
  const netProfit = totalRevenue - totalExpenses;

  // Example: Data for Expense Breakdown Chart (by category)
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const expensesByCategory = expenses.reduce((acc, expense) => {
      const categoryName = expense.category_id ? categoryMap.get(expense.category_id) || 'Uncategorized' : 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + (expense.amount || 0);
      return acc;
  }, {} as Record<string, number>);

  const expenseBreakdownData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));


  // Example: Data for Revenue over time (e.g., monthly)
  const revenueByMonth: Record<string, number> = {}; // Key: YYYY-MM
  bookings.forEach(booking => {
      try {
         const monthKey = format(new Date(booking.start_date), 'yyyy-MM');
         revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + (booking.total_amount || 0);
      } catch (e) { console.error("Invalid date in booking: ", booking.id)} // Handle potential invalid dates
  });
   // Sort keys and format for chart
   const monthlyRevenueData = Object.keys(revenueByMonth).sort().map(key => ({
       name: key, // Or format as 'MMM yyyy'
       revenue: revenueByMonth[key]
   }));


  // --- Render Components ---
  return (
     <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Summary Cards */}
         <ProfitSummary totalRevenue={totalRevenue} totalExpenses={totalExpenses} netProfit={netProfit} />

         {/* Revenue Chart Card */}
         <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Chart needs to be Client Component */}
                <RevenueChart data={monthlyRevenueData} />
            </CardContent>
         </Card>

         {/* Expense Breakdown Card */}
         <Card>
            <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Chart needs to be Client Component */}
                <ExpenseBreakdownChart data={expenseBreakdownData} />
            </CardContent>
        </Card>

        {/* Add more charts/analysis cards as needed */}
     </div>
  );
}

export default function RevenuePage() {
    return (
        <div>
            <h1 className="text-2xl font-semibold mb-6">Revenue Analysis</h1>
             <Suspense fallback={<div>Loading revenue data...</div>}>
                <RevenueData />
             </Suspense>
        </div>
    );
}