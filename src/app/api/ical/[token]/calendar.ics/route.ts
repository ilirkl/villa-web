
// Add time components: Check-in at 14:00 (2pm), Check-out at 11:00 (11am)
const dtStart = `${startDateStr}T140000`;
const dtEnd = `${endDateStr}T110000`;

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
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
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