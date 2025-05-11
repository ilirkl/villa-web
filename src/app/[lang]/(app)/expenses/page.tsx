'use client';

import { createClient } from '@/lib/supabase/client';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutGrid, Table as TableIcon } from 'lucide-react';
import { useState, useEffect, JSX } from 'react';
import { Expense, ExpenseCategory, ExpenseFormData } from '@/lib/definitions';
import { FilterSheet } from '@/components/FilterSheet';
import { SearchBar } from '@/components/SearchBar';
import { getDictionary } from '@/lib/dictionary';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';

type ExpenseWithCategory = Expense & {
    expense_categories: Pick<ExpenseCategory, 'name'> | null;
};

// Define sort options
const sortOptions = [
  { field: 'date', label: 'Date' },
  { field: 'amount', label: 'Amount' }
];

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [dictionary, setDictionary] = useState<any>({});
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  // New state for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState<ExpenseFormData | null>(null);
  
  const { lang } = useParams();

  // Define modalTitle based on whether we're adding or editing
  const modalTitle = currentExpense?.id 
    ? (dictionary.edit_expense || "Edit Expense") 
    : (dictionary.add_new_expense || "Add New Expense");

  // Load dictionary and categories when the component mounts
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load dictionary
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
        
        // Load categories
        const supabase = createClient();
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('expense_categories')
          .select('*')
          .order('name');
          
        if (categoriesError) throw categoriesError;
        
        setCategories(categoriesData || []);
        
        // Also update filter options
        const options = categoriesData?.map(cat => ({
          id: cat.id,
          name: cat.name,
          color: '#' + Math.floor(Math.random()*16777215).toString(16) // Random color
        })) || [];
        
        setFilterOptions(options);
      } catch (err: any) {
        console.error('Error loading initial data:', err);
        setError(err.message);
      }
    };
    
    loadInitialData();
  }, [lang]);

  // Add a useEffect to load expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        
        // First, fetch expenses with their categories
        const { data, error } = await supabase
          .from('expenses')
          .select(`
            *,
            expense_categories (
              name
            )
          `)
          .order(sortField, { ascending: sortOrder === 'asc' });
          
        if (error) throw error;
        
        setExpenses(data || []);
        setFilteredExpenses(data || []);
      } catch (err: any) {
        console.error('Error fetching expenses:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExpenses();
  }, [sortField, sortOrder, refreshTrigger]);

  // Add useEffect for filtering expenses
  useEffect(() => {
    if (!expenses) return;
    
    let filtered = [...expenses];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category_id === categoryFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(expense => 
        expense.description?.toLowerCase().includes(term) || 
        expense.expense_categories?.name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredExpenses(filtered);
  }, [expenses, categoryFilter, searchTerm]);

  // Function to handle opening the modal for adding a new expense
  const handleAddExpense = () => {
    setCurrentExpense(null); // Reset current expense (for adding new)
    setIsModalOpen(true);
  };

  // Function to handle opening the modal for editing an existing expense
  const handleEditExpense = async (expenseId: string) => {
    try {
      // Don't set isLoading to true here, as it affects the whole page
      // Instead, we could add a separate loading state for the modal
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', expenseId)
        .single();
        
      if (error) throw error;
      
      // Convert date string to Date object for the form
      const expenseData: ExpenseFormData = {
        ...data,
        date: data.date ? new Date(data.date + 'T00:00:00') : undefined,
      };
      
      setCurrentExpense(expenseData);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error('Error fetching expense:', err);
      toast.error(dictionary.error_loading_expense || "Error loading expense");
    }
  };

  // Function to handle form submission success
  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setCurrentExpense(null);
    handleRefresh();
  };

  // Function to refresh the expenses list
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Replace the Add button with a button that opens the modal
  const AddButton = () => (
    <button 
      onClick={handleAddExpense}
      className="fixed bottom-25 right-6 z-10 group"
    >
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-white shadow-lg"></div>
        <PlusCircle 
          className="h-12 w-12 transition-all duration-300 ease-in-out transform 
                    group-hover:scale-110 group-hover:rotate-90
                    active:scale-95 active:rotate-180 relative z-10" 
          style={{ 
            color: '#ff5a5f',
            filter: 'drop-shadow(0 0 0.75rem rgba(255, 90, 95, 0.5))'
          }} 
        />
        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 
                      transition-opacity duration-300 z-20"></div>
      </div>
    </button>
  );

  // Add viewMode state and isMobile state
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isMobile, setIsMobile] = useState(false);

  // Add useEffect for mobile detection and setting default view mode
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileScreen = window.innerWidth < 768;
      setIsMobile(isMobileScreen);
      
      // Set default view mode based on screen size
      // Mobile: card view, Non-mobile: table view
      setViewMode(isMobileScreen ? 'card' : 'table');
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Add function to render expense table
  function renderExpenseTable(): JSX.Element {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{dictionary.date || 'Date'}</TableHead>
            <TableHead>{dictionary.description || 'Description'}</TableHead>
            <TableHead>{dictionary.category || 'Category'}</TableHead>
            <TableHead className="text-right">{dictionary.amount || 'Amount'}</TableHead>
            <TableHead className="text-right">{dictionary.actions || 'Actions'}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExpenses.map((expense) => {
            // Format date for display
            const date = expense.date ? new Date(expense.date) : null;
            const formattedDate = date ? date.toLocaleDateString() : 'N/A';
            
            return (
              <TableRow key={expense.id}>
                <TableCell>{formattedDate}</TableCell>
                <TableCell className="font-medium">{expense.description || 'N/A'}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                    {expense.expense_categories?.name || 'Uncategorized'}
                  </span>
                </TableCell>
                <TableCell className="text-right">€{expense.amount?.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleEditExpense(expense.id)}>
                    {dictionary.edit || 'Edit'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  // Existing loading, error, and empty states...

  if (isLoading) return <div>{dictionary.loading_expenses || 'Loading expenses...'}</div>;
  
  if (error) return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <AddButton />
      </div>
      <p className="text-red-500">{dictionary.error_loading_expenses || 'Error loading expenses:'} {error}</p>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          {isModalOpen && (
            <ExpenseForm 
              initialData={currentExpense} 
              categories={categories}
              dictionary={dictionary} 
              onSuccess={handleFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // Show UI even when no expenses exist
  if (!expenses || expenses.length === 0) return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <AddButton />
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <SearchBar 
            onSearch={setSearchTerm}
            placeholder={dictionary.search_expenses || "Search description or category..."}
          />
        </div>
        <FilterSheet 
          title={dictionary.filter_expenses || "Filter Expenses"}
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
      
      <p className="text-center py-10">{dictionary.no_expenses || 'No expenses recorded yet.'}</p>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          {isModalOpen && (
            <ExpenseForm 
              initialData={currentExpense} 
              categories={categories}
              dictionary={dictionary} 
              onSuccess={handleFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="pb-18">
      <div className="flex justify-between items-center mb-1">
        <AddButton />
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1">
          <SearchBar 
            onSearch={setSearchTerm}
            placeholder={dictionary.search_expenses || "Search description or category..."}
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle Button - Only show on non-mobile */}
          <div className="hidden md:flex border rounded-md">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <LayoutGrid size={16} className="mr-1" />
              {dictionary.cards || 'Cards'}
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-l-none"
            >
              <TableIcon size={16} className="mr-1" />
              {dictionary.table || 'Table'}
            </Button>
          </div>
          <FilterSheet 
            title={dictionary.filter_expenses || "Filter Expenses"}
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
      </div>

      {/* Conditionally render card or table view based on viewMode */}
      {viewMode === 'card' || isMobile ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExpenses.map((expense) => (
            <ExpenseCard 
              key={expense.id} 
              expense={expense} 
              onDelete={handleRefresh}
              onEdit={() => handleEditExpense(expense.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          {renderExpenseTable()}
        </div>
      )}
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
          </DialogHeader>
          {isModalOpen && (
            <ExpenseForm 
              initialData={currentExpense} 
              categories={categories}
              dictionary={dictionary} 
              onSuccess={handleFormSuccess} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
