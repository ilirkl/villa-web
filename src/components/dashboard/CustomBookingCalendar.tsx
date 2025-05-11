// components/dashboard/CustomBookingCalendar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { EventInput } from '@fullcalendar/core';
import { useSwipeable } from 'react-swipeable';
import './custom-calendar.css';
import { BookingCard } from '@/components/bookings/BookingCard';
import { format } from 'date-fns';
import { Booking } from '@/lib/definitions';
import { getCsrfToken } from '@/lib/csrf-client';

interface CustomBookingCalendarProps {
  initialEvents: EventInput[];
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date; 
  end: Date;   
  color?: string;
  originalStart: Date; 
  originalEnd: Date;   
  source?: string;  // Add this new field
  extendedProps?: any; // Add this to store additional booking data
}

const bookingSourceOptions = [ 
  { id: 'DIRECT', name: 'Direct', color: '#10b981' },
  { id: 'AIRBNB', name: 'Airbnb', color: '#ff5a5f' }, 
  { id: 'BOOKING', name: 'Booking', color: '#003580' }, 
];

const getSourceColor = (source?: string): string => {
  const sourceOption = bookingSourceOptions.find(option => option.id === source);
  return sourceOption?.color || '#FF5A5F'; // Default to Airbnb color if no source found
};

const parseDateStringAsLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};


const CustomBookingCalendar: React.FC<CustomBookingCalendarProps> = ({ initialEvents }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  // Fetch CSRF token on component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
    };
    
    fetchCsrfToken();
  }, []);

  useEffect(() => {
    const processedEvents = initialEvents.map(event => {
      let startDate: Date;
      let endDate: Date;
      
      if (typeof event.start === 'string') {
        startDate = parseDateStringAsLocal(event.start);
      } else if (event.start instanceof Date) {
        startDate = new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate());
      } else {
        console.error(`Invalid start date for event: ${event.title}`, event.start);
        return null; 
      }
      
      if (typeof event.end === 'string') {
        endDate = parseDateStringAsLocal(event.end);
      } else if (event.end instanceof Date) {
        endDate = new Date(event.end.getFullYear(), event.end.getMonth(), event.end.getDate());
      } else {
        console.warn(`Missing or invalid end date for event: ${event.title}, treating as single day.`, event.end);
        endDate = new Date(startDate.getTime()); 
      }

      if (endDate.getTime() < startDate.getTime()) {
        console.warn(`End date is before start date for event: ${event.title}. Setting end = start.`);
        endDate = new Date(startDate.getTime());
      }
      
      return {
        id: event.id?.toString() || Math.random().toString(36).substring(2, 9),
        title: event.title?.toString() || 'Untitled Event',
        start: startDate,
        end: endDate,
        originalStart: new Date(startDate.getTime()), 
        originalEnd: new Date(endDate.getTime()),     
        source: event.source?.toString(),
        color: getSourceColor(event.source?.toString()),
        extendedProps: {
          total_amount: event.total_amount || 0,
          prepayment: event.prepayment || 0,
          notes: event.notes || '',
          ...event
        }, // Store the original event data with explicit extraction of important fields
      };
    }).filter(Boolean) as CalendarEvent[]; 
    
    setEvents(processedEvents);
  }, [initialEvents]);
  
  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isPopupVisible && !(e.target as Element).closest('.booking-popup') && 
          !(e.target as Element).closest('.event-bar-segment-wrapper')) {
        setIsPopupVisible(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopupVisible]);
  
  const goToPreviousMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const goToNextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  
  const handlers = useSwipeable({
    onSwipedLeft: () => goToNextMonth(),
    onSwipedRight: () => goToPreviousMonth(),
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 50, 
  });
  
  const handleBookingClick = (event: CalendarEvent, e: React.MouseEvent) => {
// Validate the source value
    const validSources = ['DIRECT', 'AIRBNB', 'BOOKING'] as const;
    const sourceValue = event.source && validSources.includes(event.source as any) 
      ? (event.source as "DIRECT" | "AIRBNB" | "BOOKING") 
      : "DIRECT";
    
    // Create a booking object from the event data
    const booking: Booking = {
      id: event.id,
      guest_name: event.title,
      start_date: format(event.originalStart, 'yyyy-MM-dd'),
      end_date: format(event.originalEnd, 'yyyy-MM-dd'),
      source: sourceValue,
      total_amount: event.extendedProps?.total_amount || 0,
      prepayment: event.extendedProps?.prepayment || 0,
      notes: event.extendedProps?.notes || '',
      created_at: null,
      updated_at: null,
      user_id: null
    };
    
    
    setSelectedBooking(booking);
    setIsPopupVisible(true);
  };
  
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); 
  
  const getMonthData = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInCurrentMonth = getDaysInMonth(year, month);
    const firstDayOfMonthDate = new Date(year, month, 1);
    let firstDayIndex = firstDayOfMonthDate.getDay(); 
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; 
    
    const days = [];
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthMonth = month === 0 ? 11 : month - 1;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, prevMonthMonth);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ date: new Date(prevMonthYear, prevMonthMonth, daysInPrevMonth - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    const totalCellsToDisplay = 35; 
    
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthMonth = month === 11 ? 0 : month + 1;
    let dayCounterForNextMonth = 1;

    while (days.length < totalCellsToDisplay) {
      days.push({ date: new Date(nextMonthYear, nextMonthMonth, dayCounterForNextMonth++), isCurrentMonth: false });
    }

    if (days.length > totalCellsToDisplay) {
      return days.slice(0, totalCellsToDisplay);
    }
    
    return days;
  };

  const renderCalendar = () => {
    const days = getMonthData();
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    
    const dayEquivMs = 1000 * 60 * 60 * 24;
    const fixedTopPosition = '28px'; 

    // Get today's date (at midnight for accurate comparison)
    const today = new Date();
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return (
      <div className="custom-calendar">
        {/* Header */}
        <div className="calendar-header">
          <button onClick={goToPreviousMonth} className="nav-button" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <h2 className="calendar-title">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={goToNextMonth} className="nav-button" aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
        
        {/* Grid Container */}
        <div className="calendar-grid-container">
          {/* Weekday Header */}
          <div className="calendar-weekday-header-row">
            {weekDays.map(day => <div key={day} className="weekday-header-cell">{day}</div>)}
          </div>
          
          {/* Weeks */}
          {weeks.map((week, weekIndex) => {
            const weekStartDate = week[0].date; 
            const weekEndDate = new Date(week[6].date.getTime() + dayEquivMs - 1); 

            return (
              <div key={weekIndex} className="calendar-week-row">
                {/* Day Cells */}
                <div className="calendar-day-cells-container">
                  {week.map((dayInfo, dayIndex) => { // Renamed `day` to `dayInfo` for clarity
                    // Check if dayInfo.date is today
                    const isToday = dayInfo.date.getTime() === todayAtMidnight.getTime();
                    const dayCellClasses = [
                      'calendar-day-cell',
                      dayInfo.isCurrentMonth ? 'current-month' : 'other-month',
                      isToday ? 'is-today' : '' // Add 'is-today' class if it's today
                    ].join(' ').trim(); // Join classes and trim potential trailing space

                    return (
                      <div key={dayIndex} className={dayCellClasses}>
                        <div className="day-number">{dayInfo.date.getDate()}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Event Bars */}
                <div className="calendar-event-bars-container">
                  {events.map(event => {
                    if (event.originalEnd.getTime() < weekStartDate.getTime() || event.originalStart.getTime() > weekEndDate.getTime()) {
                      return null; 
                    }

                    const segmentStart = event.originalStart.getTime() < weekStartDate.getTime() ? weekStartDate : event.originalStart;
                    const segmentEnd = event.originalEnd.getTime() > weekEndDate.getTime() ? weekEndDate : event.originalEnd;
                    
                    const segmentStartDayPart = new Date(segmentStart.getFullYear(), segmentStart.getMonth(), segmentStart.getDate());
                    const weekStartDayPart = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate());

                    let startDayIndex = Math.floor((segmentStartDayPart.getTime() - weekStartDayPart.getTime()) / dayEquivMs);
                    startDayIndex = Math.max(0, startDayIndex); 

                    let numDaysInSegment = Math.round((segmentEnd.getTime() - segmentStart.getTime()) / dayEquivMs) + 1;
                    numDaysInSegment = Math.min(numDaysInSegment, 7 - startDayIndex); 

                    if (numDaysInSegment <= 0) return null;

                    const barWrapperLeft = `${(startDayIndex * 100) / 7}%`;
                    const barWrapperWidth = `${(numDaysInSegment * 100) / 7}%`;

                    const isSingleDayEvent = event.originalStart.getTime() === event.originalEnd.getTime();
                    const isActualEventStartInSegment = segmentStart.getTime() === event.originalStart.getTime();
                    const isActualEventEndInSegment = segmentEnd.getTime() === event.originalEnd.getTime();
                    
                    const showTitle = isActualEventStartInSegment;

                    const visualClassesArray: string[] = ['event-bar-visual'];
                    
                    let visualStyle: React.CSSProperties = {
                      backgroundColor: event.color,
                      height: '100%',
                      position: 'absolute', 
                      top: 0,
                      left: '0%',
                      width: '100%',
                      borderTopLeftRadius: '0px',
                      borderTopRightRadius: '0px',
                      borderBottomLeftRadius: '0px',
                      borderBottomRightRadius: '0px',
                    };

                    if (isSingleDayEvent) {
                      visualClassesArray.push('is-single-day');
                      visualStyle.borderTopLeftRadius = '12px';
                      visualStyle.borderTopRightRadius = '12px';
                      visualStyle.borderBottomLeftRadius = '12px';
                      visualStyle.borderBottomRightRadius = '12px';
                    } else {
                      let currentVisualWidthPerc = 100.0; 
                      let currentVisualLeftPerc = 0.0;   

                      if (isActualEventStartInSegment) {
                        const leftOffsetForFirstCell = (0.35 / numDaysInSegment) * 100.0; 
                        currentVisualLeftPerc = leftOffsetForFirstCell;
                        currentVisualWidthPerc -= leftOffsetForFirstCell;
                        
                        visualStyle.borderTopLeftRadius = '12px';
                        visualStyle.borderBottomLeftRadius = '12px';
                      }

                      if (isActualEventEndInSegment) {
                        const widthReductionForLastCell = (0.8 / numDaysInSegment) * 100.0; 
                        currentVisualWidthPerc -= widthReductionForLastCell;

                        visualStyle.borderTopRightRadius = '12px';
                        visualStyle.borderBottomRightRadius = '12px';
                      }
                      
                      visualStyle.left = `${currentVisualLeftPerc}%`;
                      visualStyle.width = `${Math.max(0, currentVisualWidthPerc)}%`;
                    }

                    return (
                      <div 
                        key={`${event.id}-week-${weekIndex}`} 
                        className="event-bar-segment-wrapper" 
                        style={{
                          left: barWrapperLeft,
                          width: barWrapperWidth,
                          top: fixedTopPosition,
                        }}
                        role="button" 
                        tabIndex={0}  
                        aria-label={`Booking: ${event.title} from ${event.originalStart.toLocaleDateString()} to ${event.originalEnd.toLocaleDateString()}`}
                        onClick={(e) => handleBookingClick(event, e)}
                      >
                        <div 
                          className={visualClassesArray.join(' ')} 
                          style={visualStyle} 
                        >
                          {showTitle && <span className="event-title">{event.title}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Booking Popup */}
        {isPopupVisible && selectedBooking && (
          <div className="booking-popup-overlay">
            <div className="booking-popup">
              <div className="relative">
                <button 
                  className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1 text-gray-600 shadow-sm hover:text-gray-900"
                  onClick={() => setIsPopupVisible(false)}
                >
                  <X size={16} />
                </button>
                <BookingCard 
                  booking={selectedBooking}
                  formattedStartDate={format(new Date(selectedBooking.start_date), 'dd MMM')}
                  formattedEndDate={format(new Date(selectedBooking.end_date), 'dd MMM')}
                  hideFooter={false}
                  hideNotes={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="custom-calendar-outer-container shadow-sm" {...handlers}>
      {renderCalendar()}
    </div>
  );
};

export default CustomBookingCalendar;
