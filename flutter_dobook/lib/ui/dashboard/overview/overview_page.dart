import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
import 'package:dobook/ui/widgets/empty_state.dart';
import 'package:dobook/ui/widgets/loading_shimmer.dart';
import 'package:dobook/ui/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class OverviewPage extends StatefulWidget {
  const OverviewPage({super.key});

  @override
  State<OverviewPage> createState() => _OverviewPageState();
}

class _OverviewPageState extends State<OverviewPage> {
  Future<List<Booking>>? _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  Widget build(BuildContext context) {
    final business = context.watch<AppSession>().business!;
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Overview')),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(child: Text('Failed to load: ${snapshot.error}'));
            }
            return const LoadingShimmerList();
          }

          final bookings = snapshot.data!;
          final stats = _computeStats(bookings);
          final recent = _recentBookings(bookings);

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 88),
            children: [
              Text(
                _greeting(business.businessName),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 6),
              Text(
                'Here is a snapshot of your bookings.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _statCard(
                      label: 'Total Bookings',
                      value: stats.totalBookings.toString(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      label: 'Upcoming',
                      value: stats.upcoming.toString(),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _statCard(
                      label: 'Revenue',
                      value: formatMoney(stats.revenue),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Recent bookings',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              if (bookings.isEmpty)
                EmptyState(
                  icon: Icons.event_busy,
                  title: 'No bookings yet',
                  subtitle: 'Bookings will appear here once created.',
                  actionLabel: 'Add your first booking',
                  onAction: () async {
                    final created = await Navigator.of(context).push<Booking?>(
                      MaterialPageRoute(
                        builder: (_) => const BookingFormScreen(),
                      ),
                    );
                    if (created != null && context.mounted) {
                      setState(() => _future = _load());
                    }
                  },
                )
              else
                ...recent.map((b) => _bookingCard(context, b)),
            ],
          );
        },
      ),
    );
  }

  Widget _statCard({required String label, required String value}) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: scheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bookingCard(BuildContext context, Booking booking) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BookingDetailsScreen(booking: booking),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      booking.customerName.isEmpty
                          ? '(No name)'
                          : booking.customerName,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      booking.customerEmail.isEmpty
                          ? 'No email'
                          : booking.customerEmail,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '${booking.bookingDate} • ${booking.bookingTime} • ${booking.serviceType}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMoney(booking.total),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 8),
                  StatusBadge(status: booking.status),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _greeting(String businessName) {
    final hour = DateTime.now().hour;
    final label = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final name = businessName.isEmpty ? 'there' : businessName;
    return '$label, $name';
  }

  _OverviewStats _computeStats(List<Booking> bookings) {
    var revenue = 0.0;
    var upcoming = 0;
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    for (final booking in bookings) {
      revenue += booking.total;
      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) continue;
      final dateOnly = DateTime(date.year, date.month, date.day);
      if (!dateOnly.isBefore(todayOnly)) {
        upcoming += 1;
      }
    }

    return _OverviewStats(
      totalBookings: bookings.length,
      upcoming: upcoming,
      revenue: revenue,
    );
  }

  List<Booking> _recentBookings(List<Booking> bookings) {
    final sorted = [...bookings];
    sorted.sort(
      (a, b) => '${b.bookingDate} ${b.bookingTime}'.compareTo(
        '${a.bookingDate} ${a.bookingTime}',
      ),
    );
    return sorted.take(5).toList();
  }

  Future<List<Booking>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getBookings(token);
  }
}

class _OverviewStats {
  const _OverviewStats({
    required this.totalBookings,
    required this.upcoming,
    required this.revenue,
  });

  final int totalBookings;
  final int upcoming;
  final double revenue;
}
