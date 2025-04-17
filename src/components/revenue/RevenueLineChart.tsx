// src/components/revenue/RevenueLineChart.tsx
'use client';

import { Suspense } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { formatCurrency } from '@/lib/utils'; // *** IMPORT THE UTILITY ***

interface RevenueChartItem {
    name: string;
    "Fitimi Neto": number;
    "Rezervime": number;
}
interface RevenueLineChartProps {
    data: RevenueChartItem[];
}

// Tooltip formatter uses the imported utility
const formatCurrencyForTooltip = (value: number | string | Array<number | string>) => {
    if (typeof value === 'number') {
        // *** USE IMPORTED FUNCTION ***
        return formatCurrency(value);
    }
    return value;
};

export default function RevenueLineChart({ data }: RevenueLineChartProps) {
    // Add console.log for debugging
    console.log('RevenueLineChart received data:', data);

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available.
            </div>
        );
    }

    // Ensure all required data points exist
    const validData = data.every(item => 
        item.name && 
        typeof item["Fitimi Neto"] === 'number' && 
        typeof item["Rezervime"] === 'number'
    );

    if (!validData) {
        console.error('Invalid data structure:', data);
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Error: Invalid data format.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={12} 
                    tickMargin={8} 
                    stroke="hsl(var(--muted-foreground))" 
                />
                <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    fontSize={12} 
                    tickFormatter={(value) => `€${value}`} 
                    width={50} 
                    stroke="hsl(var(--muted-foreground))" 
                />
                <Tooltip
                    cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '3 3' }}
                    contentStyle={{ 
                        fontSize: '12px', 
                        borderRadius: '0.5rem', 
                        border: '1px solid hsl(var(--border))', 
                        background: 'hsl(var(--background))', 
                        color: 'hsl(var(--foreground))' 
                    }}
                    formatter={formatCurrencyForTooltip}
                />
                <Legend 
                    verticalAlign="top" 
                    align="right" 
                    height={40} 
                    iconType="circle" 
                    iconSize={8} 
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} 
                />
                <Area 
                    type="monotone" 
                    dataKey="Fitimi Neto" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorNeto)" 
                    strokeWidth={2} 
                    dot={{ r: 4, strokeWidth: 1, fill: '#ef4444' }} 
                    activeDot={{ r: 6, strokeWidth: 1, fill: '#fff', stroke: '#ef4444' }} 
                />
                <Area 
                    type="monotone" 
                    dataKey="Rezervime" 
                    stroke="#3b82f6" 
                    fillOpacity={0} 
                    strokeWidth={2} 
                    dot={{ r: 4, strokeWidth: 1, fill: '#3b82f6' }} 
                    activeDot={{ r: 6, strokeWidth: 1, fill: '#fff', stroke: '#3b82f6' }} 
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
