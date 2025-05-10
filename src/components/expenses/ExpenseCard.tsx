// components/expenses/ExpenseCard.tsx
'use client'

import Link from 'next/link';
import { Expense, ExpenseCategory } from '@/lib/definitions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Pencil, Trash2, Tag } from 'lucide-react';
import { deleteExpense } from '@/lib/actions/expenses';
import { toast } from "sonner"; // Import sonner toast
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
import { Badge } from "@/components/ui/badge";
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { translateExpenseCategory } from '@/lib/translations';

type ExpenseWithCategory = Expense & {
    expense_categories: Pick<ExpenseCategory, 'name'> | null;
};

interface ExpenseCardProps {
  expense: ExpenseWithCategory;
  onDelete?: () => void;
  onEdit?: () => void; // Add this prop
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
};

export function ExpenseCard({ expense, onDelete, onEdit }: ExpenseCardProps) {
  const { lang } = useParams();
  const [dictionary, setDictionary] = useState<any>({});

  useEffect(() => {
    async function loadDictionary() {
      try {
        const dict = await getDictionary(lang as 'en' | 'sq');
        setDictionary(dict);
      } catch (error) {
        console.error('Failed to load dictionary:', error);
      }
    }
    loadDictionary();
  }, [lang]);

  // Add a function to determine badge styling based on category
  const getCategoryBadgeStyle = (categoryName: string | undefined) => {
    switch (categoryName?.toLowerCase()) {
      case 'furnizim':
        return 'bg-[#34d399]/10 text-[#34d399] border-[#34d399]/20'; // Green
      case 'mirembajtje':
        return 'bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20'; // Amber
      case 'pastrim':
        return 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/20'; // Blue
      case 'komunalite':
        return 'bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/20'; // Purple
      case 'taksa':
        return 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20'; // Red
      case 'komision':
        return 'bg-[#ec4899]/10 text-[#ec4899] border-[#ec4899]/20'; // Pink
      case 'tjera':
        return 'bg-[#6b7280]/10 text-[#6b7280] border-[#6b7280]/20'; // Gray
      default:
        return 'bg-[#6b7280]/10 text-[#6b7280] border-[#6b7280]/20'; // Default gray
    }
  };

  const handleDelete = async () => {
    const result = await deleteExpense(expense.id);
    if (result.error) {
      toast.error("Error Deleting Expense", {
        description: result.error,
      });
    } else {
      toast.success("Expense Deleted", {
        description: result.message,
      });
      // Call the refresh function after successful deletion
      onDelete?.();
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="mb-1 text-lg">
              {format(new Date(expense.date), 'dd MMM')}
            </CardTitle>
            {expense.description && (
              <CardDescription>
                {expense.description}
              </CardDescription>
            )}
          </div>
          <div className="text-right">
            <div className="text-[#ff5a5f] font-bold">
              {formatCurrency(expense.amount)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!expense.description && !expense.expense_categories?.name && (
          <p className="text-sm text-muted-foreground italic">No details provided.</p>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-2 pt-2">
        {expense.expense_categories?.name && (
          <Badge 
            variant="outline" 
            className={`flex items-center gap-1 text-xs ${getCategoryBadgeStyle(expense.expense_categories.name)}`}
          >
            <Tag className="h-3 w-3" />
            {translateExpenseCategory(expense.expense_categories.name, dictionary, lang as string)}
          </Badge>
        )}
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Trash2 className="h-6 w-6 text-[#ff5a5f]" /> 
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this expense record of {formatCurrency(expense.amount)} dated {format(new Date(expense.date), 'dd MMM')}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleDelete} 
                    style={{ backgroundColor: '#FF5A5F', color: 'white' }}
                    className='hover:bg-[#FF5A5F]/90'
                  >
                    Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <button onClick={onEdit} className="p-0 bg-transparent border-none">
            <Pencil className="h-6 w-6 transition-all duration-300 ease-in-out transform
                        text-[#ff5a5f] hover:scale-110
                        active:scale-95 active:rotate-12 cursor-pointer" />
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
