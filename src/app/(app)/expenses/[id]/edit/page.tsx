// app/(app)/expenses/[id]/edit/page.tsx
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getExpenseCategories } from '@/lib/actions/expenses';
import { Suspense } from 'react';
import { ExpenseFormData } from '@/lib/definitions'; // Using form-specific type

interface EditExpensePageProps {
    params: { id: string };
}

async function LoadDataAndRenderForm({ expenseId }: { expenseId: string }) {
    const supabase = createClient();

    // Fetch expense and categories concurrently
    const [expenseResult, categories] = await Promise.all([
        supabase
            .from('expenses')
            .select('*') // Select all fields needed for the form
            .eq('id', expenseId)
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


    return <ExpenseForm initialData={initialFormData} categories={categories} />;
}


export default function EditExpensePage({ params }: EditExpensePageProps) {
  const { id } = params;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Edit Expense</h1>
       <Suspense fallback={<div>Loading expense data...</div>}>
           <LoadDataAndRenderForm expenseId={id} />
       </Suspense>
    </div>
  );
}