// app/(app)/expenses/add/page.tsx
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { getExpenseCategories } from '@/lib/actions/expenses';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/dictionary';

async function LoadCategoriesAndRenderForm({ lang }: { lang: string }) {
    // Fetch categories server-side to pass to the form
    const categories = await getExpenseCategories();
    const dictionary = await getDictionary(lang as 'en' | 'sq');

    return <ExpenseForm categories={categories} dictionary={dictionary} />;
}


export default async function AddExpensePage({ params }: { params: { lang: string } }) {
  const dictionary = await getDictionary(params.lang as 'en' | 'sq');
  
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">{dictionary.add_new_expense || "Add New Expense"}</h1>
       <Suspense fallback={<div>{dictionary.loading_form || "Loading form..."}</div>}>
            <LoadCategoriesAndRenderForm lang={params.lang} />
       </Suspense>
    </div>
  );
}
