import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { token: string } }
) {
    const token = params.token;

    if (!token) {
        return new NextResponse('Missing token', { status: 400 });
    }

    const supabase = createClient();

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

    // 3. Generate iCal string with CRLF line endings (RFC 5545 requirement)
    const events = bookings.map((booking: any) => {
        // Format dates as YYYYMMDD
        const startDateStr = booking.start_date.replace(/-/g, '');
        const endDateStr = booking.end_date.replace(/-/g, '');

        // Add time components: Check-in at 14:00 (2pm), Check-out at 11:00 (11am)
        const dtStart = `${startDateStr}T140000`;
        const dtEnd = `${endDateStr}T110000`;

        // Create a unique ID for the event
        const uid = `${booking.id}@villa-manager`;
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const propertyName = booking.properties?.name || 'Unknown Property';
        const summary = `${booking.guest_name}, ${propertyName}`;
        const description = booking.notes || '';

        // Construct event lines array
        const eventLines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtStamp}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            'END:VEVENT'
        ];

        return eventLines.join('\r\n');
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

    const icalContent = calendarLines.join('\r\n');

    // 4. Return response
    return new NextResponse(icalContent, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="calendar.ics"',
        },
    });
}