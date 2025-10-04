// lib/actions/expenses.ts
'use server';

import { z } from 'zod';
import { createActionClient } from '@/lib/supabase/server'; // Using action client
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { ExpenseCategory } from '@/lib/definitions'; // Assuming you might need this type
import { getServerCsrfToken } from '@/lib/csrf';

// Zod schema for expense form validation
// Based on: id, category_id, amount, date, description, months
const ExpenseSchema = z.object({
  id: z.string().uuid().optional(), // Optional: only present for updates
  category_id: z.string().uuid("Invalid category").nullable().optional(), // Can be null or omitted if category is not selected
  amount: z.coerce // Coerce form string to number
    .number({ invalid_type_error: 'Please enter a valid amount.' })
    .min(0.01, { message: 'Amount must be positive.' }),
  date: z.coerce.date({ required_error: 'Please select a date.' }), // Coerce to Date object
  description: z.string().optional().nullable(),
  property_id: z.string().uuid('Property is required'),
  // Optional: Add months validation if you include it in your form
  // months: z.array(z.coerce.number().int().min(1).max(12))
  //   .optional()
  //   .nullable()
  //   .refine(arr => !arr || new Set(arr).size === arr.length, { // Ensure unique months if provided
  //       message: 'Months must be unique',
  //   }),
});

// Type for state returned by the action (for useFormState)
export type ExpenseState = {
  errors?: {
    category_id?: string[];
    amount?: string[];
    date?: string[];
    description?: string[];
    property_id?: string[];
    months?: string[]; // Add if using months field
    database?: string[]; // For general DB or other errors
  };
  message?: string | null;
};

// --- Server Action: Create or Update Expense ---
export async function createOrUpdateExpense(
  prevState: ExpenseState | undefined,
  formData: FormData
): Promise<ExpenseState> {
  // Verify CSRF token from form data
  const formCsrfToken = formData.get('csrf_token') as string;
  const serverCsrfToken = getServerCsrfToken();
  
  if (!formCsrfToken || !serverCsrfToken || formCsrfToken !== serverCsrfToken) {
    return { 
      errors: { database: ["Invalid security token"] },
      message: "Security verification failed" 
    };
  }
  
  const cookieStore = cookies();
  const supabase = createActionClient();

  // Check if formData is defined
  if (!formData || !(formData instanceof FormData)) {
    console.error("Invalid or missing FormData:", formData);
    return { 
      errors: { database: ["Invalid form data submission"] },
      message: "Invalid form data submission" 
    };
  }

  // 1. Authenticate User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { message: 'Authentication required.' };
  }

  // 2. Validate Form Data
  const rawFormData = Object.fromEntries(formData.entries());
  console.log('Raw form data received:', rawFormData);

  // Create a new object with explicit typing to allow null values
  const formDataForValidation: Record<string, string | number | null | Date> = {};

  // Manually copy and convert values as needed
  Object.entries(rawFormData).forEach(([key, value]) => {
    // Only handle string values (ignore File objects if any)
    if (typeof value === 'string') {
      if (key === 'category_id' && value === '') {
        formDataForValidation[key] = null;
      } else if (key === 'date') {
        // Parse date string to Date object
        try {
          console.log('Parsing date string:', value);
          // Ensure we have a valid date format (YYYY-MM-DD)
          const dateObj = new Date(value);
          console.log('Parsed date object:', dateObj);
          console.log('Date is valid:', !isNaN(dateObj.getTime()));
          
          if (!isNaN(dateObj.getTime())) {
            formDataForValidation[key] = dateObj;
          } else {
            throw new Error('Invalid date');
          }
        } catch (e) {
          console.error('Error parsing date:', value, e);
          // Try to fix the date format if possible
          const parts = value.split(/[-T]/);
          if (parts.length >= 3) {
            try {
              const fixedDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
              if (!isNaN(fixedDate.getTime())) {
                formDataForValidation[key] = fixedDate;
              } else {
                formDataForValidation[key] = new Date(); // Use current date as fallback
              }
            } catch {
              formDataForValidation[key] = new Date(); // Use current date as fallback
            }
          } else {
            formDataForValidation[key] = new Date(); // Use current date as fallback
          }
        }
      } else if (key === 'amount') {
        formDataForValidation[key] = parseFloat(value);
      } else {
        formDataForValidation[key] = value;
      }
    }
  });

  console.log('Form data for validation:', formDataForValidation);
  const validatedFields = ExpenseSchema.safeParse(formDataForValidation);

  if (!validatedFields.success) {
    console.error("Validation Errors:", validatedFields.error.flatten().fieldErrors);
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid form data. Please check the fields.',
    };
  }

  // 3. Prepare Data for Supabase
  const { id, date, ...expenseData } = validatedFields.data;
  const dateString = date.toISOString().split('T')[0]; // Format YYYY-MM-DD for Supabase date type

  // Ensure category_id is null if not provided or explicitly null
  const finalCategoryId = expenseData.category_id === undefined ? null : expenseData.category_id;

  // Handle months if using: ensure null if empty array or not provided
  // const finalMonths = expenseData.months && expenseData.months.length > 0 ? expenseData.months : null;

  // Get the selected property ID from cookies
  const selectedPropertyId = cookieStore.get('selectedPropertyId')?.value;
  if (!selectedPropertyId) {
    return {
      errors: { property_id: ["No property selected"] },
      message: "Please select a property first"
    };
  }

  try {
    let result;
    if (id) {
      // --- Update Existing Expense ---
      console.log('Updating expense with ID:', id);
      result = await supabase
        .from('expenses')
        .update({
          ...expenseData,
          category_id: finalCategoryId,
          date: dateString,
          property_id: selectedPropertyId,
          // months: finalMonths, // Uncomment if using months
          user_id: user.id, // IMPORTANT: Always set user_id explicitly on update
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
    } else {
      // --- Create New Expense ---
      console.log('Creating new expense');
      result = await supabase
        .from('expenses')
        .insert({
          ...expenseData,
          category_id: finalCategoryId,
          date: dateString,
          property_id: selectedPropertyId,
          // months: finalMonths, // Uncomment if using months
          user_id: user.id, // IMPORTANT: Always set user_id explicitly on insert
        })
        .select()
        .single();
    }

    const { error } = result;

    if (error) {
      console.error("Supabase DB Error:", error);
      // Check for specific errors like duplicate key, foreign key violation etc. if needed
      return { message: `Database Error: ${error.message}` };
    }

    console.log('Expense operation successful:', result.data);

  } catch (error) {
    console.error("Catch Error:", error);
    return { message: 'An unexpected error occurred while saving the expense.' };
  }

  // 4. Revalidate Cache and Return Success
  revalidatePath('/expenses'); // Revalidate the expenses list page
  revalidatePath('/revenue'); // Revalidate the revenue page as it depends on expenses

  return { message: id ? 'Expense updated successfully.' : 'Expense created successfully.' };
}


// --- Server Action: Delete Expense ---
export async function deleteExpense(id: string): Promise<{ message: string; error?: null } | { message?: null; error: string }> {
    'use server'; // Directive needed here too if called directly

    if (!id) return { error: 'Expense ID is required.'};

    const cookieStore = cookies();
    const supabase = createActionClient();

    // 1. Authenticate User
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'Authentication required.' };
    }

    // 2. (Optional but Recommended) Authorize: Check if user owns this expense
    // This relies on RLS primarily, but an explicit check adds layer.
    /*
    const { data: expense, error: fetchError } = await supabase
        .from('expenses')
        .select('user_id')
        .eq('id', id)
        .single();

    if (fetchError || !expense) {
        return { error: 'Expense not found or error fetching data.' };
    }

    if (expense.user_id !== user.id) {
         return { error: 'Unauthorized to delete this expense.' };
    }
    */

    // 3. Delete Expense
    try {
        const { error } = await supabase.from('expenses').delete().eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            return { error: `Database Error: Failed to delete expense. ${error.message}` };
        }
    } catch (e) {
        console.error("Catch Error during delete:", e);
        return { error: 'An unexpected error occurred during deletion.' };
    }


    // 4. Revalidate Cache
    revalidatePath('/expenses');
    revalidatePath('/revenue');

    return { message: 'Expense deleted successfully.' };
}

// --- Helper Action: Get Expense Categories (Optional, could also be done in page component) ---
// Useful for populating select dropdowns in the ExpenseForm
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
    'use server';
    const cookieStore = cookies();
    // Can use server client here as it's just reading public/user data
    const supabase = createActionClient(); // Or createClient from server

     const { data: { user } } = await supabase.auth.getUser();
     if (!user) {
       // Decide: throw error or return empty array? Returning empty might be safer for UI.
       console.error('getExpenseCategories: Authentication required.');
       return [];
     }

    // Assuming categories are global or you might add user_id if they are user-specific
    const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching expense categories:', error);
        return []; // Return empty array on error to prevent breaking forms
    }

    return data as ExpenseCategory[] || [];
}
