// src/components/revenue/report/MonthlyExpenseBreakdownCard.tsx
// This is very similar to the main ExpenseBreakdownCard, could be made reusable
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from '@/lib/utils';

interface ExpenseBreakdownItem {
    name: string;
    value: number;
    percentage: number;
}

interface MonthlyExpenseBreakdownCardProps {
    title: string;
    data: ExpenseBreakdownItem[];
}

export default function MonthlyExpenseBreakdownCard({ title, data }: MonthlyExpenseBreakdownCardProps) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No expense data for this month.</p>
                ) : (
                    <div className="space-y-4">
                        {data.map((item) => (
                            <div key={item.name}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium">{item.name}</span>
                                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Match progress bar color from screenshot */}
                                    <Progress value={item.percentage} className="flex-1 h-2 [&>div]:bg-red-500" />
                                    <span className="text-xs font-medium text-muted-foreground w-12 text-right"> {/* Wider width for % */}
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