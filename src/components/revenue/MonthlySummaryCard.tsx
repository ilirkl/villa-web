'use client';

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";
import { ArrowUpCircle, Wallet, CreditCard, ReceiptText } from "lucide-react";

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
                setIsLoaded(true);
            }
        }
        loadDictionary();
    }, [lang]);

    if (!isLoaded) {
        return (
            <Card className="w-full animate-pulse">
                <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="h-16 bg-muted rounded"></div>
                        <div className="h-16 bg-muted rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full p-1">
            <CardContent className="p-2">
                <div className="grid grid-cols-2 gap-3">
                    {/* Net Profit */}
                    <div className="flex items-center p-3 rounded-md border bg-background hover:bg-accent/10 transition-colors">
                        <Wallet className="h-8 w-8 text-primary mr-3" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                {dictionary.monthly_net_profit || 'Net Profit'}
                            </p>
                            <p className="text-lg font-bold">
                                {formatCurrency(currentMonthProfit)}
                            </p>
                        </div>
                    </div>

                    {/* Pending Gross */}
                    <div className="flex items-center p-3 rounded-md border bg-background hover:bg-accent/10 transition-colors">
                        <ArrowUpCircle className="h-8 w-8 text-green-500 mr-3" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                {dictionary.pending_gross || 'Pending'}
                            </p>
                            <p className="text-lg font-bold text-green-500">
                                {formatCurrency(pendingGross)}
                            </p>
                        </div>
                    </div>

                    {/* Gross Income */}
                    <div className="flex items-center p-3 rounded-md border bg-background hover:bg-accent/10 transition-colors">
                        <CreditCard className="h-8 w-8 text-blue-500 mr-3" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                {dictionary.gross || 'Gross'}
                            </p>
                            <p className="text-lg font-bold text-blue-500">
                                {formatCurrency(currentMonthGross)}
                            </p>
                        </div>
                    </div>

                    {/* Expenses */}
                    <div className="flex items-center p-3 rounded-md border bg-background hover:bg-accent/10 transition-colors">
                        <ReceiptText className="h-8 w-8 text-red-500 mr-3" />
                        <div>
                            <p className="text-xs font-medium text-muted-foreground">
                                {dictionary.expenses || 'Expenses'}
                            </p>
                            <p className="text-lg font-bold text-red-500">
                                {formatCurrency(currentMonthExpenses)}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
