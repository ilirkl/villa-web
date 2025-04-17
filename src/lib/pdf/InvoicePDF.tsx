import React from 'react';
import { Document, Page, Text, View, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { invoiceStyles as styles } from './styles/invoiceStyles';
import { Booking } from '@/lib/definitions';

// Register fonts if needed
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf' },
  ],
});

interface InvoicePDFProps {
  booking: Booking;
  hotelInfo: {
    name: string;
    address: string;
    email: string;
    phone: string;
  };
}

export const InvoicePDF: React.FC<InvoicePDFProps> = ({ booking, hotelInfo }) => {
  const nights = Math.ceil(
    (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / 
    (1000 * 60 * 60 * 24)
  );
  const pricePerNight = booking.total_amount / nights;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.hotelInfo}>
            <Text style={styles.hotelName}>{hotelInfo.name}</Text>
            <Text style={styles.hotelAddress}>{hotelInfo.address}</Text>
            <Text style={styles.hotelAddress}>{hotelInfo.email}</Text>
            <Text style={styles.hotelAddress}>{hotelInfo.phone}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.value}>Invoice #: {booking.id}</Text>
            <Text style={styles.value}>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guest Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Guest Name:</Text>
            <Text style={styles.value}>{booking.guest_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-in:</Text>
            <Text style={styles.value}>{format(new Date(booking.start_date), 'dd/MM/yyyy')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check-out:</Text>
            <Text style={styles.value}>{format(new Date(booking.end_date), 'dd/MM/yyyy')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Number of Nights:</Text>
            <Text style={styles.value}>{nights}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Price per Night:</Text>
            <Text style={styles.value}>€ {pricePerNight.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Total Amount:</Text>
            <Text style={styles.value}>€ {booking.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for choosing {hotelInfo.name}
        </Text>
      </Page>
    </Document>
  );
};
