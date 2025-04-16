'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventInput, EventContentArg } from '@fullcalendar/core';
import allLocales from '@fullcalendar/core/locales/sq';
import './calendar.css';

interface BookingCalendarProps {
  initialEvents: EventInput[];
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ initialEvents }) => {
  const adjustedEvents = initialEvents.map(event => {
    if (event.end) {
        const endDate = new Date(event.end as string);
        endDate.setDate(endDate.getDate() + 1);
        return { ...event, end: endDate.toISOString().split('T')[0] };
    }
    return event;
  });

  const renderEventContent = (eventInfo: EventContentArg) => {
    // Only show the title on the first day of the event
    const isFirstDay = eventInfo.isStart;
    return (
      <div className="fc-event-main-frame">
        {isFirstDay && (
          <div className="fc-event-title-container">
            <div className="fc-event-title fc-sticky">{eventInfo.event.title}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <FullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={adjustedEvents}
        locale="sq"
        headerToolbar={{
          left: 'prev,next',
          center: 'title',
          right: ''
        }}
        firstDay={1}
        fixedWeekCount={false}
        dayMaxEvents={true}
        height="auto"
        eventContent={renderEventContent}
        eventClassNames="rounded-md shadow-sm pointer-events-none"
        dayCellClassNames="pointer-events-none"
        dayHeaderClassNames="text-muted-foreground font-medium"
        titleFormat={{ month: 'long', year: 'numeric' }}
        buttonClassNames="rounded-md hover:bg-accent/50 transition-colors"
        unselectable={true}
      />
    </div>
  );
};

export default BookingCalendar;
