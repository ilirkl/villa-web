import { StyleSheet } from '@react-pdf/renderer';

export const invoiceStyles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  hotelInfo: {
    marginBottom: 20,
  },
  hotelName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hotelAddress: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    padding: 4,
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  label: {
    fontSize: 10,
    color: '#666666',
  },
  value: {
    fontSize: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#666666',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 20,
  },
});