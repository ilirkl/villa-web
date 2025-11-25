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

    // 3. Generate iCal string
    const events = bookings.map((booking: any) => {
        // Format dates as YYYYMMDD
        const startDate = booking.start_date.replace(/-/g, '');
        const endDate = booking.end_date.replace(/-/g, '');

        // Create a unique ID for the event
        const uid = `${booking.id}@villa-manager`;
        const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

        const propertyName = booking.properties?.name || 'Unknown Property';
        const summary = `${booking.guest_name}, ${propertyName}`;
        const description = booking.notes || '';

        return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtStamp}
DTSTART;VALUE=DATE:${startDate}
DTEND;VALUE=DATE:${endDate}
SUMMARY:${summary}
DESCRIPTION:${description}
END:VEVENT`;
    }).join('\n');

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Villa Manager//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;

    // 4. Return response
    return new NextResponse(icalContent, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'attachment; filename="calendar.ics"',
        },
    });
}
