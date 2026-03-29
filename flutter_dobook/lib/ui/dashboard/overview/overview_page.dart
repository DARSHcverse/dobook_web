import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/bookings_page.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
import 'package:dobook/ui/shared/widgets/booking_card.dart';
import 'package:dobook/ui/shared/widgets/empty_state.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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

    return Scaffold(
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return _errorState(
                context,
                snapshot.error?.toString() ?? 'Failed to load bookings.',
              );
            }
            return const _OverviewLoading();
          }

          final bookings = snapshot.data!;
          final stats = _computeStats(bookings);
          final monthlySeries = _buildMonthlySeries(bookings);
          final recentBookings = _recentBookings(bookings);

          return ListView(
            padding: EdgeInsets.zero,
            children: [
              _HeroSection(
                greeting: _greetingLine(),
                firstName: _firstName(business.businessName),
                stats: stats,
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _MetricCard(
                      title: 'Revenue',
                      subtitle: 'Last 6 months',
                      child: SizedBox(
                        height: 180,
                        child: _RevenueChart(series: monthlySeries),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _MetricCard(
                      title: 'Bookings Trend',
                      subtitle: 'Last 6 months',
                      child: SizedBox(
                        height: 140,
                        child: _BookingsTrendChart(series: monthlySeries),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        Text(
                          'Recent Bookings',
                          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                                fontSize: 20,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const Spacer(),
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              slidePageRoute(const BookingsPage()),
                            );
                          },
                          child: Text(
                            'See all →',
                            style:
                                Theme.of(context).textTheme.labelLarge?.copyWith(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFFBE002B),
                                    ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (recentBookings.isEmpty)
                      EmptyState(
                        icon: Icons.event_busy,
                        title: 'No bookings yet',
                        subtitle: 'Bookings will appear here once created.',
                        actionLabel: 'Add your first booking',
                        onAction: () async {
                          final created = await Navigator.of(context).push<Booking?>(
                            slidePageRoute(const BookingFormScreen()),
                          );
                          if (created != null && context.mounted) {
                            setState(() => _future = _load());
                          }
                        },
                      )
                    else
                      Column(
                        children: [
                          for (final booking in recentBookings)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: BookingCard(
                                booking: booking,
                                onTap: () {
                                  Navigator.of(context).push(
                                    slidePageRoute(
                                      BookingDetailsScreen(booking: booking),
                                    ),
                                  );
                                },
                              ),
                            ),
                        ],
                      ),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _errorState(BuildContext context, String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 40,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(height: 12),
            Text(
              'Unable to load overview',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => setState(() => _future = _load()),
              child: const Text('Try again'),
            ),
          ],
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

  String _firstName(String businessName) {
    final cleaned = businessName
        .trim()
        .replaceFirst(RegExp(r'^owner\s*-\s*', caseSensitive: false), '');
    if (cleaned.isEmpty) return 'there';
    return cleaned.split(RegExp(r'\s+')).first;
  }

  _OverviewStats _computeStats(List<Booking> bookings) {
    var revenue = 0.0;
    var upcoming = 0;
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    for (final booking in bookings) {
      final cancelled = _isCancelled(booking);
      if (!cancelled) {
        revenue += booking.total;
      }

      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null || cancelled) continue;
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

  List<_MonthlySeries> _buildMonthlySeries(List<Booking> bookings) {
    final buckets = _buildMonthBuckets();
    final byKey = {for (final bucket in buckets) bucket.key: bucket};

    for (final booking in bookings) {
      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) continue;

      final bucket = byKey[_monthKey(date)];
      if (bucket == null) continue;

      bucket.bookings += 1;
      if (!_isCancelled(booking)) {
        bucket.revenue += booking.total;
      }
    }

    return buckets;
  }

  List<_MonthlySeries> _buildMonthBuckets() {
    final now = DateTime.now();
    return List<_MonthlySeries>.generate(6, (index) {
      final date = DateTime(now.year, now.month - (5 - index), 1);
      return _MonthlySeries(
        key: _monthKey(date),
        label: DateFormat('MMM').format(date),
      );
    });
  }

  String _monthKey(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    return '${date.year}-$month';
  }

  List<Booking> _recentBookings(List<Booking> bookings) {
    final sorted = List<Booking>.from(bookings)
      ..sort((a, b) => _sortDate(b).compareTo(_sortDate(a)));
    return sorted.take(5).toList();
  }

  DateTime _sortDate(Booking booking) {
    final createdAt = DateTime.tryParse(booking.createdAt);
    if (createdAt != null) return createdAt;

    final dateTime = DateTime.tryParse(
      '${booking.bookingDate}T${booking.bookingTime}',
    );
    if (dateTime != null) return dateTime;

    final date = DateTime.tryParse(booking.bookingDate);
    return date ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  bool _isCancelled(Booking booking) {
    return booking.status.trim().toLowerCase() == 'cancelled';
  }

  Future<List<Booking>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getBookings(token);
  }
}

class _HeroSection extends StatelessWidget {
  const _HeroSection({
    required this.greeting,
    required this.firstName,
    required this.stats,
  });

  final String greeting;
  final String firstName;
  final _OverviewStats stats;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return SizedBox(
      height: 288,
      child: Stack(
        children: [
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            height: 220,
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Color(0xFFBE002B),
                    Color(0xFF8B0000),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.vertical(
                  bottom: Radius.circular(32),
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 60),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Align(
                        alignment: Alignment.topRight,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.14),
                            ),
                          ),
                          child: Icon(
                            Icons.book_online_rounded,
                            size: 20,
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        greeting,
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                              fontSize: 16,
                              fontWeight: FontWeight.w400,
                              color: Colors.white,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        firstName,
                        style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                              fontSize: 26,
                              fontWeight: FontWeight.w800,
                              color: scheme.onPrimary,
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            top: 192,
            child: Row(
              children: [
                Expanded(
                  child: _StatCard(
                    value: stats.totalBookings.toString(),
                    label: 'Total',
                    valueColor: const Color(0xFF191C1D),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    value: stats.upcoming.toString(),
                    label: 'Upcoming',
                    valueColor: const Color(0xFFBE002B),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _StatCard(
                    value: _formatSummaryRevenue(stats.revenue),
                    label: 'Revenue',
                    valueColor: const Color(0xFFBE002B),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _formatSummaryRevenue(double value) {
    if (value >= 100000) {
      return NumberFormat.compactCurrency(
        symbol: '\$',
        decimalDigits: 1,
      ).format(value);
    }
    return NumberFormat.currency(
      symbol: '\$',
      decimalDigits: 0,
    ).format(value);
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.value,
    required this.label,
    required this.valueColor,
  });

  final String value;
  final String label;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F000000),
            blurRadius: 12,
            offset: Offset(0, 4),
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
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: valueColor,
                  ),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  fontSize: 12,
                  color: const Color(0xFF5D3F3F),
                ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.subtitle,
    required this.child,
  });

  final String title;
  final String subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12191C1D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const Spacer(),
              Text(
                subtitle,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontSize: 12,
                      color: const Color(0xFF94A3B8),
                    ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

class _RevenueChart extends StatelessWidget {
  const _RevenueChart({required this.series});

  final List<_MonthlySeries> series;

  @override
  Widget build(BuildContext context) {
    final axis = _revenueAxis(series);
    final emptyBarHeight = axis.maxY <= 2000
        ? 160.0
        : (axis.maxY * 0.04).clamp(120.0, 320.0).toDouble();

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: axis.maxY,
        barTouchData: BarTouchData(enabled: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: axis.interval,
          getDrawingHorizontalLine: (_) => const FlLine(
            color: Color(0xFFE7E8E9),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 40,
              interval: axis.interval,
              getTitlesWidget: (value, _) {
                return Text(
                  _formatMoneyTick(value),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: const Color(0xFF5D3F3F),
                      ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, _) {
                final index = value.toInt();
                if (index < 0 || index >= series.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    series[index].label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: const Color(0xFF5D3F3F),
                        ),
                  ),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        barGroups: List.generate(series.length, (index) {
          final item = series[index];
          final hasRevenue = item.revenue > 0;
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: hasRevenue ? item.revenue : emptyBarHeight,
                width: 18,
                color: hasRevenue
                    ? const Color(0xFFBE002B)
                    : const Color(0xFFF3F4F5),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
            ],
          );
        }),
      ),
    );
  }

  static _AxisScale _revenueAxis(List<_MonthlySeries> series) {
    final maxRevenue = series.fold<double>(
      0,
      (current, item) => item.revenue > current ? item.revenue : current,
    );
    final maxY = maxRevenue <= 0
        ? 10000.0
        : ((maxRevenue / 2000).ceil() * 2000).toDouble();
    return _AxisScale(maxY: maxY, interval: 2000.0);
  }

  static String _formatMoneyTick(double value) {
    if (value <= 0) return '\$0';
    return '\$${(value / 1000).round()}k';
  }
}

class _BookingsTrendChart extends StatelessWidget {
  const _BookingsTrendChart({required this.series});

  final List<_MonthlySeries> series;

  @override
  Widget build(BuildContext context) {
    final axis = _countAxis(series);

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: axis.maxY,
        lineTouchData: const LineTouchData(enabled: false),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: axis.interval,
          getDrawingHorizontalLine: (_) => const FlLine(
            color: Color(0xFFE7E8E9),
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              interval: axis.interval,
              getTitlesWidget: (value, _) {
                return Text(
                  value.toInt().toString(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: const Color(0xFF5D3F3F),
                      ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, _) {
                final index = value.toInt();
                if (index < 0 || index >= series.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    series[index].label,
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: const Color(0xFF5D3F3F),
                        ),
                  ),
                );
              },
            ),
          ),
          topTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          rightTitles: const AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: [
              for (var index = 0; index < series.length; index++)
                FlSpot(index.toDouble(), series[index].bookings.toDouble()),
            ],
            isCurved: true,
            curveSmoothness: 0.25,
            color: const Color(0xFFBE002B),
            barWidth: 3,
            isStrokeCapRound: true,
            belowBarData: BarAreaData(
              show: true,
              color: const Color(0xFFBE002B).withValues(alpha: 0.1),
            ),
            dotData: FlDotData(
              show: true,
              getDotPainter: (spot, _, barData, index) => FlDotCirclePainter(
                radius: 4,
                color: const Color(0xFFBE002B),
                strokeWidth: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static _AxisScale _countAxis(List<_MonthlySeries> series) {
    final rawMax = series.fold<int>(
      0,
      (current, item) => item.bookings > current ? item.bookings : current,
    );
    if (rawMax <= 4) {
      return const _AxisScale(maxY: 4.0, interval: 1.0);
    }
    if (rawMax <= 8) {
      return const _AxisScale(maxY: 8.0, interval: 2.0);
    }
    final interval = (rawMax / 4).ceilToDouble();
    final maxY = (rawMax / interval).ceilToDouble() * interval;
    return _AxisScale(maxY: maxY, interval: interval);
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

class _MonthlySeries {
  _MonthlySeries({
    required this.key,
    required this.label,
  })  : revenue = 0,
        bookings = 0;

  final String key;
  final String label;
  double revenue;
  int bookings;
}

class _AxisScale {
  const _AxisScale({
    required this.maxY,
    required this.interval,
  });

  final double maxY;
  final double interval;
}

class _OverviewLoading extends StatelessWidget {
  const _OverviewLoading();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        child: Column(
          children: [
            Container(
              height: 220,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [
                    Color(0xFFBE002B),
                    Color(0xFF8B0000),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(32),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -28),
              child: Row(
                children: const [
                  Expanded(child: _LoadingStatCard()),
                  SizedBox(width: 10),
                  Expanded(child: _LoadingStatCard()),
                  SizedBox(width: 10),
                  Expanded(child: _LoadingStatCard()),
                ],
              ),
            ),
            const SizedBox(height: 4),
            _loadingMetricCard(context, height: 180),
            const SizedBox(height: 16),
            _loadingMetricCard(context, height: 140),
            const SizedBox(height: 24),
            LoadingShimmerList(
              itemCount: 3,
              padding: EdgeInsets.zero,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _loadingMetricCard(BuildContext context, {required double height}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x12191C1D),
            blurRadius: 18,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ShimmerLine(width: 120, height: 16),
          const SizedBox(height: 8),
          const ShimmerLine(width: 90, height: 12),
          const SizedBox(height: 16),
          ShimmerBox(
            width: double.infinity,
            height: height,
            radius: BorderRadius.circular(12),
          ),
        ],
      ),
    );
  }
}

class _LoadingStatCard extends StatelessWidget {
  const _LoadingStatCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1F000000),
            blurRadius: 12,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShimmerLine(width: 52, height: 20),
          SizedBox(height: 8),
          ShimmerLine(width: 60, height: 12),
        ],
      ),
    );
  }
}
