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
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExpenseFormData, ExpenseCategory } from '@/lib/definitions';
import { createOrUpdateExpense, ExpenseState } from '@/lib/actions/expenses';
import { useFormState, useFormStatus } from 'react-dom';
import React, { useEffect } from 'react';
import { toast } from "sonner"; // Import sonner toast
import { useRouter } from 'next/navigation';

// Zod schema (remains the same)
const FormSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid("Invalid category").nullable().optional(),
  amount: z.coerce
    .number({ invalid_type_error: 'Please enter a valid amount.' })
    .min(0.01, { message: 'Amount must be positive.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  description: z.string().nullable().optional(),
});

type FormSchemaType = z.infer<typeof FormSchema>;

interface ExpenseFormProps {
  initialData?: ExpenseFormData | null;
  categories: ExpenseCategory[];
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Expense' : 'Save Expense')}
        </Button>
    );
}

export function ExpenseForm({ initialData, categories = [] }: ExpenseFormProps) {
  const isEditing = !!initialData?.id;
  const router = useRouter();

  // Find the "Furnizim" category ID
  const furnizimCategory = categories.find(cat => cat.name === "Furnizim");
  
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      id: initialData?.id ?? undefined,
      amount: initialData?.amount ?? undefined,
      date: initialData?.date ?? undefined,
      // Use initialData category if editing, otherwise use Furnizim category as default
      category_id: initialData?.category_id ?? furnizimCategory?.id ?? undefined,
      description: initialData?.description ?? '',
    },
  });

  const initialState: ExpenseState = { message: null, errors: {} };
  const [state, dispatch] = useFormState(createOrUpdateExpense, initialState);

   // Feedback effect using sonner
   useEffect(() => {
     if (state?.message) {
        if (state.errors && Object.keys(state.errors).length > 0) {
            // Error Toast
             toast.error("Action Failed", {
                 description: state.message,
             });
        } else if (!state.errors) {
             // Success Toast
             toast.success(isEditing ? "Expense Updated" : "Expense Saved", {
                 description: state.message,
             });
              // Debounce or delay redirect slightly to allow user to see toast
              setTimeout(() => router.push('/expenses'), 500);
        }
     }
     // Remove toast from dependency array
 }, [state, isEditing, router]);

  // onSubmit remains the same
  const onSubmit = (formData: FormSchemaType) => {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
          if (key === 'id' && value) data.append(key, String(value));
          if (key === 'amount' && value !== undefined) data.append(key, String(value));
          if (key === 'date' && value instanceof Date) data.append(key, value.toISOString());
          if (key === 'category_id') {
              if(value) data.append(key, String(value));
              else data.append(key, '');
          }
          if (key === 'description' && value) data.append(key, String(value));
      });
      dispatch(data);
  };

  // Form rendering remains the same
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {isEditing && <input type="hidden" {...form.register('id')} />}

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (€)</FormLabel>
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
              <FormItem className="flex-1">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
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
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                  defaultValue={field.value ?? furnizimCategory?.id ?? 'none'}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g., Cleaning supplies, Electricity bill March"
                  className="resize-y min-h-[80px]"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error messages */}
        {state?.errors?.database && (
          <p className="text-sm font-medium text-destructive">{state.errors.database.join(', ')}</p>
        )}

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <SubmitButton isEditing={isEditing} />
        </div>
      </form>
    </Form>
  );
}
