// app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server';
import BookingCalendar from '@/components/dashboard/BookingCalendar';
import { Suspense } from 'react';
import { startOfToday, endOfToday, startOfWeek, endOfWeek, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookingCard } from '@/components/bookings/BookingCard';

export default async function DashboardPage() {
  const supabase = createClient();
  
  // Get today's date boundaries
  const today = new Date();
  const todayStart = startOfToday().toISOString();
  const todayEnd = endOfToday().toISOString();
  
  // Get week boundaries
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }).toISOString(); // Start from Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 }).toISOString();

  // Fetch all bookings for calendar
  const { data: bookingsData, error: calendarError } = await supabase
    .from('bookings')
    .select('id, start_date, end_date, guest_name');

  // Fetch today's check-ins
  const { data: todayCheckIns, error: checkInsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('start_date', todayStart.split('T')[0]);

  // Fetch today's check-outs
  const { data: todayCheckOuts, error: checkOutsError } = await supabase
    .from('bookings')
    .select('*')
    .eq('end_date', todayStart.split('T')[0]);

  // Fetch upcoming check-ins this week
  const { data: upcomingCheckIns, error: upcomingError } = await supabase
    .from('bookings')
    .select('*')
    .gt('start_date', todayStart.split('T')[0])
    .lte('start_date', weekEnd.split('T')[0])
    .order('start_date', { ascending: true });

  if (calendarError || checkInsError || checkOutsError || upcomingError) {
    console.error("Error fetching data:", { calendarError, checkInsError, checkOutsError, upcomingError });
  }

  const events = bookingsData?.map(booking => ({
    id: booking.id,
    title: booking.guest_name,
    start: booking.start_date,
    end: booking.end_date,
  })) || [];

  return (
    <div className="space-y-8 pb-20"> {/* Added padding bottom */}
      <h1 className="text-2xl font-semibold mb-4">Booking Calendar</h1>
      
      <Suspense fallback={<div>Loading Calendar...</div>}>
        <BookingCalendar initialEvents={events} />
      </Suspense>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Activity Card */}
        <Card className="[&>*:last-child]:!pb-0"> {/* Added class to remove bottom padding */}
          <CardHeader>
            <CardTitle className="text-lg font-medium">Today's Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Check-ins Section */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Check-ins ({todayCheckIns?.length || 0})
              </h3>
              <div className="space-y-4">
                {todayCheckIns?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No check-ins today</p>
                ) : (
                  todayCheckIns?.map((booking) => (
                    <BookingCard 
                      key={booking.id} 
                      booking={booking} 
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
                  <p className="text-sm text-muted-foreground">No check-outs today</p>
                ) : (
                  todayCheckOuts?.map((booking) => (
                    <BookingCard 
                      key={booking.id} 
                      booking={booking} 
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
        <Card className="[&>*:last-child]:!pb-0"> {/* Added class to remove bottom padding */}
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Upcoming Check-ins This Week ({upcomingCheckIns?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingCheckIns?.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming check-ins this week</p>
            ) : (
              upcomingCheckIns?.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
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
