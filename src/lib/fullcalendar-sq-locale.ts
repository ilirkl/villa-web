// src/lib/fullcalendar-sq-locale.ts
import { LocaleInput } from '@fullcalendar/core';

// Extended Albanian locale for FullCalendar
const sqLocale: LocaleInput = {
  code: 'sq',
  firstDay: 1, // Monday is the first day of the week
  buttonText: {
    prev: 'mbrapa',
    next: 'Përpara',
    today: 'Sot',
    year: 'Viti',
    month: 'Muaj',
    week: 'Javë',
    day: 'Ditë',
    list: 'Listë'
  },
  weekText: 'Ja',
  allDayText: 'Gjithë ditën',
  moreLinkText: '+më shumë', // Changed to string instead of function
  noEventsText: 'Nuk ka evente për të shfaqur',
  
};

export default sqLocale;



