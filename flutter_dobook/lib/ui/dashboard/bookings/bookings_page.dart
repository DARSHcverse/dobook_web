import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/dashboard/bookings/booking_form_screen.dart';
import 'package:dobook/ui/shared/widgets/booking_card.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
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
    final business = context.watch<AppSession>().business!;

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: Text(
          business.businessName.isEmpty ? 'Bookings' : business.businessName,
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _triggerReload,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      floatingActionButton: _GradientAddBookingFab(
        onTap: () async {
          final created = await Navigator.of(context).push<Booking?>(
            slidePageRoute(const BookingFormScreen()),
          );
          if (created != null && context.mounted) {
            _triggerReload();
          }
        },
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
            return const _BookingsLoadingState();
          }

          final filtered = _applyFilters(snapshot.data!);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: _SearchBar(
                    controller: _searchCtrl,
                    query: _searchQuery,
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                    onClear: () {
                      _searchCtrl.clear();
                      setState(() => _searchQuery = '');
                    },
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: SizedBox(
                    height: 38,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _FilterPill(
                          label: 'All',
                          selected: _filter == BookingFilter.all,
                          onTap: () => setState(() => _filter = BookingFilter.all),
                        ),
                        const SizedBox(width: 8),
                        _FilterPill(
                          label: 'Upcoming',
                          selected: _filter == BookingFilter.upcoming,
                          onTap: () =>
                              setState(() => _filter = BookingFilter.upcoming),
                        ),
                        const SizedBox(width: 8),
                        _FilterPill(
                          label: 'Past',
                          selected: _filter == BookingFilter.past,
                          onTap: () => setState(() => _filter = BookingFilter.past),
                        ),
                        const SizedBox(width: 8),
                        _FilterPill(
                          label: 'Cancelled',
                          selected: _filter == BookingFilter.cancelled,
                          onTap: () =>
                              setState(() => _filter = BookingFilter.cancelled),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  child: filtered.isEmpty
                      ? const _BookingsEmptyState()
                      : Column(
                          children: [
                            for (final booking in filtered)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: BookingCard(
                                  booking: booking,
                                  onTap: () async {
                                    final result = await Navigator.of(context)
                                        .push<String?>(
                                      slidePageRoute(
                                        BookingDetailsScreen(booking: booking),
                                      ),
                                    );
                                    if (!context.mounted || result == null) return;
                                    _triggerReload();
                                    if (result == 'cancelled') {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Booking cancelled'),
                                        ),
                                      );
                                    }
                                  },
                                ),
                              ),
                          ],
                        ),
                ),
              ],
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
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    return bookings.where((booking) {
      if (query.isNotEmpty) {
        final matchesName = booking.customerName.toLowerCase().contains(query);
        final matchesEmail = booking.customerEmail.toLowerCase().contains(query);
        if (!matchesName && !matchesEmail) return false;
      }

      final isCancelled = booking.status.trim().toLowerCase() == 'cancelled';
      if (_filter == BookingFilter.all) return true;
      if (_filter == BookingFilter.cancelled) return isCancelled;

      final date = DateTime.tryParse(booking.bookingDate);
      if (date == null) return false;
      final bookingDate = DateTime(date.year, date.month, date.day);

      if (_filter == BookingFilter.upcoming) {
        return !isCancelled && !bookingDate.isBefore(today);
      }
      if (_filter == BookingFilter.past) {
        return !isCancelled && bookingDate.isBefore(today);
      }
      return true;
    }).toList();
  }
}

class _SearchBar extends StatelessWidget {
  const _SearchBar({
    required this.controller,
    required this.query,
    required this.onChanged,
    required this.onClear,
  });

  final TextEditingController controller;
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: TextField(
        controller: controller,
        onChanged: onChanged,
        decoration: InputDecoration(
          filled: false,
          hintText: 'Find customers...',
          hintStyle: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF94A3B8),
              ),
          prefixIcon: const Icon(
            Icons.search_rounded,
            color: Color(0xFF94A3B8),
          ),
          suffixIcon: query.isEmpty
              ? null
              : IconButton(
                  onPressed: onClear,
                  icon: const Icon(
                    Icons.close_rounded,
                    color: Color(0xFF94A3B8),
                  ),
                ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
      ),
    );
  }
}

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: selected
                ? const Color(0xFFBE002B)
                : const Color(0xFFE7E8E9),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Center(
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: selected ? Colors.white : const Color(0xFF5D3F3F),
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BookingsEmptyState extends StatelessWidget {
  const _BookingsEmptyState();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 420,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFBE002B).withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.calendar_month_rounded,
                size: 34,
                color: Color(0xFFBE002B),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'No bookings found',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF191C1D),
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your bookings will appear here',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    fontSize: 14,
                    color: const Color(0xFF94A3B8),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _BookingsLoadingState extends StatelessWidget {
  const _BookingsLoadingState();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        Container(
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F5),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: const [
            ShimmerLine(width: 72, height: 36, radius: 999),
            SizedBox(width: 8),
            ShimmerLine(width: 110, height: 36, radius: 999),
            SizedBox(width: 8),
            ShimmerLine(width: 76, height: 36, radius: 999),
          ],
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < 5; i++) ...[
          const _BookingCardShimmer(),
          if (i < 4) const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _BookingCardShimmer extends StatelessWidget {
  const _BookingCardShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: const Border(
          left: BorderSide(color: Color(0xFFE7E8E9), width: 5),
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 24,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: const Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShimmerCircle(size: 48),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerLine(width: 120, height: 16),
                SizedBox(height: 8),
                ShimmerLine(width: 180, height: 12),
                SizedBox(height: 10),
                ShimmerLine(width: 150, height: 12),
              ],
            ),
          ),
          SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              ShimmerLine(width: 72, height: 16),
              SizedBox(height: 8),
              ShimmerLine(width: 78, height: 20, radius: 999),
            ],
          ),
        ],
      ),
    );
  }
}

class _GradientAddBookingFab extends StatelessWidget {
  const _GradientAddBookingFab({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFBE002B),
            Color(0xFFE8193C),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(999),
        boxShadow: const [
          BoxShadow(
            color: Color(0x33BE002B),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(999),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add, color: Colors.white),
                const SizedBox(width: 8),
                Text(
                  '+ New Booking',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
