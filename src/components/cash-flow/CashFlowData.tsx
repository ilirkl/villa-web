// src/components/cash-flow/CashFlowData.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tables } from '@/lib/database.types';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';
import { UpdatePaymentStatusButton } from './UpdatePaymentStatusButton';

type Booking = Tables<'bookings'>;
type Expense = Tables<'expenses'>;
type ExpenseCategory = Tables<'expense_categories'>;

interface ExpenseWithCategory extends Expense {
  expense_categories?: ExpenseCategory | null;
}

interface CashFlowSummary {
  totalPendingRevenue: number;
  totalPrepaidRevenue: number;
  totalPendingExpenses: number;
}

interface CashFlowDataProps {
  params: { lang: string };
  dictionary: any;
}

export function CashFlowData({ params, dictionary }: CashFlowDataProps) {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseWithCategory[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get unique categories from expenses
  const categories = ['all', ...new Set(pendingExpenses.map(expense =>
    expense.expense_categories?.name || 'uncategorized'
  ))];

  // Filter expenses based on selected category
  useEffect(() => {
    if (selectedCategory === 'all') {
      setFilteredExpenses(pendingExpenses);
    } else {
      setFilteredExpenses(pendingExpenses.filter(expense =>
        expense.expense_categories?.name === selectedCategory ||
        (selectedCategory === 'uncategorized' && !expense.expense_categories)
      ));
    }
  }, [pendingExpenses, selectedCategory]);

  // Calculate summary based on filtered expenses
  const summary: CashFlowSummary = {
    totalPendingRevenue: pendingBookings.reduce((sum, booking) => 
      sum + (booking.total_amount - booking.prepayment), 0),
    totalPrepaidRevenue: pendingBookings.reduce((sum, booking) => 
      sum + booking.prepayment, 0),
    totalPendingExpenses: filteredExpenses.reduce((sum, expense) => 
      sum + expense.amount, 0),
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get the current authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('Authentication required');
        }

        // Get properties with auto-selection for single property case
        const { getPropertiesWithAutoSelection } = await import('@/lib/property-utils');
        const { properties, selectedPropertyId } = await getPropertiesWithAutoSelection(supabase);
        
        if (properties.length === 0) {
          throw new Error('No properties found. Please add a property first.');
        }
        
        if (!selectedPropertyId) {
          throw new Error('Please select a property');
        }

        // Fetch pending bookings and expenses with categories
        const [bookingsRes, expensesRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('*')
            .eq('user_id', user.id)
            .eq('property_id', selectedPropertyId)
            .eq('payment_status', 'Pending')
            .order('start_date', { ascending: true }),
          supabase
            .from('expenses')
            .select('*, expense_categories(*)')
            .eq('user_id', user.id)
            .eq('property_id', selectedPropertyId)
            .eq('payment_status', 'Pending')
            .order('date', { ascending: true }),
        ]);

        if (bookingsRes.error) throw new Error(`Bookings fetch error: ${bookingsRes.error.message}`);
        if (expensesRes.error) throw new Error(`Expenses fetch error: ${expensesRes.error.message}`);

        setPendingBookings(bookingsRes.data || []);
        setPendingExpenses(expensesRes.data || []);
        setFilteredExpenses(expensesRes.data || []);
      } catch (error: any) {
        console.error("Error fetching cash flow data:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-center">{dictionary.loading || 'Loading...'}</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <p className="text-red-500 text-center">
          {dictionary.error_loading_cash_flow_data || 'Error loading cash flow data'}: {error}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {dictionary.pending_revenue || 'Pending Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(summary.totalPendingRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingBookings.length} {dictionary.bookings || 'bookings'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {dictionary.prepayment_revenue || 'Prepayment Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary.totalPrepaidRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dictionary.received || 'received'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {dictionary.pending_expenses || 'Pending Expenses'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalPendingExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filteredExpenses.length} {dictionary.expenses || 'expenses'}
              {selectedCategory !== 'all' && ` (${dictionary.filtered || 'filtered'})`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Category Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{dictionary.filter_by_category || 'Filter by category'}:</span>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={dictionary.all_categories || 'All categories'} />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' 
                  ? dictionary.all_categories || 'All categories'
                  : category === 'uncategorized'
                  ? dictionary.uncategorized || 'Uncategorized'
                  : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile View - Cards */}
      <div className="md:hidden space-y-4">
        {/* Pending Bookings Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {dictionary.pending_bookings || 'Pending Bookings'}
          </h3>
          <div className="space-y-3">
            {pendingBookings.map((booking) => (
              <Card key={booking.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{booking.guest_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(booking.start_date), 'MMM dd', { 
                        locale: params.lang === 'sq' ? sq : undefined 
                      })} - {format(new Date(booking.end_date), 'MMM dd', { 
                        locale: params.lang === 'sq' ? sq : undefined 
                      })}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {dictionary.pending || 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">
                      {dictionary.total || 'Total'}: {formatCurrency(booking.total_amount)}
                    </p>
                    <p className="text-sm">
                      {dictionary.prepayment || 'Prepayment'}: {formatCurrency(booking.prepayment)}
                    </p>
                    <p className="text-sm font-medium">
                      {dictionary.pending_amount || 'Pending'}: {formatCurrency(booking.total_amount - booking.prepayment)}
                    </p>
                  </div>
                  <UpdatePaymentStatusButton 
                    id={booking.id} 
                    type="booking" 
                    dictionary={dictionary}
                  />
                </div>
              </Card>
            ))}
            {pendingBookings.length === 0 && (
              <Card className="p-4 text-center text-muted-foreground">
                {dictionary.no_pending_bookings || 'No pending bookings'}
              </Card>
            )}
          </div>
        </div>

        {/* Pending Expenses Cards */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {dictionary.pending_expenses || 'Pending Expenses'}
          </h3>
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <Card key={expense.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">
                      {expense.description || dictionary.uncategorized || 'Uncategorized'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(expense.date), 'MMM dd, yyyy', { 
                        locale: params.lang === 'sq' ? sq : undefined 
                      })}
                      {expense.expense_categories && (
                        <span className="ml-2">
                          • <Badge variant="outline" className="text-xs">{expense.expense_categories.name}</Badge>
                        </span>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {dictionary.pending || 'Pending'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-lg font-medium">
                    {formatCurrency(expense.amount)}
                  </p>
                  <UpdatePaymentStatusButton 
                    id={expense.id} 
                    type="expense" 
                    dictionary={dictionary}
                  />
                </div>
              </Card>
            ))}
            {filteredExpenses.length === 0 && (
              <Card className="p-4 text-center text-muted-foreground">
                {dictionary.no_pending_expenses || 'No pending expenses'}
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View - Tables */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Bookings Table */}
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.pending_bookings || 'Pending Bookings'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{dictionary.guest || 'Guest'}</th>
                      <th className="text-left py-2">{dictionary.dates || 'Dates'}</th>
                      <th className="text-right py-2">{dictionary.total || 'Total'}</th>
                      <th className="text-right py-2">{dictionary.prepayment || 'Prepayment'}</th>
                      <th className="text-right py-2">{dictionary.pending_amount || 'Pending'}</th>
                      <th className="text-right py-2">{dictionary.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingBookings.map((booking) => (
                      <tr key={booking.id} className="border-b">
                        <td className="py-2">{booking.guest_name}</td>
                        <td className="py-2">
                          {format(new Date(booking.start_date), 'MMM dd', { 
                            locale: params.lang === 'sq' ? sq : undefined 
                          })} - {format(new Date(booking.end_date), 'MMM dd', { 
                            locale: params.lang === 'sq' ? sq : undefined 
                          })}
                        </td>
                        <td className="py-2 text-right">{formatCurrency(booking.total_amount)}</td>
                        <td className="py-2 text-right">{formatCurrency(booking.prepayment)}</td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(booking.total_amount - booking.prepayment)}
                        </td>
                        <td className="py-2 text-right">
                          <UpdatePaymentStatusButton 
                            id={booking.id} 
                            type="booking" 
                            dictionary={dictionary}
                          />
                        </td>
                      </tr>
                    ))}
                    {pendingBookings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-muted-foreground">
                          {dictionary.no_pending_bookings || 'No pending bookings'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pending Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>{dictionary.pending_expenses || 'Pending Expenses'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">{dictionary.description || 'Description'}</th>
                      <th className="text-left py-2">{dictionary.category || 'Category'}</th>
                      <th className="text-left py-2">{dictionary.date || 'Date'}</th>
                      <th className="text-right py-2">{dictionary.amount || 'Amount'}</th>
                      <th className="text-right py-2">{dictionary.actions || 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="border-b">
                        <td className="py-2">
                          {expense.description || dictionary.uncategorized || 'Uncategorized'}
                        </td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {expense.expense_categories?.name || dictionary.uncategorized || 'Uncategorized'}
                          </Badge>
                        </td>
                        <td className="py-2">
                          {format(new Date(expense.date), 'MMM dd, yyyy', { 
                            locale: params.lang === 'sq' ? sq : undefined 
                          })}
                        </td>
                        <td className="py-2 text-right">{formatCurrency(expense.amount)}</td>
                        <td className="py-2 text-right">
                          <UpdatePaymentStatusButton 
                            id={expense.id} 
                            type="expense" 
                            dictionary={dictionary}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">
                          {dictionary.no_pending_expenses || 'No pending expenses'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}