import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Booking } from '@/lib/definitions';

// Use built-in Helvetica font to avoid loading issues in serverless environments
// For custom fonts, encode them as base64 and register as data URLs (see notes below)

// Define styles for the PDF using Helvetica
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#FFFFFF',
  },
  header: {
    marginBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyInfo: {
    maxWidth: '60%',
  },
  companyName: {
    fontSize: 22,
    marginBottom: 8,
    color: '#222222',
  },
  companyDetails: {
    fontSize: 10,
    color: '#555555',
    marginBottom: 3,
    lineHeight: 1.5,
  },
  invoiceInfo: {
    textAlign: 'right',
  },
  invoiceTitle: {
    fontSize: 28,
    color: '#222222',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  invoiceSubText: {
    fontSize: 10,
    color: '#767676',
    marginBottom: 3,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  rowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    color: '#555555',
    flex: 1,
  },
  value: {
    fontSize: 11,
    color: '#222222',
    textAlign: 'right',
    flex: 1,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#333333',
  },
  paymentValue: {
    fontSize: 12,
    color: '#222222',
  },
  totalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: '#CCCCCC',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#333333',
  },
  totalValue: {
    fontSize: 14,
    color: '#ff5a5f',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#888888',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    paddingTop: 15,
  },
});

// Helper function to format currency
const formatCurrencyValue = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null) return '€ -';
  return `€ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface InvoicePDFProps {
  booking: Booking;
  profile: {
    company_name: string | null;
    full_name: string | null;
    address: string | null;
    email: string | null;
    phone_number: string | null;
    website: string | null;
    vat_number: string | null;
    instagram?: string | null;
  };
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ booking, profile }) => {
  const nights = Math.ceil(
    (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) /
    (1000 * 60 * 60 * 24)
  );
  const validNightsForCalc = nights > 0 ? nights : 1;
  const pricePerNight = booking.total_amount / validNightsForCalc;
  const actualPrepayment = booking.prepayment || 0;
  const remainingAmount = booking.total_amount - actualPrepayment;

  const formattedStartDate = format(new Date(booking.start_date), 'dd MMMM yyyy');
  const formattedEndDate = format(new Date(booking.end_date), 'dd MMMM yyyy');
  const formattedInvoiceDate = format(new Date(), 'dd MMMM yyyy');

  // Format booking.id for display
  let displayInvoiceId: string;
  const rawBookingId = String(booking.id);

  if (/^\d{1,4}$/.test(rawBookingId)) {
    // If it's purely numeric and 1 to 4 digits long, pad with leading zeros
    displayInvoiceId = rawBookingId.padStart(4, '0');
  } else if (rawBookingId.length > 4) {
    // If it's longer than 4 characters (numeric or alphanumeric), take the last 4 characters
    displayInvoiceId = rawBookingId.slice(-4);
  } else {
    // Otherwise (e.g., alphanumeric and 4 chars or less, like "AB12" or "A2C"), display as is
    displayInvoiceId = rawBookingId;
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={[styles.companyName, { fontWeight: 'bold' }]}>{profile.company_name || 'Your Company Name'}</Text>
            {profile.full_name && profile.full_name.trim() && <Text style={styles.companyDetails}>{profile.full_name}</Text>}
            {profile.address && profile.address.trim() && <Text style={styles.companyDetails}>{profile.address}</Text>}
            {profile.email && profile.email.trim() && <Text style={styles.companyDetails}>Email: {profile.email}</Text>}
            {profile.phone_number && profile.phone_number.trim() && <Text style={styles.companyDetails}>Phone: {profile.phone_number}</Text>}
            {profile.website && profile.website.trim() && <Text style={styles.companyDetails}>Website: {profile.website}</Text>}
            {profile.instagram && profile.instagram?.trim() && <Text style={styles.companyDetails}>Instagram: @{profile.instagram}</Text>}
            {profile.vat_number && profile.vat_number.trim() && <Text style={styles.companyDetails}>VAT: {profile.vat_number}</Text>}
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={[styles.invoiceTitle, { fontWeight: 'bold' }]}>INVOICE</Text>
            <Text style={styles.invoiceSubText}>Invoice #: {displayInvoiceId}</Text>
            <Text style={styles.invoiceSubText}>Date: {formattedInvoiceDate}</Text>
          </View>
        </View>

        {/* Guest Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontWeight: 'bold' }]}>Guest Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Guest Name</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{booking.guest_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-in Date</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{formattedStartDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-out Date</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{formattedEndDate}</Text>
          </View>
          <View style={styles.rowNoBorder}>
            <Text style={styles.label}>Number of Nights</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{nights}</Text>
          </View>
        </View>

        {/* Payment Summary Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontWeight: 'bold' }]}>Payment Summary</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Price per Night</Text>
            <Text style={[styles.paymentValue, { fontWeight: 'bold' }]}>{formatCurrencyValue(pricePerNight)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Number of Nights</Text>
            <Text style={[styles.paymentValue, { fontWeight: 'bold' }]}>{nights}</Text>
          </View>
          
          <View style={styles.grandTotalRow}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Total Amount</Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>{formatCurrencyValue(booking.total_amount)}</Text>
          </View>

          {actualPrepayment > 0 && (
            <View style={styles.totalSummaryRow}>
              <Text style={styles.paymentLabel}>Amount Paid (Prepayment)</Text>
              <Text style={[styles.paymentValue, { fontWeight: 'bold' }]}>{formatCurrencyValue(actualPrepayment)}</Text>
            </View>
          )}

          <View style={[styles.grandTotalRow, { borderTopColor: '#ff5a5f', marginTop: actualPrepayment > 0 ? 5 : 10 }]}>
            <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>{remainingAmount > 0 ? 'Amount Due' : 'Status'}</Text>
            <Text style={[styles.totalValue, { fontWeight: 'bold' }]}>
              {remainingAmount > 0 ? formatCurrencyValue(remainingAmount) : 'Fully Paid'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your booking with {profile.company_name || 'us'}. We look forward to welcoming you!
          {profile.email && profile.email.trim() && `\nQuestions? Contact us at ${profile.email} or call ${profile.phone_number?.trim() || 'our support line'}.`}
        </Text>
      </Page>
    </Document>
  );
};