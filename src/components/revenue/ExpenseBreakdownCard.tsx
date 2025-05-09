// src/components/revenue/ExpenseBreakdownCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from '@/lib/utils';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface ExpenseBreakdownItem {
    name: string;
    value: number;
    percentage: number;
}
interface ExpenseBreakdownCardProps {
    title: string;
    data: ExpenseBreakdownItem[];
}

export default function ExpenseBreakdownCard({
    title,
    data,
}: ExpenseBreakdownCardProps) {
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
                <CardHeader className="pb-4">
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-0 pt-0">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {dictionary.no_expense_data || 'No expense data.'}
                    </p>
                ) : (
                    <div className="space-y-4">
                        {data.map((item) => (
                            <div key={item.name}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Progress value={item.percentage} className="flex-1 h-2 [&>div]:bg-red-500" />
                                    <span className="text-xs font-medium text-muted-foreground w-10 text-right">
                                        {item.percentage.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
