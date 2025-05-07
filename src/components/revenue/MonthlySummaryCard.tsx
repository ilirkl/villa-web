'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface MonthlySummaryCardProps {
    currentMonthProfit: number;
    pendingGross: number;
    currentMonthGross: number;
    currentMonthExpenses: number;
}

export default function MonthlySummaryCard({
    currentMonthProfit,
    pendingGross,
    currentMonthGross,
    currentMonthExpenses,
}: MonthlySummaryCardProps) {
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
                setIsLoaded(true); // Set loaded even on error to avoid infinite loading
            }
        }
        loadDictionary();
    }, [lang]);

    if (!isLoaded) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        Loading...
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                    <div className="text-3xl font-bold">...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {dictionary.monthly_net_profit || 'Monthly Net Profit'}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-3xl font-bold">
                    {formatCurrency(currentMonthProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                    {dictionary.this_month || 'this month'}
                </p>
                <div className="flex items-center text-sm text-muted-foreground pt-2">
                    <span>{dictionary.pending_gross || 'Pending Gross'} {formatCurrency(pendingGross)}</span>
                    {pendingGross > 0 && (
                        <span className="ml-auto text-green-500">+{formatCurrency(pendingGross)}</span>
                    )}
                </div>
                <div className="text-xs text-muted-foreground">
                    {dictionary.gross || 'Gross'}: {formatCurrency(currentMonthGross)} | {dictionary.expenses || 'Expenses'}: {formatCurrency(currentMonthExpenses)}
                </div>
            </CardContent>
        </Card>
    );
}
