import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/widgets/empty_state.dart';
import 'package:dobook/ui/widgets/loading_shimmer.dart';
import 'package:flutter/material.dart';
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
    final business = context.watch<AppSession>().business!;
    return Scaffold(
      appBar: AppBar(title: Text('${business.businessName} calendar')),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(child: Text('Failed to load: ${snapshot.error}'));
            }
            return const LoadingView();
          }

          final bookings = snapshot.data!;
          final byDay = <DateTime, List<Booking>>{};
          for (final b in bookings) {
            final d = DateTime.tryParse(b.bookingDate);
            if (d == null) continue;
            final key = DateTime(d.year, d.month, d.day);
            (byDay[key] ??= []).add(b);
          }

          final selectedKey = DateTime(
            _selectedDay.year,
            _selectedDay.month,
            _selectedDay.day,
          );
          final selectedBookings = byDay[selectedKey] ?? const [];

          final scheme = Theme.of(context).colorScheme;
          return Column(
            children: [
              TableCalendar<Booking>(
                firstDay: DateTime.now().subtract(const Duration(days: 365)),
                lastDay: DateTime.now().add(const Duration(days: 365 * 3)),
                focusedDay: _focusedDay,
                selectedDayPredicate: (day) => isSameDay(day, _selectedDay),
                eventLoader: (day) =>
                    byDay[DateTime(day.year, day.month, day.day)] ?? const [],
                onDaySelected: (selectedDay, focusedDay) {
                  setState(() {
                    _selectedDay = selectedDay;
                    _focusedDay = focusedDay;
                  });
                },
                calendarStyle: CalendarStyle(
                  selectedDecoration: BoxDecoration(
                    color: scheme.primary,
                    shape: BoxShape.circle,
                  ),
                  todayDecoration: BoxDecoration(
                    color: scheme.primary.withValues(alpha: 0.2),
                    shape: BoxShape.circle,
                  ),
                  markerDecoration: BoxDecoration(
                    color: scheme.primary,
                    shape: BoxShape.circle,
                  ),
                  outsideTextStyle:
                      TextStyle(color: scheme.onSurfaceVariant),
                ),
                headerStyle: HeaderStyle(
                  titleTextStyle: Theme.of(context).textTheme.titleMedium!,
                  formatButtonVisible: false,
                  leftChevronIcon: Icon(Icons.chevron_left, color: scheme.primary),
                  rightChevronIcon:
                      Icon(Icons.chevron_right, color: scheme.primary),
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: selectedBookings.isEmpty
                    ? const EmptyState(
                        icon: Icons.event_available,
                        title: 'No bookings for this day',
                        subtitle: 'Pick another day to see bookings.',
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                        itemCount: selectedBookings.length,
                        separatorBuilder: (context, index) =>
                            const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final b = selectedBookings[i];
                          return Card(
                            child: ListTile(
                              title: Text(
                                b.customerName.isEmpty
                                    ? '(No name)'
                                    : b.customerName,
                              ),
                              subtitle: Text(
                                '${b.bookingTime} • ${b.serviceType}',
                              ),
                            ),
                          );
                        },
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
