import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
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
            return const Center(child: CircularProgressIndicator());
          }

          final bookings = snapshot.data!;
          if (bookings.isEmpty) {
            return const Center(child: Text('No bookings yet.'));
          }

          final filtered = _applyFilters(bookings);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.only(bottom: 88),
              itemCount: filtered.length + 2,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, i) {
                if (i == 0) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                    child: TextField(
                      decoration: const InputDecoration(
                        hintText: 'Search by customer name or email',
                        prefixIcon: Icon(Icons.search),
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (value) {
                        setState(() => _searchQuery = value);
                      },
                    ),
                  );
                }

                if (i == 1) {
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Wrap(
                      spacing: 8,
                      children: [
                        _filterChip('All', BookingFilter.all),
                        _filterChip('Upcoming', BookingFilter.upcoming),
                        _filterChip('Past', BookingFilter.past),
                        _filterChip('Cancelled', BookingFilter.cancelled),
                      ],
                    ),
                  );
                }

                final b = filtered[i - 2];
                return ListTile(
                  title: Text(
                    b.customerName.isEmpty ? '(No name)' : b.customerName,
                  ),
                  subtitle: Text(
                    '${b.bookingDate} • ${b.bookingTime} • ${b.serviceType}',
                  ),
                  trailing: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(formatMoney(b.total)),
                      const SizedBox(height: 6),
                      _statusBadge(b.status),
                    ],
                  ),
                  onTap: () async {
                    final result = await Navigator.of(context).push<String?>(
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

  Widget _statusBadge(String status) {
    final value = status.toLowerCase();
    Color background;
    Color foreground;
    String label;

    if (value == 'cancelled') {
      background = Colors.red.shade100;
      foreground = Colors.red.shade700;
      label = 'Cancelled';
    } else if (value == 'completed') {
      background = Colors.grey.shade300;
      foreground = Colors.grey.shade800;
      label = 'Completed';
    } else {
      background = Colors.green.shade100;
      foreground = Colors.green.shade700;
      label = 'Confirmed';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
