// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { ensureUserHasProperty } from '@/lib/actions/property-creation';
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
  const cookieStore = cookies();

  // Get the current authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  // Check if user is authenticated
  if (!user) {
    // This shouldn't happen due to middleware protection, but handle it gracefully
    throw new Error('Authentication required');
  }

  // Ensure user has at least one property
  const propertyResult = await ensureUserHasProperty();
  if (!propertyResult.success) {
    console.error('Failed to ensure user has property:', propertyResult.error);
    throw new Error('Failed to initialize user properties');
  }

  // Get selected property from cookies
  const selectedPropertyId = cookieStore.get('selectedPropertyId')?.value;
  
  // Get user's properties
  const { data: userProperties, error: propertiesError } = await supabase
    .from('properties')
    .select('id, name, is_active')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (propertiesError) {
    console.error('Error fetching user properties:', propertiesError);
    throw new Error('Failed to load user properties');
  }

  let propertyId: string | undefined = selectedPropertyId;
  
  // If no property selected or selected property doesn't exist in user's properties
  if (!propertyId || !userProperties?.some(p => p.id === propertyId)) {
    // If user has only one property, automatically use it
    if (userProperties && userProperties.length === 1) {
      propertyId = userProperties[0].id;
    } else if (userProperties && userProperties.length > 0) {
      // Otherwise, use the first active property or the first property
      const activeProperty = userProperties.find(p => p.is_active) || userProperties[0];
      propertyId = activeProperty.id;
    } else {
      // This should not happen since we ensured user has a property
      throw new Error('No properties found for user');
    }
  }

  // If we have a valid propertyId, ensure it's set in cookies for consistency
  if (propertyId) {
    // Note: We can't set cookies directly in server components,
    // but the client-side PropertySwitcher will handle this
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

  // Fetch bookings for calendar with explicit user and property filtering
  const { data: bookingsData, error: calendarError } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, guest_name, source, total_amount, prepayment, notes, payment_status')
    .eq('user_id', user.id)
    .eq('property_id', propertyId);

  // Fetch today's check-ins with user and property filtering
  const { data: todayCheckInsData, error: checkInsError } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, guest_name, source, total_amount, prepayment, notes, payment_status')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('start_date', todayDateString);

  // Fetch today's check-outs with user and property filtering
  const { data: todayCheckOutsData, error: checkOutsError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('end_date', todayDateString);

  // Calculate date range for upcoming 10 days starting from tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tenDaysFromTomorrow = new Date(tomorrow);
  tenDaysFromTomorrow.setDate(tenDaysFromTomorrow.getDate() + 10);
  
  const tomorrowDateString = format(tomorrow, 'yyyy-MM-dd');
  const tenDaysFromTomorrowDateString = format(tenDaysFromTomorrow, 'yyyy-MM-dd');

  // Fetch upcoming check-ins for the next 10 days with user and property filtering
  const { data: upcomingCheckInsData, error: upcomingError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .gte('start_date', tomorrowDateString)
    .lte('start_date', tenDaysFromTomorrowDateString)
    .order('start_date', { ascending: true });

  // Fetch ongoing bookings (bookings that started before today and end after today)
  const { data: ongoingBookingsData, error: ongoingError } = await supabase
    .from('bookings')
    .select('*') // Select all fields needed by BookingCard
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .lt('start_date', todayDateString)
    .gt('end_date', todayDateString)
    .order('start_date', { ascending: true });

  if (calendarError || checkInsError || checkOutsError || upcomingError || ongoingError) {
    console.error('Error fetching data:', {
      calendarError,
      checkInsError,
      checkOutsError,
      upcomingError,
      ongoingError,
    });
    
    // Redirect to error page or show error message
    throw new Error('Failed to load dashboard data');
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

  const ongoingBookings = ongoingBookingsData?.map((booking) => ({
    ...booking,
    formattedStartDate: formatBookingDate(booking.start_date, params.lang),
    formattedEndDate: formatBookingDate(booking.end_date, params.lang),
  }));

  return (
    <div className="space-y-2 pb-20">
      <div className="grid gap-2 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Calendar - full width on mobile and iPad, 1/3 width on large screens */}
        <div className="md:col-span-2 lg:col-span-1">
          <Suspense fallback={<div>{dictionary.loading_calendar}</div>}>
            <CustomBookingCalendar 
              initialEvents={events} 
            />
          </Suspense>
        </div>

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

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Ongoing Bookings Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {dictionary.ongoing_bookings} ({ongoingBookings?.length || 0})
              </h3>
              <div className="space-y-4">
                {ongoingBookings?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {dictionary.no_ongoing_bookings}
                  </p>
                ) : (
                  ongoingBookings?.map((booking) => (
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

        {/* Upcoming Check-ins Next 10 Days */}
        <Card className="[&>*:last-child]:!pb-0">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              {dictionary.upcoming_check_ins_next_10_days ?? 'Upcoming Check-ins Next 10 Days'} ({upcomingCheckIns?.length || 0})
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
