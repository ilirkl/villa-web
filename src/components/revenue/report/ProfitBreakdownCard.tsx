'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface ProfitBreakdownCardProps {
    netProfit: number;
    grossProfit: number;
    totalExpenses: number;
}

export default function ProfitBreakdownCard({
    netProfit,
    grossProfit,
    totalExpenses,
}: ProfitBreakdownCardProps) {
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
                    <div className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{dictionary.profit_breakdown || 'Profit Breakdown'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-1">{dictionary.net_profit || 'Net Profit'}</span>
                        <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {formatCurrency(netProfit)}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-1">{dictionary.gross_profit || 'Gross Profit'}</span>
                        <span className="text-xl font-bold">{formatCurrency(grossProfit)}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground mb-1">{dictionary.expenses || 'Expenses'}</span>
                        <span className="text-xl font-bold text-red-500">-{formatCurrency(totalExpenses)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
