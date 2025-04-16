'use client';

import { createClient } from '@/lib/supabase/client';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Expense, ExpenseCategory } from '@/lib/definitions';
import { FilterSheet } from '@/components/FilterSheet'; // Updated import
import { SearchBar } from '@/components/SearchBar';

type ExpenseWithCategory = Expense & {
    expense_categories: Pick<ExpenseCategory, 'name'> | null;
};

// Define sort options for expenses
const sortOptions = [
  { field: 'date', label: 'Date' },
  { field: 'amount', label: 'Amount' }
];

// Category color mapping
const getCategoryColor = (categoryName: string): string => {
  switch (categoryName.toLowerCase()) {
    case 'furnizim':
      return '#34d399'; // Green
    case 'mirembajtje':
      return '#f59e0b'; // Amber
    case 'pastrim':
      return '#3b82f6'; // Blue
    case 'komunalite':
      return '#8b5cf6'; // Purple
    case 'tjera':
      return '#ef4444'; // Red
    case 'komision':
      return '#ec4899'; // Pink
    default:
      return '#6366f1'; // Default indigo
  }
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [filterOptions, setFilterOptions] = useState<Array<{ id: string; name: string; color: string }>>([]);

  // Fetch categories for filter options
  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');
      
      if (data) {
        setFilterOptions(data.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: getCategoryColor(cat.name)
        })));
      }
    };

    fetchCategories();
  }, []);

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories ( name )')
        .order(sortField, { ascending: sortOrder === 'asc' });

      if (error) {
        setError(error.message);
      } else {
        setExpenses(data || []);
      }
      setIsLoading(false);
    };

    fetchExpenses();
  }, [sortField, sortOrder]);

  // Apply filters and search
  useEffect(() => {
    let result = [...expenses];

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(expense => expense.category_id === categoryFilter);
    }

    // Apply search to description and category name
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(expense =>
        expense.description?.toLowerCase().includes(searchLower) ||
        expense.expense_categories?.name.toLowerCase().includes(searchLower)
      );
    }

    setFilteredExpenses(result);
  }, [expenses, categoryFilter, searchTerm]);

  if (isLoading) return <div>Loading expenses...</div>;
  if (error) return <p className="text-red-500">Error loading expenses: {error}</p>;
  if (!expenses || expenses.length === 0) return <p>No expenses recorded yet.</p>;

  return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link href="/expenses/add" className="group relative">
          <PlusCircle 
            className="h-8 w-8 transition-all duration-300 ease-in-out transform 
                       group-hover:scale-110 group-hover:rotate-90 group-hover:shadow-lg 
                       active:scale-95 active:rotate-180" 
            style={{ 
              color: '#ff5a5f',
              filter: 'drop-shadow(0 0 0.5rem rgba(255, 90, 95, 0.3))'
            }} 
          />
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <SearchBar 
            onSearch={setSearchTerm}
            placeholder="Search description or category..."
          />
        </div>
        <FilterSheet 
          title="Filter Expenses"
          sortOptions={sortOptions}
          filterOptions={filterOptions}
          currentSortField={sortField}
          currentSortOrder={sortOrder}
          currentFilter={categoryFilter}
          onSortFieldChange={(field) => setSortField(field as 'date' | 'amount')}
          onSortOrderChange={setSortOrder}
          onFilterChange={setCategoryFilter}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredExpenses.map((expense) => (
          <ExpenseCard key={expense.id} expense={expense} />
        ))}
      </div>
    </div>
  );
}
