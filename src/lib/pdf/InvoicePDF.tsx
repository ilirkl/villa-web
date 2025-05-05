import React from 'react';
import { Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Booking } from '@/lib/definitions';

// Register fonts using standard web-safe font
Font.register({
  family: 'Helvetica',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCg4TYFv.ttf',
      fontWeight: 'normal'
    },
    {
      src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyCg4QIFv.ttf',
      fontWeight: 'bold'
    }
  ]
});

// Define styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  hotelInfo: {
    marginBottom: 20,
    maxWidth: '60%', // Ensure company details don't overlap with invoice title
  },
  hotelName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  hotelAddress: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
    lineHeight: 1.4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  invoiceDetails: {
    fontSize: 10,
    color: '#666666',
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
  highlightedValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#ff5a5f', // Airbnb-style red
  },
  prepaymentText: {
    fontSize: 10,
    color: '#666666',
    textAlign: 'right',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 20,
  },
});

// Helper function to format currency
const formatCurrencyValue = (amount: number) => {
  return `€ ${amount.toLocaleString()}`; // Note the space after €
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
  const pricePerNight = booking.total_amount / nights;
  const remainingAmount = booking.total_amount - (booking.prepayment || 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.hotelInfo}>
              <Text style={styles.hotelName}>{profile.company_name}</Text>
              <Text style={styles.hotelAddress}>{profile.full_name}</Text>
              <Text style={styles.hotelAddress}>{profile.address}</Text>
              <Text style={styles.hotelAddress}>{profile.email}</Text>
              <Text style={styles.hotelAddress}>{profile.phone_number}</Text>
              {profile.website && (
                <Text style={styles.hotelAddress}>{profile.website}</Text>
              )}
              {profile.instagram && (
                <Text style={styles.hotelAddress}>Instagram: {profile.instagram}</Text>
              )}
              {profile.vat_number && (
                <Text style={styles.hotelAddress}>VAT: {profile.vat_number}</Text>
              )}
            </View>
            <View>
              <Text style={styles.invoiceTitle}>INVOICE</Text>
              <Text style={styles.invoiceDetails}>Invoice #: {booking.id}</Text>
              <Text style={styles.invoiceDetails}>
                Date: {format(new Date(), 'dd/MM/yyyy')}
              </Text>
            </View>
          </View>
        </View>

        {/* Guest Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Guest Name</Text>
            <Text style={styles.value}>{booking.guest_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-in Date</Text>
            <Text style={styles.value}>
              {format(new Date(booking.start_date), 'dd/MM/yyyy')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-out Date</Text>
            <Text style={styles.value}>
              {format(new Date(booking.end_date), 'dd/MM/yyyy')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Number of Nights</Text>
            <Text style={styles.value}>{nights}</Text>
          </View>
        </View>

        {/* Payment Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Price per Night</Text>
            <Text style={styles.value}>
              {formatCurrencyValue(pricePerNight)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.highlightedValue}>
                {formatCurrencyValue(booking.total_amount)}
              </Text>
              {booking.prepayment > 0 && (
                <Text style={styles.prepaymentText}>
                  (Prepaid: {formatCurrencyValue(booking.prepayment)})
                </Text>
              )}
            </View>
          </View>
          {booking.prepayment > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Remaining Amount</Text>
              <Text style={styles.highlightedValue}>
                {formatCurrencyValue(remainingAmount)}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for choosing {profile.company_name}
        </Text>
      </Page>
    </Document>
  );
};








