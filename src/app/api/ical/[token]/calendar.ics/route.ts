import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/database.types';

// Helper function to fold lines according to RFC 5545
// Lines should not be longer than 75 octets.
// Long lines are split by inserting a CRLF followed by a space.
function foldLine(line: string): string {
    const MAX_LENGTH = 75;
    if (new TextEncoder().encode(line).length <= MAX_LENGTH) {
        return line;
    }

    let result = '';
    let currentLine = line;

    // While the line is too long
    while (new TextEncoder().encode(currentLine).length > MAX_LENGTH) {
        // Find a split point. We need to be careful not to split in the middle of a multi-byte character.
        // Simple approach: take 75 chars, but this might be wrong for UTF-8.
        // Better approach: iterate and check byte length.

        let splitIndex = MAX_LENGTH;
        // Adjust split index to ensure we don't exceed 75 bytes
        while (new TextEncoder().encode(currentLine.slice(0, splitIndex)).length > MAX_LENGTH) {
            splitIndex--;
        }

        result += currentLine.slice(0, splitIndex) + '\r\n ';
        currentLine = currentLine.slice(splitIndex);
    }

    result += currentLine;
    return result;
}

export async function GET(
    request: Request,
    { params }: { params: { token: string } }
) {
    const token = params.token;

    if (!token) {
        return new NextResponse('Missing token', { status: 400 });
    }

    // Use Service Role Key to bypass RLS since this is a public feed
    // Note: We use the core supabase-js client here, not the SSR client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

    // User specified this variable name. 
    // WARNING: NEXT_PUBLIC_ prefix exposes this to the client if used in client-side code.
    // Since this is a server-side route, it is safe to use here, but the variable naming is risky.
    const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables for iCal export');
        // For debugging purposes, log which one is missing (be careful not to log the actual key)
        console.error(`URL present: ${!!supabaseUrl}, Service Key present: ${!!supabaseServiceKey}`);
        return new NextResponse('Server Configuration Error', { status: 500 });
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // 1. Find user by token
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('ical_token', token)
        .single();

    if (profileError || !profile) {
        return new NextResponse('Invalid token', { status: 404 });
    }

    // 2. Fetch bookings and properties
    const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
      id,
      start_date,
      end_date,
      guest_name,
      notes,
      property_id,
      properties (
        name
      )
    `)
        .eq('user_id', profile.id);

    if (bookingsError) {
        console.error('Error fetching bookings for ical:', bookingsError);
        return new NextResponse('Internal Server Error', { status: 500 });
    }

    // 3. Generate iCal string with CRLF line endings and folding
    const events = bookings.map((booking: any) => {
        // Format dates as YYYYMMDD
        const startDateStr = booking.start_date.replace(/-/g, '');
        const endDateStr = booking.end_date.replace(/-/g, '');



        // Create a unique ID for the event
        const uid = `${booking.id}@villa-manager`;
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const propertyName = booking.properties?.name || 'Unknown Property';
        // Escape special characters in text fields (comma, semicolon, backslash, newline)
        const escapeText = (text: string) => {
            return text
                .replace(/\\/g, '\\\\')
                .replace(/;/g, '\\;')
                .replace(/,/g, '\\,')
                .replace(/\n/g, '\\n');
        };

        const summary = escapeText(`${booking.guest_name}, ${propertyName}`);
        const description = escapeText(booking.notes || '');

        // Construct event lines array
        const eventLines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART;VALUE=DATE:${startDateStr}`,
            `DTEND;VALUE=DATE:${endDateStr}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ];

        // Fold each line and join with CRLF
        return eventLines.map(foldLine).join('\r\n');
    }).join('\r\n');

    // Construct calendar lines array
    const calendarLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Villa Manager//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        events,
        'END:VCALENDAR'
    ];

    // Filter out empty lines (in case events is empty string) and join
    const icalContent = calendarLines.filter(line => line.length > 0).join('\r\n');

    // 4. Return response
    return new NextResponse(icalContent, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="calendar.ics"',
        },
    });
}