'use server';

import { createActionClient } from '@/lib/supabase/server';
import * as nodeIcal from 'node-ical';
import { v4 as uuidv4 } from 'uuid';
import { BookingSource } from '@/lib/definitions';

interface IcalBooking {
  summary: string;
  start: Date;
  end: Date;
  uid: string;  // This is the unique identifier from Airbnb
  description?: string; // Added to capture more details
  source: BookingSource; // Added to store the detected source
}

export async function syncAirbnbIcal(icalUrl: string): Promise<{
  success: boolean;
  message: string;
  newBookings?: number;
}> {
  try {
    const supabase = createActionClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

        // Validate the iCal URL to prevent SSRF
    let allowedHosts = [
      'www.airbnb.com',
      'airbnb.com',
      'calendar.google.com',
      'www.booking.com',
      'booking.com',
      'www.vrbo.com',
      'vrbo.com',
      // Add more trusted domains as necessary
    ];
    let parsedUrl;
    try {
      parsedUrl = new URL(icalUrl);
    } catch (e) {
      throw new Error('Provided iCal URL is not a valid URL');
    }
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      throw new Error(`The specified iCal URL host is not allowed: ${parsedUrl.hostname}`);
    }


    // Fetch iCal data
    const response = await fetch(icalUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.statusText}`);
    }
    
    const icalData = await response.text();
    const parsedData = nodeIcal.parseICS(icalData);
    
    // Extract bookings from iCal data
    const bookings: IcalBooking[] = [];
    
    for (const key in parsedData) {
      const event = parsedData[key];
      if (event.type === 'VEVENT') {
        // Ensure we have valid dates
        if (!event.start || !event.end) {
          console.warn('Skipping event with missing dates:', event.summary);
          continue;
        }
        
        // Determine if this is a blocked date or a regular booking
        const isBlocked = event.summary?.includes('Not available') || 
                          event.summary?.includes('Blocked') ||
                          event.summary?.includes('Unavailable');
        
        // Determine the source based on description or summary
        let source: BookingSource = 'AIRBNB';

        
        // Helper function to extract URLs from a string and match their host against whitelist
        function matchesBookingComHost(text?: string): boolean {
          if (!text) return false;
          // Simple URL regex (not perfect, but OK for iCal typical cases)
          const urlRegex = /\bhttps?:\/\/[^\s<>"']+/gi;
          const allowedHosts = [
            'booking.com',
            'www.booking.com'
          ];
          const matches = text.match(urlRegex);
          if (matches) {
            for (const urlStr of matches) {
              // Parse hostname
              try {
                const hostname = new URL(urlStr).hostname.replace(/^www\./, '');
                if (allowedHosts.includes(hostname) || allowedHosts.includes('www.' + hostname)) {
                  return true;
                }
              } catch {} // Ignore invalid URLs
            }
          }
          // Fallback: substring match (case-insensitive) on plain text, but only on word boundary
          const bookingPattern = /\bBooking\.com\b/i;
          return bookingPattern.test(text);
        }

        
        // Check if it's from Booking.com
        if (matchesBookingComHost(event.description) || 
            matchesBookingComHost(event.summary)) {
          source = 'BOOKING';
        }
        
        // For blocked dates with no clear source, use the most likely source
        if (isBlocked && source === 'AIRBNB') {
          // If it's blocked but not explicitly from Booking.com, 
          // we'll still mark it as BOOKING since that's a common scenario
          source = 'BOOKING';
        }
        
        // Create a guest name based on available information
        let guestName = event.summary || 'Booking';
        
        // For blocked dates, create a more descriptive name
        if (isBlocked) {
          guestName = source === 'BOOKING' ? 'Booking.com Reservation' : 'Blocked Dates';
        }
        
        // Always add the event to our bookings array, regardless of whether it's blocked or not
        bookings.push({
          summary: guestName,
          start: event.start,
          end: event.end,
          uid: event.uid || uuidv4(),
          description: event.description,
          source: source
        });
      }
    }
    
    // Get existing bookings to avoid duplicates - checking airbnb_id regardless of source
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('airbnb_id')
      .eq('user_id', user.id)
      .not('airbnb_id', 'is', null);

    // Create a Set of existing Airbnb IDs for faster lookup
    const existingAirbnbIds = new Set(existingBookings?.map(booking => booking.airbnb_id) || []);
    
    // Filter out bookings that already exist by checking the airbnb_id
    const newBookings = bookings.filter(booking => !existingAirbnbIds.has(booking.uid));
    
    if (newBookings.length === 0) {
      return { 
        success: true, 
        message: 'No new bookings to sync',
        newBookings: 0
      };
    }
    
    // Insert new bookings with airbnb_id
    const { error } = await supabase
      .from('bookings')
      .insert(
        newBookings.map(booking => {
          // Fix for date handling to ensure correct dates
          // Add one day to both start and end dates to correct the off-by-one issue
          const startDate = new Date(booking.start);
          const endDate = new Date(booking.end);
          
          // Add one day to correct the date shift
          startDate.setDate(startDate.getDate() + 1);
          endDate.setDate(endDate.getDate() + 1);
          
          // Format as YYYY-MM-DD
          const formattedStartDate = startDate.toISOString().split('T')[0];
          const formattedEndDate = endDate.toISOString().split('T')[0];
          
          return {
            guest_name: booking.summary,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            source: booking.source,
            user_id: user.id,
            airbnb_id: booking.uid,
            total_amount: 0,
            prepayment: 0,
            notes: booking.description ? 
              `Imported from Airbnb iCal on ${new Date().toISOString()}\n\nDescription: ${booking.description}` :
              `Imported from Airbnb iCal on ${new Date().toISOString()}`
          };
        })
      );
    
    if (error) {
      throw new Error(`Failed to insert bookings: ${error.message}`);
    }
    
    return { 
      success: true, 
      message: `Successfully synced ${newBookings.length} new bookings`,
      newBookings: newBookings.length
    };
  } catch (error: any) {
    console.error('iCal sync error:', error);
    return { 
      success: false, 
      message: `Error syncing iCal: ${error.message}`
    };
  }
}

export async function syncBookingComIcal(icalUrl: string): Promise<{
  success: boolean;
  message: string;
  newBookings?: number;
}> {
  try {
    const supabase = createActionClient();
    
    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Authentication required');
    }

        // Validate icalUrl to prevent SSRF
    let urlObj;
    try {
      urlObj = new URL(icalUrl);
    } catch (e) {
      throw new Error('Invalid icalUrl');
    }
    if (
      urlObj.protocol !== 'https:' ||
      urlObj.hostname !== 'www.booking.com'
    ) {
      throw new Error('Provided iCal URL is not a valid Booking.com link');
    }

    // Fetch iCal data
    const response = await fetch(icalUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.statusText}`);
    }
    
    const icalData = await response.text();
    const parsedData = nodeIcal.parseICS(icalData);
    
    // Extract bookings from iCal data
    const bookings: IcalBooking[] = [];
    
    for (const key in parsedData) {
      const event = parsedData[key];
      if (event.type === 'VEVENT') {
        // Ensure we have valid dates
        if (!event.start || !event.end) {
          console.warn('Skipping event with missing dates:', event.summary);
          continue;
        }
        
        // For Booking.com, we'll set the source directly
        const source: BookingSource = 'BOOKING';
        
        // Create a guest name based on available information
        let guestName = event.summary || 'Booking.com Reservation';
        
        // Check if this is a blocked date
        const isBlocked = event.summary?.includes('Not available') || 
                          event.summary?.includes('Blocked') ||
                          event.summary?.includes('Unavailable');
        
        if (isBlocked) {
          guestName = 'Booking.com Blocked Dates';
        }
        
        bookings.push({
          summary: guestName,
          start: event.start,
          end: event.end,
          uid: event.uid || uuidv4(),
          description: event.description,
          source: source
        });
      }
    }
    
    // Get existing bookings to avoid duplicates - checking booking_com_id
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('booking_com_id')
      .eq('user_id', user.id)
      .not('booking_com_id', 'is', null);

    // Create a Set of existing Booking.com IDs for faster lookup
    const existingBookingComIds = new Set(existingBookings?.map(booking => booking.booking_com_id) || []);
    
    // Filter out bookings that already exist by checking the booking_com_id
    const newBookings = bookings.filter(booking => !existingBookingComIds.has(booking.uid));
    
    if (newBookings.length === 0) {
      return { 
        success: true, 
        message: 'No new bookings to sync from Booking.com',
        newBookings: 0
      };
    }
    
    // Insert new bookings with booking_com_id
    const { error } = await supabase
      .from('bookings')
      .insert(
        newBookings.map(booking => {
          // Fix for date handling to ensure correct dates
          // Add one day to both start and end dates to correct the off-by-one issue
          const startDate = new Date(booking.start);
          const endDate = new Date(booking.end);
          
          // Add one day to correct the date shift
          startDate.setDate(startDate.getDate() + 1);
          endDate.setDate(endDate.getDate() + 1);
          
          // Format as YYYY-MM-DD
          const formattedStartDate = startDate.toISOString().split('T')[0];
          const formattedEndDate = endDate.toISOString().split('T')[0];
          
          return {
            guest_name: booking.summary,
            start_date: formattedStartDate,
            end_date: formattedEndDate,
            source: booking.source,
            user_id: user.id,
            booking_com_id: booking.uid, // Use booking_com_id instead of airbnb_id
            total_amount: 0,
            prepayment: 0,
            notes: booking.description ? 
              `Imported from Booking.com iCal on ${new Date().toISOString()}\n\nDescription: ${booking.description}` :
              `Imported from Booking.com iCal on ${new Date().toISOString()}`
          };
        })
      );
    
    if (error) {
      throw new Error(`Failed to insert bookings: ${error.message}`);
    }
    
    return { 
      success: true, 
      message: `Successfully synced ${newBookings.length} new bookings from Booking.com`,
      newBookings: newBookings.length
    };
  } catch (error: any) {
    console.error('Booking.com iCal sync error:', error);
    return { 
      success: false, 
      message: `Error syncing Booking.com iCal: ${error.message}`
    };
  }
}















