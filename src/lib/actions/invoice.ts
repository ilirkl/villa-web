'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '../pdf/InvoicePDF';
import { createActionClient } from '@/lib/supabase/server';

export async function generateInvoice(bookingId: string): Promise<Uint8Array> {
  try {
    const supabase = createActionClient();
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error || !booking) {
      console.error('Error fetching booking:', error);
      throw new Error('Booking not found');
    }

    const hotelInfo = {
      name: "Villa Manager",
      address: "123 Main Street, City, Country",
      email: "contact@villamanager.com",
      phone: "+1 234 567 890"
    };
    
    const pdfBuffer = await renderToBuffer(
      React.createElement(InvoicePDF, {
        booking,
        hotelInfo
      })
    );

    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF buffer');
    }

    return pdfBuffer;

  } catch (error) {
    console.error('Error in generateInvoice:', error);
    throw error;
  }
}
