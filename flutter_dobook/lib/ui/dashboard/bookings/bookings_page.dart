import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/empty_state.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/ui/shared/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key});

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

enum BookingFilter { all, upcoming, past, cancelled }

class _BookingsPageState extends State<BookingsPage> {
  Future<List<Booking>>? _future;
  String _searchQuery = '';
  BookingFilter _filter = BookingFilter.all;
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business!;
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();

    return Scaffold(
      appBar: AppBar(
        title: Text(
          business.businessName.isEmpty ? 'Bookings' : business.businessName,
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _triggerReload,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await Navigator.of(context).push<Booking?>(
            slidePageRoute(const BookingFormScreen()),
          );
          if (created != null && context.mounted) {
            _triggerReload();
          }
        },
        icon: const Icon(Icons.add),
        label: const Text('+ New Booking'),
      ),
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
          if (bookings.isEmpty) {
            return EmptyState(
              icon: Icons.event_busy,
              title: 'No bookings yet',
              subtitle: 'Bookings will appear here once created.',
              actionLabel: 'Add your first booking',
              onAction: () async {
                final created = await Navigator.of(context).push<Booking?>(
                  slidePageRoute(const BookingFormScreen()),
                );
                if (created != null && context.mounted) {
                  _triggerReload();
                }
              },
            );
          }

          final filtered = _applyFilters(bookings);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
              itemCount: filtered.length + 2,
              separatorBuilder: (context, index) =>
                  index < 2 ? const SizedBox(height: 12) : const SizedBox(height: 8),
              itemBuilder: (context, i) {
                if (i == 0) {
                  return Container(
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: TextField(
                      controller: _searchCtrl,
                      decoration: InputDecoration(
                        filled: false,
                        hintText: 'Search by customer name or email',
                        prefixIcon: Icon(Icons.search, color: scheme.onSurfaceVariant),
                        suffixIcon: _searchQuery.isEmpty
                            ? null
                            : IconButton(
                                icon: Icon(Icons.close, color: scheme.onSurfaceVariant),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _searchQuery = '');
                                },
                              ),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                      ),
                      onChanged: (value) {
                        setState(() => _searchQuery = value);
                      },
                    ),
                  );
                }

                if (i == 1) {
                  return SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _filterChip('All', BookingFilter.all),
                        const SizedBox(width: 8),
                        _filterChip('Upcoming', BookingFilter.upcoming),
                        const SizedBox(width: 8),
                        _filterChip('Past', BookingFilter.past),
                        const SizedBox(width: 8),
                        _filterChip('Cancelled', BookingFilter.cancelled),
                      ],
                    ),
                  );
                }

                final b = filtered[i - 2];
                final accent = StatusBadge.accentColor(context, b.status);
                final isLight = Theme.of(context).brightness == Brightness.light;
                final cardShadow = BoxShadow(
                  color: isLight
                      ? Colors.black.withValues(alpha: 0.06)
                      : (brand?.cardShadow ?? Theme.of(context).shadowColor),
                  blurRadius: isLight ? 8 : 12,
                  offset: isLight ? const Offset(0, 2) : const Offset(0, 6),
                );
                return Container(
                  decoration: BoxDecoration(
                    color: scheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      cardShadow,
                    ],
                    border: Border(
                      left: BorderSide(color: accent, width: 3),
                    ),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(16),
                    onTap: () async {
                      final result = await Navigator.of(context)
                          .push<String?>(
                        slidePageRoute(BookingDetailsScreen(booking: b)),
                      );
                      if (!context.mounted) return;
                      if (result != null) {
                        _triggerReload();
                        if (result == 'cancelled') {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Booking cancelled')),
                          );
                        }
                      }
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          AvatarWidget(name: b.customerName, size: 44),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.customerName.isEmpty
                                      ? '(No name)'
                                      : b.customerName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.copyWith(fontSize: 15),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  b.customerEmail.isEmpty
                                      ? 'No email'
                                      : b.customerEmail,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
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
                                        b.bookingDate,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: scheme.onSurfaceVariant,
                                            ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Icon(
                                      Icons.schedule,
                                      size: 12,
                                      color: scheme.onSurfaceVariant,
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        b.bookingTime,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall
                                            ?.copyWith(
                                              color: scheme.onSurfaceVariant,
                                            ),
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
                            mainAxisAlignment: MainAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                formatMoney(b.total),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                      color: scheme.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(height: 6),
                              StatusBadge(status: b.status),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  Widget _filterChip(String label, BookingFilter filter) {
    final scheme = Theme.of(context).colorScheme;
    final isSelected = _filter == filter;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: scheme.primary,
      labelStyle: Theme.of(context).textTheme.labelLarge?.copyWith(
            color: isSelected ? scheme.onPrimary : scheme.onSurfaceVariant,
          ),
      backgroundColor: scheme.surface,
      shape: StadiumBorder(
        side: BorderSide(
          color: isSelected ? scheme.primary : scheme.outlineVariant,
        ),
      ),
      onSelected: (selected) {
        if (selected) {
          setState(() => _filter = filter);
        }
      },
    );
  }

  Future<List<Booking>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getBookings(token);
  }

  void _triggerReload() {
    final next = _load();
    setState(() {
      _future = next;
    });
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _future = next;
    });
    await next;
  }

  List<Booking> _applyFilters(List<Booking> bookings) {
    final query = _searchQuery.trim().toLowerCase();
    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    return bookings.where((b) {
      if (query.isNotEmpty) {
        final name = b.customerName.toLowerCase();
        final email = b.customerEmail.toLowerCase();
        if (!name.contains(query) && !email.contains(query)) {
          return false;
        }
      }

      if (_filter == BookingFilter.all) return true;
      if (_filter == BookingFilter.cancelled) {
        return b.status.toLowerCase() == 'cancelled';
      }

      final date = DateTime.tryParse(b.bookingDate);
      if (date == null) return false;
      final dateOnly = DateTime(date.year, date.month, date.day);

      if (_filter == BookingFilter.upcoming) {
        return !dateOnly.isBefore(todayOnly);
      }
      if (_filter == BookingFilter.past) {
        return dateOnly.isBefore(todayOnly) && b.status.toLowerCase() != 'cancelled';
      }
      return true;
    }).toList();
  }
}
