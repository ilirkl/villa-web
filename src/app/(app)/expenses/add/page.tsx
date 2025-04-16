// app/(app)/expenses/add/page.tsx
import { ExpenseForm } from '@/components/expenses/ExpenseForm'; // Create this next
import { getExpenseCategories } from '@/lib/actions/expenses'; // Action to fetch categories
import { Suspense } from 'react';

async function LoadCategoriesAndRenderForm() {
    // Fetch categories server-side to pass to the form
    const categories = await getExpenseCategories();

    return <ExpenseForm categories={categories} />;
}


export default function AddExpensePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Add New Expense</h1>
       <Suspense fallback={<div>Loading form...</div>}>
            <LoadCategoriesAndRenderForm />
       </Suspense>
    </div>
  );
}