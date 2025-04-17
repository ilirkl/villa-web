// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import { Suspense } from 'react';
import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  format,
  parse, // Import parse
} from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookingCard } from '@/components/bookings/BookingCard';

// Helper function to safely parse and format dates
// It assumes input is 'YYYY-MM-DD' and treats it as such, avoiding timezone shifts during parsing
const formatBookingDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A'; // Or handle as needed
  try {
    // Parse the date string explicitly as YYYY-MM-DD
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    // Format the date object
    return format(date, 'dd MMM'); // e.g., "18 Apr"
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return dateString; // Fallback to original string on error
  }
};

export default async function DashboardPage() {
  const supabase = createClient();

  // Get today's date boundaries (use UTC for consistency if needed, but date comparison should be fine)
  const today = new Date();
  const todayStart = startOfToday(); // Keep as Date object initially
  const todayEnd = endOfToday(); // Keep as Date object initially
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Keep as Date object
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Keep as Date object

  // Format dates ONLY for the database query where 'YYYY-MM-DD' string is needed
  const todayDateString = format(todayStart, 'yyyy-MM-dd');
  const weekEndDateString = format(weekEnd, 'yyyy-MM-dd');

  // Fetch all bookings for calendar
  const { data: bookingsData, error: calendarError } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, guest_name');

  // Fetch today's check-ins
  const { data: todayCheckInsData, error: checkInsError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('start_date', todayDateString);

  // Fetch today's check-outs
  const { data: todayCheckOutsData, error: checkOutsError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('end_date', todayDateString);

  // Fetch upcoming check-ins this week
  const { data: upcomingCheckInsData, error: upcomingError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .gt('start_date', todayDateString)
    .lte('start_date', weekEndDateString)
    .order('start_date', { ascending: true });

  if (calendarError || checkInsError || checkOutsError || upcomingError) {
    console.error('Error fetching data:', {
      calendarError,
      checkInsError,
      checkOutsError,
      upcomingError,
    });
    // Handle error display appropriately
  }

  const events =
    bookingsData?.map((booking) => ({
      id: booking.id,
      title: booking.guest_name,
      // Ensure start/end have time component if needed by calendar, or handle TZ
      start: booking.start_date, // Adjust if calendar needs ISO strings or Date objects
      end: booking.end_date, // Adjust if calendar needs ISO strings or Date objects
    })) || [];

  // Prepare data for BookingCards with pre-formatted dates
  const todayCheckIns = todayCheckInsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date),
    formattedEndDate: formatBookingDate(booking.end_date),
  }));

  const todayCheckOuts = todayCheckOutsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date),
    formattedEndDate: formatBookingDate(booking.end_date),
  }));

  const upcomingCheckIns = upcomingCheckInsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date),
    formattedEndDate: formatBookingDate(booking.end_date),
  }));

  return (
    <div className="space-y-8 pb-20">
      {/* ... Calendar ... */}
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>

      <Suspense fallback={<div>Loading Calendar...</div>}>
        <BookingCalendar initialEvents={events} />
      </Suspense>


      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Activity Card */}
        <Card className="[&>*:last-child]:!pb-0">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Check-ins Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Check-ins ({todayCheckIns?.length || 0})
              </h3>
              <div className="space-y-4">
                {todayCheckIns?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No check-ins today
                  </p>
                ) : (
                  todayCheckIns?.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking} // Pass original booking if other fields are needed
                      // Pass pre-formatted dates
                      formattedStartDate={booking.formattedStartDate}
                      formattedEndDate={booking.formattedEndDate}
                      hideFooter={true}
                      hideNotes={true}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Check-outs Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Check-outs ({todayCheckOuts?.length || 0})
              </h3>
              <div className="space-y-4">
                {todayCheckOuts?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No check-outs today
                  </p>
                ) : (
                  todayCheckOuts?.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      formattedStartDate={booking.formattedStartDate}
                      formattedEndDate={booking.formattedEndDate}
                      hideFooter={true}
                      hideNotes={true}
                    />
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Check-ins This Week */}
        <Card className="[&>*:last-child]:!pb-0">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Upcoming Check-ins This Week ({upcomingCheckIns?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingCheckIns?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming check-ins this week
              </p>
            ) : (
              upcomingCheckIns?.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  formattedStartDate={booking.formattedStartDate}
                  formattedEndDate={booking.formattedEndDate}
                  hideFooter={true}
                  hideNotes={true}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}