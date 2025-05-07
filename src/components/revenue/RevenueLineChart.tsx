// src/components/revenue/RevenueLineChart.tsx
'use client';

import { Suspense } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getDictionary } from "@/lib/dictionary";

interface RevenueChartItem {
    name: string;
    [key: string]: string | number; // Allow any string keys for translated labels
}

interface RevenueLineChartProps {
    data: RevenueChartItem[];
}

export default function RevenueLineChart({ data }: RevenueLineChartProps) {
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

    // Tooltip formatter uses the imported utility
    const formatCurrencyForTooltip = (value: number | string | Array<number | string>) => {
        if (typeof value === 'number') {
            return formatCurrency(value);
        }
        return value;
    };

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                {dictionary.loading || 'Loading...'}
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                {dictionary.no_data_available || 'No data available.'}
            </div>
        );
    }

    // Get the keys from the first data item (excluding 'name')
    const dataKeys = Object.keys(data[0]).filter(key => key !== 'name');
    
    // Ensure all required data points exist
    const validData = data.every(item => {
        if (!item.name) return false;
        
        // Check that all data keys have numeric values
        return dataKeys.every(key => typeof item[key] === 'number');
    });

    if (!validData) {
        console.error('Invalid data structure:', data);
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                {dictionary.invalid_data_format || 'Error: Invalid data format.'}
            </div>
        );
    }

    // Find the booking/revenue key and net profit key
    const bookingsKey = dataKeys.find(key => 
        key.includes('Bookings') || 
        key.includes('Rezervime') || 
        key === dictionary.bookings_label
    ) || dataKeys[0];
    
    const netProfitKey = dataKeys.find(key => 
        key.includes('Net Profit') || 
        key.includes('Fitimi Neto') || 
        key === dictionary.net_profit_label
    ) || dataKeys[1];

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
                    dataKey={netProfitKey} 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorNeto)" 
                    strokeWidth={2} 
                    dot={{ r: 4, strokeWidth: 1, fill: '#ef4444' }} 
                    activeDot={{ r: 6, strokeWidth: 1, fill: '#fff', stroke: '#ef4444' }} 
                />
                <Area 
                    type="monotone" 
                    dataKey={bookingsKey} 
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
