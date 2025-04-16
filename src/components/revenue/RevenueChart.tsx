// Example: components/revenue/RevenueChart.tsx
'use client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueChartProps {
    data: { name: string; revenue: number }[];
}

const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" />
            </BarChart>
        </ResponsiveContainer>
    );
};
export default RevenueChart;