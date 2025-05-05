// components/dashboard/BookingCalendar.tsx
'use client';

import React, { useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventInput, EventContentArg, EventClickArg } from '@fullcalendar/core'; // Import EventClickArg
import { useSwipeable } from 'react-swipeable';
import './calendar.css';

interface BookingCalendarProps {
  initialEvents: EventInput[];
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ initialEvents }) => {
  const calendarRef = useRef<FullCalendar>(null);

  // --- Adjust Events (same as before) ---
  const adjustedEvents = initialEvents.map(event => {
    if (event.end) {
        let endDate: Date;
        if (event.end instanceof Date) {
            endDate = new Date(event.end.getTime());
        } else {
            const parts = (event.end as string).split('-').map(Number);
            endDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
        }
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        return { ...event, end: endDate.toISOString().split('T')[0] };
    }
    return event;
  });

  // --- Render Event Content (same as before) ---
  const renderEventContent = (eventInfo: EventContentArg) => {
    const isFirstDay = eventInfo.isStart;
    return (
      <div className="fc-event-main-frame overflow-hidden whitespace-nowrap">
        {isFirstDay && (
          <div className="fc-event-title-container">
            <div className="fc-event-title fc-sticky px-1">
                {eventInfo.event.title}
            </div>
          </div>
        )}
         {!isFirstDay && <div className="fc-event-title fc-sticky"> </div>}
      </div>
    );
  };

  // --- Swipe Handlers (same as before) ---
  const handlers = useSwipeable({
    onSwipedLeft: () => calendarRef.current?.getApi().next(),
    onSwipedRight: () => calendarRef.current?.getApi().prev(),
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 50,
  });

  // --- Add eventClick handler ---
  const handleEventClick = (clickInfo: EventClickArg) => {
    // Prevent the default action (like browser navigation if it was a link)
    // and also prevents FullCalendar's internal selection/highlighting behavior
    clickInfo.jsEvent.preventDefault();

    // You could optionally add custom logic here if needed in the future,
    // but for now, we just prevent the default.
    console.log('Event click prevented for:', clickInfo.event.title);
  };
  // --- End eventClick handler ---

  return (
    <div className="bg-card p-4 rounded-lg shadow select-none" {...handlers}>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={adjustedEvents}
        locale="sq"
        headerToolbar={{
          left: 'prev',
          center: 'title',
          right: 'next'
        }}
        firstDay={1}
        fixedWeekCount={false}
        dayMaxEvents={true}
        height="auto"
        eventContent={renderEventContent}

        // --- Styling & Interaction ---
        eventClassNames="rounded-md shadow-sm cursor-default bg-primary text-primary-foreground border-primary"
        dayCellClassNames="cursor-default"
        dayHeaderClassNames="text-muted-foreground font-medium text-sm"
        titleFormat={{ month: 'long', year: 'numeric' }}
        buttonText={{ prev: '‹', next: '›' }}
        buttonIcons={false}
        customButtons={{
          prev: {
            text: '‹',
            click: () => calendarRef.current?.getApi().prev()
          },
          next: {
            text: '›',
            click: () => calendarRef.current?.getApi().next()
          }
        }}
        selectable={false}
        editable={false}

        // --- Add the eventClick prop ---
        eventClick={handleEventClick}
      />
    </div>
  );
};

export default BookingCalendar;
