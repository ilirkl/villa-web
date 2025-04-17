// src/components/revenue/report/ProfitBreakdownCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ProfitBreakdownCardProps {
    netProfit: number;
    grossProfit: number;
    totalExpenses: number;
}

export default function ProfitBreakdownCard({ netProfit, grossProfit, totalExpenses }: ProfitBreakdownCardProps) {
    return (
        <Card>
            <CardHeader className="pb-2 text-center"> {/* Center title */}
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    Fitimi Neto {/* Net Profit */}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-4">
                <p className="text-3xl font-bold mb-4 text-[#ff5a5f]"> {/* Added Airbnb red color */}
                    {formatCurrency(netProfit)}
                </p>
                <h3 className="text-lg font-semibold mb-2 border-t pt-4">Ndarja e Fitimeve</h3> {/* Profit Breakdown */}
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span>Fitimet Bruto</span>{/* Gross Profit */}
                        <span>{formatCurrency(grossProfit)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Shpenzimet</span>{/* Expenses */}
                        {/* Display expenses as negative */}
                        <span className={totalExpenses > 0 ? "text-red-600" : ""}>
                            {formatCurrency(-totalExpenses)}
                         </span>
                    </div>
                    <div className="flex justify-between border-t mt-2 pt-2 font-semibold">
                        <span>Totali (Neto)</span>{/* Total (Net) */}
                        <span className="text-[#ff5a5f]">{formatCurrency(netProfit)}</span> {/* Added Airbnb red color */}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
