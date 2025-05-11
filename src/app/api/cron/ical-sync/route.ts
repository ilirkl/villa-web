import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAirbnbIcal, syncBookingComIcal } from '@/lib/actions/ical-sync';

// Define the result type for clarity
interface SyncResult {
  source: string;
  success: boolean;
  message: string;
  newBookings?: number;
}

// This API route will be called by a cron job every hour
export async function GET(request: Request) {
  try {
    // Verify the request has a valid API key (you should set this in your environment)
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    
    if (apiKey !== process.env.CRON_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get all users with iCal URLs
    const supabase = createClient();
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, airbnb_ical_url, booking_com_ical_url')
      .or('airbnb_ical_url.not.is.null,booking_com_ical_url.not.is.null');
    
    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
    
    // Sync iCal for each user
    const allResults: SyncResult[] = [];
    
    for (const user of users) {
      // Sync Airbnb if URL exists
      if (user.airbnb_ical_url) {
        // Impersonate the user for the sync operation
        const { data: authData } = await supabase.auth.admin.getUserById(user.id);
        if (authData?.user) {
          const airbnbResult = await syncAirbnbIcal(user.airbnb_ical_url);
          allResults.push({
            source: 'AIRBNB',
            ...airbnbResult
          });
        }
      }
      
      // Sync Booking.com if URL exists
      if (user.booking_com_ical_url) {
        // Impersonate the user for the sync operation
        const { data: authData } = await supabase.auth.admin.getUserById(user.id);
        if (authData?.user) {
          const bookingComResult = await syncBookingComIcal(user.booking_com_ical_url);
          allResults.push({
            source: 'BOOKING',
            ...bookingComResult
          });
        }
      }
    }
    
    // Now we can safely access properties on individual elements
    const successCount = allResults.filter(result => result.success).length;
    const totalNewBookings = allResults.reduce((sum, result) => sum + (result.newBookings || 0), 0);
    
    return NextResponse.json({
      success: true,
      message: `Synced iCal for ${users.length} users, added ${totalNewBookings} new bookings`,
      details: allResults
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}



