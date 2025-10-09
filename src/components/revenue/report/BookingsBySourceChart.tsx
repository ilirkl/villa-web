'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDictionary } from '@/lib/dictionary';
import { formatCurrency } from '@/lib/utils';
import Image from 'next/image';

// Define the colors to match existing source colors in the app
const SOURCE_COLORS = {
  'DIRECT': '#10b981', // Green
  'AIRBNB': '#ff5a5f', // Red
  'BOOKING': '#003580', // Blue
};

export interface BookingSourceData {
  name: string;
  bookings: number;
  bookingsPercentage: number;
  revenue: number;
  revenuePercentage: number;
  color: string;
}

interface BookingsBySourceChartProps {
  data: BookingSourceData[];
  title?: string;
}

export default function BookingsBySourceChart({
  data,
  title,
}: BookingsBySourceChartProps) {
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
    return <Card><CardContent className="h-[300px] flex items-center justify-center">Loading...</CardContent></Card>;
  }

  // Handle empty data
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || dictionary.bookings_revenue_by_source || "Bookings & Revenue by Source"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
          {dictionary.no_data_available || "No data available"}
        </CardContent>
      </Card>
    );
  }

  // Prepare data for the two pie charts
  const bookingsData = data.map(item => ({
    name: item.name,
    value: item.bookings,
    percentage: item.bookingsPercentage,
    color: item.color,
    type: 'bookings'
  }));

  const revenueData = data.map(item => ({
    name: item.name,
    value: item.revenue,
    percentage: item.revenuePercentage,
    color: item.color,
    type: 'revenue'
  }));

  // Custom tooltip to show both metrics
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const sourceName = data.name;
      const sourceData = data.type === 'bookings' 
        ? { type: dictionary.bookings || 'Bookings', value: data.value, percentage: data.percentage }
        : { type: dictionary.revenue || 'Revenue', value: formatCurrency(data.value), percentage: data.percentage };
      
      return (
        <div className="bg-background border rounded p-2 shadow-sm text-sm">
          <p className="font-medium">{sourceName}</p>
          <p>{sourceData.type}: {sourceData.type === dictionary.bookings || sourceData.type === 'Bookings' 
            ? data.value 
            : formatCurrency(data.value)}</p>
          <p>{sourceData.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom legend component with icons - using unique sources from data
  const CustomLegend = () => {
    // Get unique sources from the data
    const uniqueSources = data.reduce((acc: any[], item) => {
      if (!acc.find(source => source.name === item.name)) {
        acc.push(item);
      }
      return acc;
    }, []);

    return (
      <div className="flex justify-center items-center gap-4 mt-4">
        {uniqueSources.map((item, index) => {
          let iconSrc = '';
          let altText = '';
          
          switch (item.name) {
            case 'AIRBNB':
              iconSrc = '/airbnb-icon.svg';
              altText = 'Airbnb';
              break;
            case 'BOOKING':
              iconSrc = '/booking-icon.svg';
              altText = 'Booking.com';
              break;
            case 'DIRECT':
              iconSrc = '/euro-icon.svg';
              altText = 'Cash';
              break;
            default:
              iconSrc = '';
              altText = item.name;
          }
          
          return (
            <div key={`legend-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {iconSrc ? (
                <Image
                  src={iconSrc}
                  alt={altText}
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
              ) : (
                <span className="text-xs">{item.name}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || dictionary.bookings_revenue_by_source || "Bookings & Revenue by Source"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              {/* Inner pie chart - Bookings */}
              <Pie
                data={bookingsData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
              >
                {bookingsData.map((entry, index) => (
                  <Cell key={`cell-bookings-${index}`} fill={entry.color} opacity={0.8} />
                ))}
              </Pie>
              
              {/* Outer pie chart - Revenue */}
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                labelLine={true}
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-revenue-${index}`} fill={entry.color} />
                ))}
              </Pie>
              
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={<CustomLegend />}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-center text-muted-foreground">
          <span className="inline-block mr-4">{dictionary.inner_circle || "Inner circle"}: {dictionary.bookings || "Bookings"}</span>
          <span className="inline-block">{dictionary.outer_circle || "Outer circle"}: {dictionary.revenue || "Revenue"}</span>
        </div>
      </CardContent>
    </Card>
  );
}


