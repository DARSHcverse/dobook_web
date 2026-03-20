import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:table_calendar/table_calendar.dart';

class CalendarPage extends StatefulWidget {
  const CalendarPage({super.key});

  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = DateTime.now();
  Future<List<Booking>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white.withValues(alpha: 0.88),
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 16,
        title: Row(
          children: [
            Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: const Color(0xFFE8193C),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.book_online_rounded,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Text(
              'DoBook',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: const Color(0xFFBE002B),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.search_rounded, color: Color(0xFF94A3B8)),
          ),
        ],
      ),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Failed to load: ${snapshot.error}'),
                ),
              );
            }
            return const _CalendarLoadingState();
          }

          final bookings = snapshot.data!;
          final byDay = <DateTime, List<Booking>>{};
          for (final booking in bookings) {
            final date = DateTime.tryParse(booking.bookingDate);
            if (date == null) continue;
            final key = DateTime(date.year, date.month, date.day);
            (byDay[key] ??= []).add(booking);
          }

          final selectedKey = DateTime(
            _selectedDay.year,
            _selectedDay.month,
            _selectedDay.day,
          );
          final selectedBookings = List<Booking>.from(
            byDay[selectedKey] ?? const <Booking>[],
          )..sort((a, b) => a.bookingTime.compareTo(b.bookingTime));

          return ListView(
            padding: const EdgeInsets.fromLTRB(0, 0, 0, 100),
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'CALENDAR OVERVIEW',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.8,
                                  color: const Color(0xFFAC313A),
                                ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            DateFormat('MMMM yyyy').format(_focusedDay),
                            style: Theme.of(context).textTheme.displaySmall
                                ?.copyWith(
                                  fontSize: 32,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF191C1D),
                                ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Row(
                      children: [
                        _MonthArrowButton(
                          icon: Icons.chevron_left_rounded,
                          onTap: () {
                            setState(() {
                              _focusedDay = DateTime(
                                _focusedDay.year,
                                _focusedDay.month - 1,
                                1,
                              );
                            });
                          },
                        ),
                        const SizedBox(width: 8),
                        _MonthArrowButton(
                          icon: Icons.chevron_right_rounded,
                          onTap: () {
                            setState(() {
                              _focusedDay = DateTime(
                                _focusedDay.year,
                                _focusedDay.month + 1,
                                1,
                              );
                            });
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0A191C1D),
                      blurRadius: 24,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: TableCalendar<Booking>(
                  firstDay: DateTime.now().subtract(const Duration(days: 365)),
                  lastDay: DateTime.now().add(const Duration(days: 365 * 3)),
                  focusedDay: _focusedDay,
                  headerVisible: false,
                  startingDayOfWeek: StartingDayOfWeek.monday,
                  availableGestures: AvailableGestures.horizontalSwipe,
                  rowHeight: 44,
                  selectedDayPredicate: (day) => isSameDay(day, _selectedDay),
                  eventLoader: (day) =>
                      byDay[DateTime(day.year, day.month, day.day)] ?? const [],
                  onDaySelected: (selectedDay, focusedDay) {
                    setState(() {
                      _selectedDay = selectedDay;
                      _focusedDay = focusedDay;
                    });
                  },
                  onPageChanged: (focusedDay) {
                    setState(() => _focusedDay = focusedDay);
                  },
                  calendarStyle: const CalendarStyle(
                    outsideDaysVisible: true,
                    isTodayHighlighted: false,
                    markersMaxCount: 1,
                    cellMargin: EdgeInsets.symmetric(vertical: 2),
                  ),
                  daysOfWeekStyle: DaysOfWeekStyle(
                    weekdayStyle: Theme.of(context).textTheme.labelSmall!
                        .copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.4,
                          color: const Color(0xFF94A3B8),
                        ),
                    weekendStyle: Theme.of(context).textTheme.labelSmall!
                        .copyWith(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.4,
                          color: const Color(0xFF94A3B8),
                        ),
                  ),
                  calendarBuilders: CalendarBuilders(
                    dowBuilder: (context, day) {
                      final label = DateFormat('EEE').format(day).toUpperCase();
                      return Center(
                        child: Text(
                          label,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.4,
                                color: const Color(0xFF94A3B8),
                              ),
                        ),
                      );
                    },
                    defaultBuilder: (context, day, focusedDay) {
                      return _CalendarDayCell(day: day);
                    },
                    outsideBuilder: (context, day, focusedDay) {
                      return _CalendarDayCell(day: day, outsideMonth: true);
                    },
                    todayBuilder: (context, day, focusedDay) {
                      return const _CalendarDayCell(
                        day: null,
                        today: true,
                      ).withDay(day);
                    },
                    selectedBuilder: (context, day, focusedDay) {
                      return const _CalendarDayCell(
                        day: null,
                        selected: true,
                      ).withDay(day);
                    },
                    markerBuilder: (context, day, events) {
                      if (events.isEmpty) return const SizedBox.shrink();
                      return Align(
                        alignment: Alignment.bottomCenter,
                        child: Container(
                          width: 6,
                          height: 6,
                          margin: const EdgeInsets.only(bottom: 4),
                          decoration: const BoxDecoration(
                            color: Color(0xFFBE002B),
                            shape: BoxShape.circle,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Bookings for ${DateFormat('d MMMM').format(_selectedDay)}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 20,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFF91F2F4).withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '#${selectedBookings.length} Scheduled',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: const Color(0xFF004F51),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: selectedBookings.isEmpty
                    ? const _EmptyDayState()
                    : Column(
                        children: [
                          for (final booking in selectedBookings)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: _DayBookingCard(booking: booking),
                            ),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Future<List<Booking>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getBookings(token);
  }
}

class _MonthArrowButton extends StatelessWidget {
  const _MonthArrowButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF3F4F5),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: SizedBox(
          width: 40,
          height: 40,
          child: Icon(icon, color: const Color(0xFF94A3B8)),
        ),
      ),
    );
  }
}

class _CalendarDayCell extends StatelessWidget {
  const _CalendarDayCell({
    required this.day,
    this.today = false,
    this.selected = false,
    this.outsideMonth = false,
  });

  final DateTime? day;
  final bool today;
  final bool selected;
  final bool outsideMonth;

  _CalendarDayCell withDay(DateTime nextDay) {
    return _CalendarDayCell(
      day: nextDay,
      today: today,
      selected: selected,
      outsideMonth: outsideMonth,
    );
  }

  @override
  Widget build(BuildContext context) {
    final date = day;
    if (date == null) return const SizedBox.shrink();

    Color background = Colors.transparent;
    Color foreground = outsideMonth
        ? const Color(0xFFD5D9DE)
        : const Color(0xFF191C1D);
    FontWeight weight = FontWeight.w500;

    if (selected) {
      background = const Color(0xFFFFDAD9);
      foreground = const Color(0xFFBE002B);
      weight = FontWeight.w700;
    }
    if (today) {
      background = const Color(0xFFBE002B);
      foreground = Colors.white;
      weight = FontWeight.w700;
    }

    return Center(
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(color: background, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: Text(
          '${date.day}',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            fontSize: 14,
            fontWeight: weight,
            color: foreground,
          ),
        ),
      ),
    );
  }
}

class _DayBookingCard extends StatelessWidget {
  const _DayBookingCard({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            Navigator.of(
              context,
            ).push(slidePageRoute(BookingDetailsScreen(booking: booking)));
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                SizedBox(
                  width: 78,
                  child: Text(
                    _formatTime(booking.bookingTime),
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFBE002B),
                    ),
                  ),
                ),
                Container(
                  width: 2,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFBE002B),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.customerName.isEmpty
                            ? '(No name)'
                            : booking.customerName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        booking.serviceType.isEmpty
                            ? 'Service'
                            : booking.serviceType,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                const Icon(
                  Icons.chevron_right_rounded,
                  color: Color(0xFF94A3B8),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static String _formatTime(String raw) {
    try {
      final parsed = DateFormat('HH:mm').parseStrict(raw);
      return DateFormat('hh:mm a').format(parsed);
    } catch (_) {
      final fallback = DateTime.tryParse('2000-01-01T$raw');
      if (fallback != null) {
        return DateFormat('hh:mm a').format(fallback);
      }
      return raw;
    }
  }
}

class _EmptyDayState extends StatelessWidget {
  const _EmptyDayState();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Icon(
            Icons.calendar_month_outlined,
            size: 26,
            color: const Color(0xFF94A3B8).withValues(alpha: 0.8),
          ),
          const SizedBox(height: 10),
          Text(
            'No bookings for this day',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF94A3B8)),
          ),
        ],
      ),
    );
  }
}

class _CalendarLoadingState extends StatelessWidget {
  const _CalendarLoadingState();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        const ShimmerLine(width: 120, height: 10),
        const SizedBox(height: 10),
        const ShimmerLine(width: 190, height: 32),
        const SizedBox(height: 16),
        Container(
          height: 360,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0A191C1D),
                blurRadius: 24,
                offset: Offset(0, 4),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const ShimmerLine(width: 170, height: 20),
        const SizedBox(height: 16),
        for (var i = 0; i < 3; i++) ...[
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x0A191C1D),
                  blurRadius: 18,
                  offset: Offset(0, 6),
                ),
              ],
            ),
            child: const Row(
              children: [
                ShimmerLine(width: 70, height: 16),
                SizedBox(width: 12),
                ShimmerBox(
                  width: 2,
                  height: 40,
                  radius: BorderRadius.all(Radius.circular(999)),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShimmerLine(width: 120, height: 16),
                      SizedBox(height: 8),
                      ShimmerLine(width: 160, height: 12),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (i < 2) const SizedBox(height: 8),
        ],
      ],
    );
  }
}
