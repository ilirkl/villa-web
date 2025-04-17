import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
    padding: 5,
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: {
    fontSize: 12,
    color: '#666666',
  },
  value: {
    fontFamily: 'Helvetica',
    fontSize: 12,
  },
  currencyValue: {
    fontFamily: 'Helvetica',
    fontSize: 12,
  },
  highlightedValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#ff5a5f', // Airbnb-style red
  },
  valueGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  percentage: {
    fontSize: 12,
    color: '#666666',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
  },
  chart: {
    marginVertical: 10,
    height: 150,
  },
  // Add new styles for expense breakdown
  expenseRow: {
    marginBottom: 10, // Space between expense items
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  expenseName: {
    fontSize: 11,
    color: '#333333',
  },
  expenseAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ff5a5f',
    borderRadius: 3,
  },
  percentageText: {
    fontSize: 10,
    color: '#666666',
    marginLeft: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

interface MonthlyReportPDFProps {
  month: string;
  year: string;
  data: {
    grossProfit: number;
    totalExpenses: number;
    netProfit: number;
    occupancyRate: number;
    totalNightsReserved: number;
    averageStay: number;
    expenseBreakdown: Array<{
      name: string;
      value: number;
      percentage: number;
    }>;
  };
}

// Helper function to format currency with space
const formatCurrencyValue = (amount: number) => {
  return `€ ${amount.toLocaleString()}`; // Note the space after €
};

export const MonthlyReportPDF = ({ month, year, data }: MonthlyReportPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Monthly Financial Report</Text>
        <Text style={styles.subtitle}>{`${month} ${year}`}</Text>
      </View>

      {/* Financial Summary Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Gross Profit</Text>
          <Text style={styles.currencyValue}>
            {formatCurrencyValue(data.grossProfit)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Expenses</Text>
          <Text style={styles.currencyValue}>
            {formatCurrencyValue(data.totalExpenses)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Net Profit</Text>
          <Text style={styles.highlightedValue}>
            {formatCurrencyValue(data.netProfit)}
          </Text>
        </View>
      </View>

      {/* Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Occupancy Rate</Text>
          <Text style={styles.highlightedValue}>
            {data.occupancyRate.toFixed(1)}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Nights Reserved</Text>
          <Text style={styles.value}>
            {data.totalNightsReserved.toFixed(0)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Average Stay Duration</Text>
          <Text style={styles.value}>
            {data.averageStay.toFixed(1)} nights
          </Text>
        </View>
      </View>

      {/* Updated Expense Breakdown Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Expense Breakdown</Text>
        {data.expenseBreakdown.map((expense, index) => (
          <View key={index} style={styles.expenseRow}>
            {/* Expense Header with Name and Amount */}
            <View style={styles.expenseHeader}>
              <Text style={styles.expenseName}>{expense.name}</Text>
              <Text style={styles.expenseAmount}>
                {formatCurrencyValue(expense.value)}
              </Text>
            </View>
            
            {/* Progress Bar Row */}
            <View style={styles.progressRow}>
              {/* Progress Bar */}
              <View style={[styles.progressBarContainer, { flex: 1 }]}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${Math.min(expense.percentage, 100)}%` }
                  ]} 
                />
              </View>
              {/* Percentage Text */}
              <Text style={styles.percentageText}>
                {expense.percentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Generated on {format(new Date(), 'PPP', { locale: sq })}
      </Text>
    </Page>
  </Document>
);

