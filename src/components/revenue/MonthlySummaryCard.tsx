// src/components/revenue/MonthlySummaryCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // *** IMPORT THE UTILITY ***

interface MonthlySummaryCardProps {
    currentMonthProfit: number;
    pendingGross: number;      // Renamed conceptually to futureGross, but prop name kept for now
    currentMonthGross: number;
    currentMonthExpenses: number;
    // formatCurrency prop removed
}

export default function MonthlySummaryCard({
    currentMonthProfit,
    pendingGross,
    currentMonthGross,
    currentMonthExpenses,
}: MonthlySummaryCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Fitimi Neto
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
                <div className="text-3xl font-bold">
                    {/* *** USE IMPORTED FUNCTION *** */}
                    {formatCurrency(currentMonthProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                    këtë muaj
                </p>
                <div className="flex items-center text-sm text-muted-foreground pt-2">
                    {/* Title might need update depending on meaning of pendingGross */}
                    <span>Bruto në Pritje {formatCurrency(pendingGross)}</span>
                    {pendingGross > 0 && (
                         <TrendingUp className="ml-1 h-4 w-4 text-green-500" />
                    )}
                </div>
                 <p className="text-sm text-muted-foreground">
                    {/* *** USE IMPORTED FUNCTION *** */}
                    Bruto: {formatCurrency(currentMonthGross)} | Shpenzime: {formatCurrency(currentMonthExpenses)}
                 </p>
            </CardContent>
        </Card>
    );
}