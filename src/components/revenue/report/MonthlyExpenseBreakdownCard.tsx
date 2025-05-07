'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface ExpenseBreakdownItem {
    name: string;
    value: number;
    percentage: number;
}

interface MonthlyExpenseBreakdownCardProps {
    title: string;
    data: ExpenseBreakdownItem[];
}

const getCategoryColor = (categoryName: string): string => {
  // Use a consistent color for all categories
  return '#FF5A5F'; // Airbnb-style red color for all categories
};

export default function MonthlyExpenseBreakdownCard({
    title,
    data,
}: MonthlyExpenseBreakdownCardProps) {
    const params = useParams();
    const lang = params?.lang as string || 'en';
    const [dictionary, setDictionary] = useState<any>({});
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        async function loadDictionary() {
            try {
                const dict = await getDictionary(lang as 'en' | 'sq');
                setDictionary(dict);
                setIsLoaded(true);
            } catch (error) {
                console.error('Failed to load dictionary:', error);
                setIsLoaded(true);
            }
        }
        loadDictionary();
    }, [lang]);

    if (!isLoaded) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{dictionary.expense_breakdown || 'Expense Breakdown'}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">{dictionary.no_expenses || 'No expenses recorded for this period.'}</p>
                ) : (
                    <div className="space-y-4">
                        {data.map((item, index) => (
                            <div key={index} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                                        <span className="text-xs text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
                                    </div>
                                </div>
                                <div className="h-2 w-full rounded-full bg-secondary">
                                    <div 
                                        className="h-full rounded-full" 
                                        style={{ 
                                            width: `${item.percentage}%`,
                                            backgroundColor: getCategoryColor(item.name)
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
