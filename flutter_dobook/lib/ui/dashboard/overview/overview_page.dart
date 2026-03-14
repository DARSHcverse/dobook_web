import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/bookings_page.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/empty_state.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
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
    final brand = Theme.of(context).extension<BrandColors>();

    return Scaffold(
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(child: Text('Failed to load: ${snapshot.error}'));
            }
            return const _OverviewLoading();
          }

          final bookings = snapshot.data!;
          final stats = _computeStats(bookings);
          final upcoming = _upcomingBookings(bookings);

          return ListView(
            padding: EdgeInsets.zero,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    height: 180,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          brand?.headerGradientStart ?? scheme.primary,
                          brand?.headerGradientEnd ?? scheme.primary,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: const BorderRadius.vertical(
                        bottom: Radius.circular(24),
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const SizedBox(width: 24),
                                Image.asset(
                                  'assets/brand/dobook-logo.png',
                                  height: 24,
                                  color: scheme.onPrimary,
                                  colorBlendMode: BlendMode.srcIn,
                                ),
                              ],
                            ),
                            const Spacer(),
                            Text(
                              _greetingLine(),
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    color: scheme.onPrimary,
                                  ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _displayName(business.businessName),
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    color: scheme.onPrimary,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: -30,
                    child: Row(
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
                  ),
                ],
              ),
              const SizedBox(height: 48),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Text(
                      'Upcoming',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).push(slidePageRoute(
                          const BookingsPage(),
                        ));
                      },
                      child: Text(
                        'See all →',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: scheme.primary,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              if (upcoming.isEmpty)
                EmptyState(
                  icon: Icons.event_busy,
                  title: 'No upcoming bookings',
                  subtitle: 'Bookings will appear here once created.',
                  actionLabel: 'Add your first booking',
                  onAction: () async {
                    final created = await Navigator.of(context)
                        .push<Booking?>(
                      slidePageRoute(const BookingFormScreen()),
                    );
                    if (created != null && context.mounted) {
                      setState(() => _future = _load());
                    }
                  },
                )
              else
                Padding(
                  padding: const EdgeInsets.only(left: 16, bottom: 24),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        for (final booking in upcoming)
                          Padding(
                            padding: const EdgeInsets.only(right: 12),
                            child: _bookingCard(context, booking),
                          ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 80),
            ],
          );
        },
      ),
    );
  }

  Widget _statCard({required String label, required String value}) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: brand?.cardShadow ?? Theme.of(context).shadowColor,
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              softWrap: false,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: scheme.primary,
                    fontWeight: FontWeight.w800,
                  ),
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
    );
  }

  Widget _bookingCard(BuildContext context, Booking booking) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    return SizedBox(
      width: 260,
      height: 130,
      child: Material(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(20),
        elevation: 0,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.of(context).push(
              slidePageRoute(BookingDetailsScreen(booking: booking)),
            );
          },
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: brand?.cardShadow ?? Theme.of(context).shadowColor,
                  blurRadius: 16,
                  offset: const Offset(0, 8),
                ),
              ],
              color: scheme.surface,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    AvatarWidget(name: booking.customerName, size: 36),
                    const SizedBox(width: 10),
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
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            booking.serviceType,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: scheme.onSurfaceVariant,
                                    ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Row(
                  children: [
                    Icon(Icons.calendar_today,
                        size: 14, color: scheme.onSurfaceVariant),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        '${booking.bookingDate} • ${booking.bookingTime}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.bottomRight,
                  child: Text(
                    formatMoney(booking.total),
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _greetingLine() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }

  String _displayName(String businessName) {
    var name = businessName.trim();
    name = name.replaceFirst(
      RegExp(r'^owner\s*-\s*', caseSensitive: false),
      '',
    );
    if (name.isEmpty) return 'there';
    if (name.length > 20) {
      final parts = name.split(RegExp(r'\s+'));
      if (parts.isNotEmpty && parts.first.isNotEmpty) {
        name = parts.first;
      }
    }
    return name;
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

  List<Booking> _upcomingBookings(List<Booking> bookings) {
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);
    final upcoming = bookings.where((booking) {
      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) return false;
      final dateOnly = DateTime(date.year, date.month, date.day);
      return !dateOnly.isBefore(todayOnly);
    }).toList();
    upcoming.sort(
      (a, b) => '${a.bookingDate} ${a.bookingTime}'.compareTo(
        '${b.bookingDate} ${b.bookingTime}',
      ),
    );
    return upcoming.take(8).toList();
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

class _OverviewLoading extends StatelessWidget {
  const _OverviewLoading();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: EdgeInsets.zero,
      children: const [
        SizedBox(height: 12),
        LoadingShimmerHorizontal(),
        SizedBox(height: 16),
        LoadingShimmerList(itemCount: 3),
      ],
    );
  }
}
