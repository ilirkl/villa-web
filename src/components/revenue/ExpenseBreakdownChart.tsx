// Example: components/revenue/ExpenseBreakdownChart.tsx
'use client';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ExpenseBreakdownChartProps {
    data: { name: string; value: number }[];
}

// Define colors for pie chart segments
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919'];

const ExpenseBreakdownChart: React.FC<ExpenseBreakdownChartProps> = ({ data }) => {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} // Optional labels on slices
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
};
export default ExpenseBreakdownChart;