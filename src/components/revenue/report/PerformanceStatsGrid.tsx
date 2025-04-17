// src/components/revenue/report/PerformanceStatsGrid.tsx
import { Card, CardContent } from "@/components/ui/card";
import { BedDouble, Percent, Hotel } from "lucide-react"; // Import relevant icons

interface PerformanceStatsGridProps {
    nightsReserved: number;
    occupancyRate: number;
    averageStay: number;
}

export default function PerformanceStatsGrid({ nightsReserved, occupancyRate, averageStay }: PerformanceStatsGridProps) {
    return (
        <div className="grid grid-cols-3 gap-4">
            {/* Nights Reserved */}
            <Card className="text-center p-3">
                <CardContent className="p-0 flex flex-col items-center justify-center">
                    <BedDouble className="h-6 w-6 mb-2 text-muted-foreground" />
                    <p className="text-xl font-bold">{nightsReserved.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-wrap">Netë të rezervuara</p> {/* Reserved Nights */}
                </CardContent>
            </Card>

            {/* Occupancy Rate */}
            <Card className="text-center p-3">
                <CardContent className="p-0 flex flex-col items-center justify-center">
                    <Percent className="h-6 w-6 mb-2 text-muted-foreground" />
                    <p className="text-xl font-bold">{occupancyRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1 text-wrap">Shkalla e zënies</p> {/* Occupancy Rate */}
                </CardContent>
            </Card>

            {/* Average Stay */}
            <Card className="text-center p-3">
                <CardContent className="p-0 flex flex-col items-center justify-center">
                    <Hotel className="h-6 w-6 mb-2 text-muted-foreground" /> {/* Using Hotel icon */}
                    <p className="text-xl font-bold">{averageStay.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground mt-1 text-wrap">Qëndrimi mesatar (netë)</p> {/* Average Stay (nights) */}
                </CardContent>
            </Card>
        </div>
    );
}