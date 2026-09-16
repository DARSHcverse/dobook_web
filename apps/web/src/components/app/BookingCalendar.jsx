'use client';

// react-big-calendar (plus its date-fns localizer) is ~2.7MB unpacked and is
// only ever rendered on the dashboard's Calendar tab. Keeping it in its own
// module lets the dashboard load it on demand via next/dynamic instead of
// shipping it to every visitor of the landing and booking pages.
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
// Must come after the vendor stylesheet above — see booking-calendar.css.
import './booking-calendar.css';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

export default function BookingCalendar({
  events,
  date,
  view,
  onNavigate,
  onView,
  onSelectEvent,
}) {
  return (
    <BigCalendar
      localizer={calendarLocalizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      toolbar={false}
      date={date}
      view={view}
      onNavigate={onNavigate}
      onView={onView}
      onSelectEvent={onSelectEvent}
      eventPropGetter={(event) => {
        const isCancelled =
          String(event?.resource?.status || 'confirmed').trim().toLowerCase() === 'cancelled';
        if (!isCancelled) return {};
        const isDark =
          typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        return {
          style: {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
            color: isDark ? 'rgb(254, 202, 202)' : '#b91c1c',
            textDecoration: 'line-through',
          },
        };
      }}
      popup
      selectable
      dayLayoutAlgorithm="no-overlap"
    />
  );
}
