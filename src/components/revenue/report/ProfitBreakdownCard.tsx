'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import { TrendingUp, TrendingDown, Banknote } from "lucide-react";

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
                <CardHeader className="pb-0">
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-0">
                <CardTitle>{dictionary.profit_breakdown || 'Profit Breakdown'}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2 md:gap-2">
                    <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                        <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                            {dictionary.net_profit || 'Net Profit'}
                        </span>
                        <div className="flex items-center gap-1 justify-center">
                            {netProfit >= 0 ? 
                                <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-500" /> : 
                                <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                            }
                            <span className={`text-base md:text-xl font-bold ${netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {formatCurrency(netProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                        <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                            {dictionary.gross_profit || 'Gross Profit'}
                        </span>
                        <div className="flex items-center gap-1 justify-center">
                            <Banknote className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
                            <span className="text-base md:text-xl font-bold">{formatCurrency(grossProfit)}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2 md:p-3 border rounded-md">
                        <span className="text-xs md:text-sm text-muted-foreground mb-1 text-center line-clamp-2">
                            {dictionary.expenses || 'Expenses'}
                        </span>
                        <div className="flex items-center gap-1 justify-center">
                            <TrendingDown className="h-3 w-3 md:h-4 md:w-4 text-red-500" />
                            <span className="text-base md:text-xl font-bold text-red-500">
                                -{formatCurrency(totalExpenses)}
                            </span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
