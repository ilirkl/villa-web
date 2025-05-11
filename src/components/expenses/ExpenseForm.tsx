// components/expenses/ExpenseForm.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react'; // Import Loader2
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExpenseFormData, ExpenseCategory } from '@/lib/definitions';
import { createOrUpdateExpense, ExpenseState } from '@/lib/actions/expenses';
import { useFormState, useFormStatus } from 'react-dom';
import React, { useEffect, useTransition, useState } from 'react';
import { toast } from "sonner"; // Import sonner toast
import { useParams, useRouter } from 'next/navigation';
import { translateExpenseCategory } from '@/lib/translations';
import { createClient } from '@/lib/supabase/client';

// Define the form schema
const FormSchema = z.object({
  id: z.string().optional(),
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0" }),
  date: z.date({
    required_error: "Date is required",
    invalid_type_error: "Date is required",
  }),
  category_id: z.string().optional(),
  description: z.string().optional(),
});

type FormSchemaType = z.infer<typeof FormSchema>;

interface ExpenseFormProps {
  initialData?: ExpenseFormData | null;
  categories: ExpenseCategory[];
  dictionary: any;
  onSuccess?: () => void; // Add this prop
}

function SubmitButton({ isEditing, dictionary }: { isEditing: boolean, dictionary: any }) {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            disabled={pending} 
            aria-disabled={pending}
            style={{ backgroundColor: '#FF5A5F', color: 'white' }}
            className="hover:bg-[#FF5A5F]/90"
        >
        {pending ? (isEditing ? dictionary.updating || 'Updating...' : dictionary.saving || 'Saving...') : 
                  (isEditing ? dictionary.update_expense || 'Update Expense' : dictionary.save_expense || 'Save Expense')}
        </Button>
    );
}

export function ExpenseForm({ initialData, categories = [], dictionary = {}, onSuccess }: ExpenseFormProps) {
  const isEditing = !!initialData?.id;
  const router = useRouter();
  const { lang } = useParams();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  // Fetch CSRF token on component mount
  useEffect(() => {
    // Get CSRF token from cookie (client-side)
    const getCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf');
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
        toast.error(dictionary.error_security || "Security error");
      }
    };
    
    getCsrfToken();
  }, [dictionary]);
  
  // Find the "Furnizim" category if it exists
  const furnizimCategory = categories.find(cat => cat.name === "Furnizim");
  
  // Ensure initialData.date is a proper Date object
  const initialDate = initialData?.date 
    ? (typeof initialData.date === 'object' && initialData.date !== null
        ? initialData.date 
        : new Date(initialData.date))
    : new Date();
  
  // Get translated categories for display
  const translatedCategories = categories.map(category => ({
    ...category,
    translatedName: translateExpenseCategory(category.name, dictionary, lang as string)
  }));
  
  console.log("Initial date:", initialDate);
  
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id: initialData?.id ?? undefined,
      amount: initialData?.amount ?? undefined,
      date: initialDate,
      category_id: initialData?.category_id ?? furnizimCategory?.id ?? undefined,
      description: initialData?.description ?? '',
    },
  });

  // Log the form's default values for debugging
  console.log("Form default values:", form.getValues());
  
  // Create a server action
  const [isPending, startTransition] = useTransition();
  
  // Handle form submission
  const onSubmit = (formData: FormSchemaType) => {
    console.log("Form data before submission:", formData); // Debug log
    
    const data = new FormData();
    
    // Add id if it exists
    if (formData.id) {
      data.append('id', formData.id);
    }
    
    // Add amount
    if (formData.amount !== undefined) {
      data.append('amount', String(formData.amount));
    }
    
    // Add date - this is critical
    if (formData.date instanceof Date) {
      const date = new Date(formData.date);
      console.log('Date from form:', date);
      // Format as YYYY-MM-DD for the server
      const formattedDate = date.toISOString().split('T')[0];
      console.log('Formatted date:', formattedDate);
      data.append('date', formattedDate);
    } else {
      console.error('Date is missing or not a Date object:', formData.date);
      // Use current date as fallback
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      console.log('Using today as fallback date:', formattedDate);
      data.append('date', formattedDate);
    }
    
    // Add category_id
    if (formData.category_id) {
      data.append('category_id', formData.category_id);
    } else {
      data.append('category_id', '');
    }
    
    // Add description
    if (formData.description !== undefined) {
      data.append('description', formData.description);
    }
    
    // Add CSRF token
    data.append('csrf_token', csrfToken);
    
    // Log the entire FormData for debugging
    console.log('Form data entries:');
    for (const pair of data.entries()) {
      console.log(pair[0], pair[1]);
    }
    
    startTransition(async () => {
      try {
        const result = await createOrUpdateExpense(undefined, data);
        
        if (result.errors) {
          // Set form errors
          Object.entries(result.errors).forEach(([key, value]) => {
            form.setError(key as any, {
              type: "server",
              message: value[0],
            });
          });
          toast.error(result.message || dictionary.error_saving || "Error saving expense");
          return;
        }
        
        // Success
        toast.success(
          isEditing
            ? dictionary.expense_updated || "Expense updated"
            : dictionary.expense_created || "Expense created"
        );
        
        // Reset form
        form.reset();
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        } else {
          // Navigate back if no callback
          router.back();
        }
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isEditing && <input type="hidden" {...form.register('id')} />}
        <input type="hidden" name="csrf_token" value={csrfToken} />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.amount || "Amount"} (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date and Category in same line */}
        <div className="flex gap-4">
          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{dictionary.date || "Date"}</FormLabel>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{dictionary.select_date || "Select a date"}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        console.log("Calendar date selected:", date); // Debug log
                        field.onChange(date);
                        setDatePickerOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Category Select */}
          <FormField
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{dictionary.category || "Category"}</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  defaultValue={field.value ?? furnizimCategory?.id ?? 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={dictionary.select_category || "Select a category"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {translatedCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.translatedName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{dictionary.description || "Description"}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={dictionary.expense_description_placeholder || "e.g., Cleaning supplies, Electricity bill March"}
                  className="resize-y min-h-[80px]"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              // If onSuccess is provided (modal mode), use it to close the modal
              // Otherwise fall back to router.back() (page mode)
              if (onSuccess) {
                onSuccess();
              } else {
                router.back();
              }
            }}
          >
            {dictionary.cancel || "Cancel"}
          </Button>
          <Button 
            type="submit" 
            disabled={isPending}
            style={{ backgroundColor: '#FF5A5F', color: 'white' }}
            className="hover:bg-[#FF5A5F]/90"
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditing ? (
              dictionary.update || "Update"
            ) : (
              dictionary.create || "Create"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
