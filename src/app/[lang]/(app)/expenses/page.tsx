'use client';

import { createClient } from '@/lib/supabase/client';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutGrid, Table as TableIcon, Pencil, Trash2 } from 'lucide-react';
import { useState, useEffect, JSX } from 'react';
import { Expense, ExpenseCategory, ExpenseFormData } from '@/lib/definitions';
import { FilterSheet } from '@/components/FilterSheet';
import { SearchBar } from '@/components/SearchBar';
import { getDictionary } from '@/lib/dictionary';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteExpense } from '@/lib/actions/expenses';

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
        
        // Also update filter options with consistent colors
        const options = categoriesData?.map(cat => {
          let color;
          switch (cat.name.toLowerCase()) {
            case 'furnizim': color = '#34d399'; break; // Green
            case 'mirembajtje': color = '#f59e0b'; break; // Amber
            case 'pastrim': color = '#3b82f6'; break; // Blue
            case 'komunalite': color = '#8b5cf6'; break; // Purple
            case 'taksa': color = '#ef4444'; break; // Red
            case 'komision': color = '#ec4899'; break; // Pink
            case 'tjera': color = '#6b7280'; break; // Gray
            default: color = '#6b7280'; break; // Default gray
          }
          return {
            id: cat.id,
            name: cat.name,
            color: color
          };
        }) || [];
        
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

  // Function to handle expense deletion
  const handleDelete = async (expenseId: string) => {
    try {
      const result = await deleteExpense(expenseId);
      if (result.error) {
        toast.error("Error Deleting Expense", {
          description: result.error,
        });
      } else {
        toast.success("Expense Deleted", {
          description: result.message,
        });
        handleRefresh();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
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

  // Add function to get category badge style
  const getCategoryBadgeStyle = (categoryName: string | undefined) => {
    if (!categoryName) return 'bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20';
    
    switch (categoryName.toLowerCase()) {
      case 'furnizim':
        return 'bg-[#34d399]/10 text-[#34d399] border border-[#34d399]/20'; // Green
      case 'mirembajtje':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20'; // Amber
      case 'pastrim':
        return 'bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20'; // Blue
      case 'komunalite':
        return 'bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20'; // Purple
      case 'taksa':
        return 'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20'; // Red
      case 'komision':
        return 'bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/20'; // Pink
      case 'tjera':
        return 'bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20'; // Gray
      default:
        return 'bg-[#6b7280]/10 text-[#6b7280] border border-[#6b7280]/20'; // Default gray
    }
  };

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
            const categoryName = expense.expense_categories?.name || 'Uncategorized';
            const badgeStyle = getCategoryBadgeStyle(categoryName);
            
            return (
              <TableRow key={expense.id}>
                <TableCell>{formattedDate}</TableCell>
                <TableCell className="font-medium">{expense.description || 'N/A'}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeStyle}`}>
                    {categoryName}
                  </span>
                </TableCell>
                <TableCell className="text-right">€{expense.amount?.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => handleEditExpense(expense.id)}
                      className="p-0 bg-transparent border-none"
                    >
                      <Pencil className="h-5 w-5 transition-all duration-300 ease-in-out transform
                              text-[#ff5a5f] hover:scale-110
                              active:scale-95 active:rotate-12 cursor-pointer" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button 
                          className="p-0 bg-transparent border-none"
                        >
                          <Trash2 className="h-5 w-5 text-[#ff5a5f] cursor-pointer" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{dictionary.are_you_sure || 'Are you sure?'}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {(dictionary.delete_confirmation || 'This action cannot be undone. This will permanently delete this expense record of €{amount}.')
                              .replace('{amount}', expense.amount?.toLocaleString() || '0')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{dictionary.cancel || 'Cancel'}</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(expense.id)}
                            style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                            className='hover:bg-[#FF5A5F]/90'
                          >
                            {dictionary.delete || 'Delete'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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
