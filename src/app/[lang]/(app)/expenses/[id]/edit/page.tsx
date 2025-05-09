// app/(app)/expenses/[id]/edit/page.tsx
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getExpenseCategories } from '@/lib/actions/expenses';
import { Suspense } from 'react';
import { ExpenseFormData } from '@/lib/definitions'; // Using form-specific type
import { getDictionary } from '@/lib/dictionary';

interface EditExpensePageProps {
    params: { id: string; lang: string };
}

async function LoadDataAndRenderForm({ expenseId, lang }: { expenseId: string, lang: string }) {
    const supabase = createClient();
    const dictionary = await getDictionary(lang as 'en' | 'sq');

    // Get the current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Check if user is authenticated
    if (!user) {
      throw new Error('Authentication required');
    }

    // Fetch expense and categories concurrently
    const [expenseResult, categories] = await Promise.all([
        supabase
            .from('expenses')
            .select('*') // Select all fields needed for the form
            .eq('id', expenseId)
            .eq('user_id', user.id) // IMPORTANT: Explicitly check user ownership
            .single(),
        getExpenseCategories() // Fetch categories for the dropdown
    ]);

    const { data: expense, error } = expenseResult;

    if (error || !expense) {
        console.error("Error fetching expense for edit:", error);
        notFound(); // Show 404 if expense not found or error
    }

    // Prepare initial data for the form
    // IMPORTANT: Convert date string from DB to Date object for the form's DatePicker
    const initialFormData: ExpenseFormData = {
        ...expense,
        date: new Date(expense.date), // Convert string to Date
        // Ensure category_id is passed correctly (it might be null)
        category_id: expense.category_id ?? undefined, // Pass undefined if null for react-hook-form
        // Handle months if using:
        // months: expense.months ?? undefined,
    };


    return <ExpenseForm initialData={initialFormData} categories={categories} dictionary={dictionary} />;
}


export default function EditExpensePage({ params }: EditExpensePageProps) {
  const { id, lang } = params;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Expense</h1>
       <Suspense fallback={<div>Loading expense data...</div>}>
           <LoadDataAndRenderForm expenseId={id} lang={lang} />
       </Suspense>
    </div>
  );
}
