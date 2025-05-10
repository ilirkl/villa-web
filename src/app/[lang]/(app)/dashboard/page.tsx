// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import {
  startOfToday,
  endOfToday,
  startOfWeek,
  endOfWeek,
  format,
  parse,
} from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookingCard } from '@/components/bookings/BookingCard';
import { getDictionary } from '@/lib/dictionary';
import { sq } from 'date-fns/locale';

// Import our custom calendar component instead of FullCalendar
import CustomBookingCalendar from '@/components/dashboard/CustomBookingCalendar';

// Helper function to safely parse and format dates with locale support
const formatBookingDate = (dateString: string | null | undefined, locale: string): string => {
  if (!dateString) return 'N/A'; // Or handle as needed
  try {
    // Parse the date string explicitly as YYYY-MM-DD
    const date = parse(dateString, 'yyyy-MM-dd', new Date());
    // Format the date object with the appropriate locale
    return format(date, 'dd MMM', { 
      locale: locale === 'sq' ? sq : undefined 
    }); // e.g., "18 Pri" for Albanian or "18 Apr" for English
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return dateString; // Fallback to original string on error
  }
};

export default async function DashboardPage({ params }: { params: { lang: string } }) {
  const supabase = createClient();
  const dictionary = await getDictionary(params.lang as 'en' | 'sq');

  // Get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is authenticated
  if (!user) {
    // This shouldn't happen due to middleware protection, but handle it gracefully
    throw new Error('Authentication required');
  }

  // Get today's date boundaries (use UTC for consistency if needed, but date comparison should be fine)
  const today = new Date();
  const todayStart = startOfToday(); // Keep as Date object initially
  const todayEnd = endOfToday(); // Keep as Date object initially
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Keep as Date object
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Keep as Date object

  // Format dates ONLY for the database query where 'YYYY-MM-DD' string is needed
  const todayDateString = format(todayStart, 'yyyy-MM-dd');
  const weekEndDateString = format(weekEnd, 'yyyy-MM-dd');

  // Fetch bookings for calendar with explicit user filtering
  const { data: bookingsData, error: calendarError } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, guest_name, source, total_amount, prepayment, notes')
    .eq('user_id', user.id);

  // Fetch today's check-ins with user filtering
  const { data: todayCheckInsData, error: checkInsError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
    .eq('start_date', todayDateString);

  // Fetch today's check-outs with user filtering
  const { data: todayCheckOutsData, error: checkOutsError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
    .eq('end_date', todayDateString);

  // Fetch upcoming check-ins this week with user filtering
  const { data: upcomingCheckInsData, error: upcomingError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
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
      start: booking.start_date,
      end: booking.end_date,
      source: booking.source,
      total_amount: booking.total_amount,
      prepayment: booking.prepayment,
      notes: booking.notes,
    })) || [];

  // Prepare data for BookingCards with pre-formatted dates
  const todayCheckIns = todayCheckInsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date, params.lang),
    formattedEndDate: formatBookingDate(booking.end_date, params.lang),
  }));

  const todayCheckOuts = todayCheckOutsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date, params.lang),
    formattedEndDate: formatBookingDate(booking.end_date, params.lang),
  }));

  const upcomingCheckIns = upcomingCheckInsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date, params.lang),
    formattedEndDate: formatBookingDate(booking.end_date, params.lang),
  }));

  return (
    <div className="space-y-2 pb-20">
      {/* Calendar */}

      <Suspense fallback={<div>{dictionary.loading_calendar}</div>}>
        <CustomBookingCalendar 
          initialEvents={events} 
        />
      </Suspense>

      <div className="grid gap-2 md:grid-cols-2">
        {/* Today's Activity Card */}
        <Card className="[&>*:last-child]:!pb-0">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {dictionary.todays_activity}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Check-ins Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {dictionary.check_ins} ({todayCheckIns?.length || 0})
              </h3>
              <div className="space-y-4">
                {todayCheckIns?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {dictionary.no_check_ins_today}
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
                {dictionary.check_outs} ({todayCheckOuts?.length || 0})
              </h3>
              <div className="space-y-4">
                {todayCheckOuts?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {dictionary.no_check_outs_today}
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
              {dictionary.upcoming_check_ins_this_week ?? 'Upcoming Check-ins This Week'} ({upcomingCheckIns?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingCheckIns?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {dictionary.no_upcoming_check_ins_this_week}
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
