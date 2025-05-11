'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF } from '../pdf/InvoicePDF';
import { createActionClient } from '@/lib/supabase/server';
import { getServerCsrfToken } from '@/lib/csrf';

export async function generateInvoice(bookingId: string, csrfToken: string): Promise<Uint8Array> {
  try {
    // Get the authenticated user first
    const supabase = createActionClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Fetch booking with explicit user_id check for security
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', user.id) // IMPORTANT: Explicitly check user ownership
      .single();

    if (bookingError || !booking) {
      throw new Error('Booking not found or access denied');
    }

    // Fetch profile using the user's ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        company_name,
        full_name,
        address,
        email,
        phone_number,
        website,
        vat_number
      `)
      .eq('id', user.id)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    // Use profile data if available, otherwise use defaults
    const profileData = {
      company_name: profile?.company_name || 'Villa Manager',
      full_name: profile?.full_name || 'Villa Manager Admin',
      address: profile?.address || 'Please update your profile',
      email: profile?.email || user.email || 'contact@villamanager.com',
      phone_number: profile?.phone_number || '+1234567890',
      website: profile?.website || '',
      vat_number: profile?.vat_number || '',
      instagram: '' // Not in your table schema, using empty string as default
    };

    // Create PDF document
    const document = React.createElement(InvoicePDF, {
      booking,
      profile: profileData
    });

    // Generate and return buffer
    const buffer = await renderToBuffer(document as any);
    return buffer;
  } catch (error) {
    console.error('Error in generateInvoice:', error);
    throw error;
  }
}







