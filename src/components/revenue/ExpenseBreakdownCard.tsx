// src/components/revenue/ExpenseBreakdownCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from '@/lib/utils'; // *** IMPORT THE UTILITY ***

interface ExpenseBreakdownItem {
    name: string;
    value: number;
    percentage: number;
}
interface ExpenseBreakdownCardProps {
    title: string;
    data: ExpenseBreakdownItem[];
    // formatCurrency prop removed
}

export default function ExpenseBreakdownCard({
    title,
    data,
}: ExpenseBreakdownCardProps) {
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No expense data.</p>
                ) : (
                    <div className="space-y-4">
                        {data.map((item) => (
                            <div key={item.name}>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="font-medium">{item.name}</span>
                                    {/* *** USE IMPORTED FUNCTION *** */}
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