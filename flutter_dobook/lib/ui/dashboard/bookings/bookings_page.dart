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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AppSession>();
    final business = session.business!;

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
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final created = await Navigator.of(context).push<Booking?>(
            MaterialPageRoute(builder: (_) => const BookingFormScreen()),
          );
          if (created != null && context.mounted) {
            _triggerReload();
          }
        },
        child: const Icon(Icons.add),
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
                  MaterialPageRoute(builder: (_) => const BookingFormScreen()),
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
                  return TextField(
                    decoration: const InputDecoration(
                      hintText: 'Search by customer name or email',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                  );
                }

                if (i == 1) {
                  return Wrap(
                    spacing: 8,
                    children: [
                      _filterChip('All', BookingFilter.all),
                      _filterChip('Upcoming', BookingFilter.upcoming),
                      _filterChip('Past', BookingFilter.past),
                      _filterChip('Cancelled', BookingFilter.cancelled),
                    ],
                  );
                }

                final b = filtered[i - 2];
                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () async {
                      final result =
                          await Navigator.of(context).push<String?>(
                        MaterialPageRoute(
                          builder: (_) => BookingDetailsScreen(booking: b),
                        ),
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
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  b.customerName.isEmpty
                                      ? '(No name)'
                                      : b.customerName,
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  b.customerEmail.isEmpty
                                      ? 'No email'
                                      : b.customerEmail,
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onSurfaceVariant,
                                      ),
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  '${b.bookingDate} • ${b.bookingTime} • ${b.serviceType}',
                                  style:
                                      Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                formatMoney(b.total),
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(height: 8),
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
    final filtered = bookings.where((b) {
      if (query.isEmpty) return true;
      final name = b.customerName.toLowerCase();
      final email = b.customerEmail.toLowerCase();
      return name.contains(query) || email.contains(query);
    }).toList();

    if (_filter == BookingFilter.all) return filtered;

    final today = DateTime.now();
    final todayOnly = DateTime(today.year, today.month, today.day);

    return filtered.where((b) {
      final status = b.status.toLowerCase();
      final isCancelled = status == 'cancelled';
      if (_filter == BookingFilter.cancelled) return isCancelled;
      if (isCancelled) return false;

      final date = DateTime.tryParse(b.bookingDate);
      if (date == null) {
        return _filter == BookingFilter.upcoming;
      }
      final dateOnly = DateTime(date.year, date.month, date.day);

      if (_filter == BookingFilter.upcoming) {
        return !dateOnly.isBefore(todayOnly);
      }
      if (_filter == BookingFilter.past) {
        return dateOnly.isBefore(todayOnly);
      }
      return true;
    }).toList();
  }

  Widget _filterChip(String label, BookingFilter filter) {
    return ChoiceChip(
      label: Text(label),
      selected: _filter == filter,
      onSelected: (selected) {
        if (selected) {
          setState(() => _filter = filter);
        }
      },
    );
  }

}
