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
import 'package:dobook/ui/shared/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
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
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();

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
          final upcoming = _upcomingBookings(bookings);
          final revenueByMonth = getMonthlyRevenue(bookings);
          final countByMonth = getMonthlyCount(bookings);
          final monthLabels = revenueByMonth.keys.toList();
          final revenueValues = revenueByMonth.values.toList();
          final countValues =
              monthLabels.map((label) => countByMonth[label] ?? 0).toList();
          final hasChartData = bookings.isNotEmpty;

          return ListView(
            padding: EdgeInsets.zero,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    height: 260,
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
                        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Image.asset(
                                  'assets/brand/dobook-logo.png',
                                  height: 24,
                                  color: scheme.onPrimary,
                                  colorBlendMode: BlendMode.srcIn,
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              _greetingLine(),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.copyWith(
                                    color: scheme.onPrimary
                                        .withValues(alpha: 0.85),
                                    fontSize: 16,
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
                                    fontSize: 26,
                                  ),
                            ),
                            // 60px space reserved for stats card overlap
                            const SizedBox(height: 60),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: -30,
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final cardWidth = (constraints.maxWidth - 48) / 3;
                        return Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _statCard(
                              label: 'Total Bookings',
                              value: stats.totalBookings.toString(),
                              width: cardWidth,
                            ),
                            _statCard(
                              label: 'Upcoming',
                              value: stats.upcoming.toString(),
                              width: cardWidth,
                            ),
                            _statCard(
                              label: 'Revenue',
                              value: formatMoney(stats.revenue),
                              width: cardWidth,
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 58),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _chartCard(
                      context,
                      title: 'Revenue Overview',
                      subtitle: 'Last 6 months',
                      child: hasChartData
                          ? SizedBox(
                              height: 220,
                              child: _buildRevenueChart(
                                context,
                                monthLabels,
                                revenueValues,
                              ),
                            )
                          : _emptyChartState(context),
                    ),
                    const SizedBox(height: 16),
                    _chartCard(
                      context,
                      title: 'Bookings Trend',
                      subtitle: 'Last 6 months',
                      child: hasChartData
                          ? SizedBox(
                              height: 200,
                              child: _buildBookingsChart(
                                context,
                                monthLabels,
                                countValues,
                              ),
                            )
                          : _emptyChartState(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Text(
                      'Recent Bookings',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
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
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      for (final booking in upcoming)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: _bookingCard(context, booking),
                        ),
                    ],
                  ),
                ),
              const SizedBox(height: 80),
            ],
          );
        },
      ),
    );
  }

  Widget _statCard({
    required String label,
    required String value,
    double? width,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final card = Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isLight
                ? Colors.black.withValues(alpha: 0.16)
                : (brand?.cardShadow ?? Theme.of(context).shadowColor),
            blurRadius: isLight ? 18 : 16,
            offset: isLight ? const Offset(0, 8) : const Offset(0, 8),
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
    if (width == null) return card;
    return SizedBox(width: width, child: card);
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

  Widget _chartCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final isLight = Theme.of(context).brightness == Brightness.light;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: isLight
                ? Colors.black.withValues(alpha: 0.08)
                : (brand?.cardShadow ?? Theme.of(context).shadowColor),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _emptyChartState(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return SizedBox(
      height: 160,
      child: Center(
        child: Text(
          'No data yet',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
        ),
      ),
    );
  }

  /// Returns a clean rounded maxY and interval for the Y-axis.
  /// E.g. max=$8810 → maxY=10000, interval=2000
  ({double maxY, double interval}) _cleanAxis(double rawMax) {
    if (rawMax <= 0) return (maxY: 100.0, interval: 25.0);
    // Round up to a clean ceiling
    final steps = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (final step in steps) {
      final top = (rawMax / step).ceilToDouble() * step;
      if (top / step <= 8) {
        return (maxY: top, interval: step.toDouble());
      }
    }
    final step = (rawMax / 5).ceilToDouble();
    return (maxY: step * 5, interval: step);
  }

  String _formatYAxis(double value) {
    if (value == 0) return '\$0';
    if (value >= 1000) {
      final k = value / 1000;
      return '\$${k % 1 == 0 ? k.toInt() : k.toStringAsFixed(1)}k';
    }
    return '\$${value.toInt()}';
  }

  Widget _buildRevenueChart(
    BuildContext context,
    List<String> labels,
    List<double> values,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final rawMax = _maxValue(values);
    final axis = _cleanAxis(rawMax);
    return BarChart(
      BarChartData(
        maxY: axis.maxY,
        barGroups: List.generate(values.length, (index) {
          return BarChartGroupData(
            x: index,
            barRods: [
              BarChartRodData(
                toY: values[index],
                color: scheme.primary,
                width: 16,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(6),
                  topRight: Radius.circular(6),
                ),
              ),
            ],
          );
        }),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: axis.interval,
          getDrawingHorizontalLine: (value) => FlLine(
            color: scheme.outlineVariant,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 44,
              interval: axis.interval,
              getTitlesWidget: (value, meta) {
                // Only show labels that fall exactly on the interval
                if (value > axis.maxY) return const SizedBox.shrink();
                return Text(
                  _formatYAxis(value),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= labels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labels[idx],
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                );
              },
            ),
          ),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
      ),
    );
  }

  Widget _buildBookingsChart(
    BuildContext context,
    List<String> labels,
    List<int> values,
  ) {
    final scheme = Theme.of(context).colorScheme;
    final maxValue = values.isEmpty
        ? 1
        : values.reduce((a, b) => a > b ? a : b);
    return LineChart(
      LineChartData(
        maxY: maxValue <= 0 ? 1 : maxValue.toDouble() * 1.4,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxValue <= 0 ? 1 : maxValue / 4,
          getDrawingHorizontalLine: (value) => FlLine(
            color: scheme.outlineVariant,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              interval: maxValue <= 0 ? 1 : (maxValue / 4).ceilToDouble(),
              getTitlesWidget: (value, meta) {
                return Text(
                  value.toInt().toString(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                final idx = value.toInt();
                if (idx < 0 || idx >= labels.length) {
                  return const SizedBox.shrink();
                }
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    labels[idx],
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                );
              },
            ),
          ),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        lineBarsData: [
          LineChartBarData(
            spots: List.generate(values.length, (index) {
              return FlSpot(index.toDouble(), values[index].toDouble());
            }),
            isCurved: true,
            color: scheme.primary,
            barWidth: 3,
            dotData: FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: scheme.primary.withValues(alpha: 0.1),
            ),
          ),
        ],
      ),
    );
  }

  double _maxValue(List<double> values) {
    if (values.isEmpty) return 0;
    var max = values.first;
    for (final value in values) {
      if (value > max) max = value;
    }
    return max;
  }

  Widget _bookingCard(BuildContext context, Booking booking) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final isLight = Theme.of(context).brightness == Brightness.light;
    final accent = StatusBadge.accentColor(context, booking.status);
    return Container(
      decoration: BoxDecoration(
        color: isLight ? Colors.white : scheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border(left: BorderSide(color: accent, width: 3)),
        boxShadow: [
          BoxShadow(
            color: isLight
                ? Colors.black.withValues(alpha: 0.06)
                : (brand?.cardShadow ?? Theme.of(context).shadowColor),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            slidePageRoute(BookingDetailsScreen(booking: booking)),
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AvatarWidget(name: booking.customerName, size: 44),
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
                      style: Theme.of(context)
                          .textTheme
                          .titleMedium
                          ?.copyWith(fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      booking.serviceType,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(
                          Icons.calendar_today,
                          size: 12,
                          color: scheme.onSurfaceVariant,
                        ),
                        const SizedBox(width: 4),
                        Flexible(
                          child: Text(
                            '${booking.bookingDate}  ${booking.bookingTime}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(color: scheme.onSurfaceVariant),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    formatMoney(booking.total),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 6),
                  StatusBadge(status: booking.status),
                ],
              ),
            ],
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

  Map<String, double> getMonthlyRevenue(List<Booking> bookings) {
    final buckets = _buildMonthBuckets();
    final byKey = {for (final bucket in buckets) bucket.key: bucket};

    for (final booking in bookings) {
      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) continue;
      final key = _monthKey(date);
      final bucket = byKey[key];
      if (bucket == null) continue;
      bucket.revenue += booking.total;
    }

    return {
      for (final bucket in buckets) bucket.label: bucket.revenue,
    };
  }

  Map<String, int> getMonthlyCount(List<Booking> bookings) {
    final buckets = _buildMonthBuckets();
    final byKey = {for (final bucket in buckets) bucket.key: bucket};

    for (final booking in bookings) {
      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) continue;
      final key = _monthKey(date);
      final bucket = byKey[key];
      if (bucket == null) continue;
      bucket.count += 1;
    }

    return {
      for (final bucket in buckets) bucket.label: bucket.count,
    };
  }

  List<_MonthBucket> _buildMonthBuckets() {
    final now = DateTime.now();
    final months = List<DateTime>.generate(
      6,
      (index) => DateTime(now.year, now.month - (5 - index), 1),
    );

    return months
        .map(
          (date) => _MonthBucket(
            key: _monthKey(date),
            label: _monthLabel(date),
          ),
        )
        .toList();
  }

  String _monthKey(DateTime date) {
    final month = date.month.toString().padLeft(2, '0');
    return '${date.year}-$month';
  }

  String _monthLabel(DateTime date) {
    return DateFormat('MMM').format(date);
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

class _MonthBucket {
  _MonthBucket({
    required this.key,
    required this.label,
  })  : revenue = 0,
        count = 0;

  final String key;
  final String label;
  double revenue;
  int count;
}

class _OverviewLoading extends StatelessWidget {
  const _OverviewLoading();

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Column(
        children: [
          const SizedBox(height: 12),
          const LoadingShimmerHorizontal(),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _chartShimmerCard(context, height: 180),
                const SizedBox(height: 16),
                _chartShimmerCard(context, height: 160),
              ],
            ),
          ),
          const SizedBox(height: 16),
          LoadingShimmerList(
            itemCount: 3,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
          ),
        ],
      ),
    );
  }

  Widget _chartShimmerCard(BuildContext context, {required double height}) {
    final scheme = Theme.of(context).colorScheme;
    return LayoutBuilder(
      builder: (context, constraints) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: scheme.surface,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.06),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ShimmerLine(width: 140, height: 14),
              const SizedBox(height: 6),
              const ShimmerLine(width: 100, height: 12),
              const SizedBox(height: 14),
              ShimmerBox(
                width: constraints.maxWidth,
                height: height,
                radius: BorderRadius.circular(12),
              ),
            ],
          ),
        );
      },
    );
  }
}
