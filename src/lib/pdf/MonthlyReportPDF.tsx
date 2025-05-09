import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { sq } from 'date-fns/locale';
// Assuming translateExpenseCategory is still needed for 'sq' if not in dictionary
// import { translateExpenseCategory } from '@/lib/translations';

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 25, // Reduced padding slightly for more content space
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF', // Explicit white background for the page
  },
  // --- HEADER ---
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  reportHeaderText: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a202c', // Darker, more modern title color
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: '#718096', // Softer subtitle color
  },
  logo: {
    width: 80, // Adjust as needed
    height: 40, // Adjust as needed
    // If you have a logo, you can add it here:
    // E.g., border: 1, borderColor: '#DDDDDD', padding: 5, textAlign: 'center'
  },
  logoPlaceholderText: {
    fontSize: 10,
    color: '#A0AEC0',
    textAlign: 'center',
  },

  // --- SECTION STYLING ---
  sectionContainer: {
    marginBottom: 20,
    backgroundColor: '#F7FAFC', // Light background for sections
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748', // Section title color
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  // --- TWO COLUMN LAYOUT FOR SUMMARY & METRICS ---
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15, // Space between columns
    marginBottom: 20,
  },
  column: {
    flex: 1, // Each column takes up equal space
  },

  // --- DATA ROW STYLING (for summary/metrics) ---
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  dataRowLast: { // No bottom border for the last item in a list
    borderBottomWidth: 0,
  },
  dataLabel: {
    fontSize: 11,
    color: '#4A5568', // Label color
  },
  dataValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#2D3748', // Value color
  },
  dataValueCurrency: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#2D3748',
  },
  highlightedDataValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14, // Slightly larger for emphasis
    color: '#FF5A5F', // A warm, less aggressive accent (could be Airbnb red too: '#FF5A5F')
  },

  // --- EXPENSE BREAKDOWN STYLING ---
  expenseItemContainer: {
    marginBottom: 12,
  },
  expenseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  expenseItemName: {
    fontSize: 11,
    color: '#4A5568',
    flex: 1, // Allow name to take available space
    marginRight: 5,
  },
  expenseItemAmount: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2D3748',
  },
  expenseItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1, // Take remaining width
    height: 8,
    backgroundColor: '#E2E8F0', // Lighter background for progress bar
    borderRadius: 4,
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF5A5F', // A calmer blue, or use an accent: '#DD6B20' or '#FF5A5F'
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 10,
    color: '#718096',
    minWidth: 35, // Ensure space for "100.0%"
    textAlign: 'right',
  },

  // --- FOOTER ---
  footer: {
    position: 'absolute',
    bottom: 20, // Slightly higher
    left: 25,
    right: 25,
    textAlign: 'center',
    fontSize: 9,
    color: '#A0AEC0', // Softer footer text
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
      name: string; // This should be the key for translation
      value: number;
      percentage: number;
    }>;
  };
  lang?: 'en' | 'sq';
  dictionary?: any; // Your dictionary structure
  logoUrl?: string; // Optional URL for the logo
  profileImageUrl?: string; // Optional URL for the profile image
}

// Helper function to format currency with space
const formatCurrencyValue = (amount: number) => {
  return `€ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const MonthlyReportPDF = ({
  month,
  year,
  data,
  lang = 'en',
  dictionary = {},
  logoUrl,
  profileImageUrl
}: MonthlyReportPDFProps) => {
  const t = (key: string, section?: string, defaultValue?: string) => {
    if (section && dictionary[section] && dictionary[section][key]) {
      return dictionary[section][key];
    }
    if (dictionary.monthly_report && dictionary.monthly_report[key]) {
      return dictionary.monthly_report[key];
    }
    return defaultValue || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const translateExpenseName = (expenseKey: string) => {
    if (dictionary.expense_categories && dictionary.expense_categories[expenseKey]) {
      return dictionary.expense_categories[expenseKey];
    }
    // Fallback if using translateExpenseCategory function was intended for 'sq'
    // if (lang === 'sq') {
    //   return translateExpenseCategory(expenseKey, 'sq');
    // }
    return expenseKey; // Return the key if no translation is found
  };
  
  const translatedExpenseBreakdown = data.expenseBreakdown.map(expense => ({
    ...expense,
    name: translateExpenseName(expense.name)
  }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* --- HEADER --- */}
        <View style={styles.reportHeader}>
          <View style={styles.reportHeaderText}>
            <Text style={styles.mainTitle}>{t('title', 'monthly_report', 'Monthly Financial Report')}</Text>
            <Text style={styles.subTitle}>{`${month} ${year}`}</Text>
          </View>
          {logoUrl ? (
            <Image style={styles.logo} src={logoUrl} />
          ) : profileImageUrl ? (
            <Image style={styles.logo} src={profileImageUrl} />
          ) : (
            <View style={styles.logo}>
              <Text style={styles.logoPlaceholderText}>{t('company_name', 'monthly_report', 'Your Company')}</Text>
            </View>
          )}
        </View>

        {/* --- TWO COLUMN LAYOUT FOR SUMMARY & METRICS --- */}
        <View style={styles.twoColumnContainer}>
          {/* --- FINANCIAL SUMMARY --- */}
          <View style={[styles.column, styles.sectionContainer]}>
            <Text style={styles.sectionTitle}>{t('financial_summary', 'monthly_report', 'Financial Summary')}</Text>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t('gross_profit', 'monthly_report', 'Gross Profit')}</Text>
              <Text style={styles.dataValueCurrency}>
                {formatCurrencyValue(data.grossProfit)}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t('total_expenses', 'monthly_report', 'Total Expenses')}</Text>
              <Text style={styles.dataValueCurrency}>
                {formatCurrencyValue(data.totalExpenses)}
              </Text>
            </View>
            <View style={[styles.dataRow, styles.dataRowLast]}>
              <Text style={styles.dataLabel}>{t('net_profit', 'monthly_report', 'Net Profit')}</Text>
              <Text style={styles.highlightedDataValue}>
                {formatCurrencyValue(data.netProfit)}
              </Text>
            </View>
          </View>

          {/* --- PERFORMANCE METRICS --- */}
          <View style={[styles.column, styles.sectionContainer]}>
            <Text style={styles.sectionTitle}>{t('performance_metrics', 'monthly_report', 'Performance Metrics')}</Text>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t('occupancy_rate', 'monthly_report', 'Occupancy Rate')}</Text>
              <Text style={styles.highlightedDataValue}>
                {data.occupancyRate.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>{t('total_nights_reserved', 'monthly_report', 'Total Nights Reserved')}</Text>
              <Text style={styles.dataValue}>
                {data.totalNightsReserved.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.dataRow, styles.dataRowLast]}>
              <Text style={styles.dataLabel}>{t('average_stay', 'monthly_report', 'Average Stay')}</Text>
              <Text style={styles.dataValue}>
                {data.averageStay.toFixed(1)} {t('nights', 'monthly_report', 'nights')}
              </Text>
            </View>
          </View>
        </View>

        {/* --- EXPENSE BREAKDOWN --- */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('expense_breakdown', 'monthly_report', 'Expense Breakdown')}</Text>
          {translatedExpenseBreakdown.map((expense, index) => (
            <View key={index} style={styles.expenseItemContainer}>
              <View style={styles.expenseItemHeader}>
                <Text style={styles.expenseItemName}>{expense.name}</Text>
                <Text style={styles.expenseItemAmount}>
                  {formatCurrencyValue(expense.value)}
                </Text>
              </View>
              <View style={styles.expenseItemDetails}>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(expense.percentage, 100)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.percentageText}>
                  {expense.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
          {translatedExpenseBreakdown.length === 0 && (
            <Text style={styles.dataLabel}>{t('no_expenses_recorded', 'monthly_report', 'No expenses recorded for this period.')}</Text>
          )}
        </View>

        {/* --- FOOTER --- */}
        <Text style={styles.footer}>
          {t('generated_on', 'monthly_report', 'Report generated on')}{' '}
          {format(new Date(), 'PPP p', { locale: lang === 'sq' ? sq : undefined })}
        </Text>
      </Page>
    </Document>
  );
};


