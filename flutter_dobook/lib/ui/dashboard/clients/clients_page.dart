import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/ui/dashboard/clients/client_detail_page.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class ClientsPage extends StatefulWidget {
  const ClientsPage({super.key});

  @override
  State<ClientsPage> createState() => _ClientsPageState();
}

enum ClientFilter { all, active, inactive }

class _ClientsPageState extends State<ClientsPage> {
  Future<List<Client>>? _future;
  String _searchQuery = '';
  ClientFilter _filter = ClientFilter.all;
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
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Clients'),
      ),
      body: FutureBuilder<List<Client>>(
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
            return const _ClientsLoadingState();
          }

          final clients = snapshot.data!;
          final stats = _computeStats(clients);
          final filtered = _applyFilters(clients);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Column(
                    children: [
                      _RevenueHeroCard(stats: stats),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: _ClientStatCard(
                              label: 'Total Clients',
                              value: stats.totalClients.toString(),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _ClientStatCard(
                              label: 'Repeat Clients',
                              value: stats.repeatClients.toString(),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: _ClientsSearchBar(
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
                        _ClientFilterPill(
                          label: 'All',
                          selected: _filter == ClientFilter.all,
                          onTap: () => setState(() => _filter = ClientFilter.all),
                        ),
                        const SizedBox(width: 8),
                        _ClientFilterPill(
                          label: 'Active',
                          selected: _filter == ClientFilter.active,
                          onTap: () =>
                              setState(() => _filter = ClientFilter.active),
                        ),
                        const SizedBox(width: 8),
                        _ClientFilterPill(
                          label: 'Inactive',
                          selected: _filter == ClientFilter.inactive,
                          onTap: () =>
                              setState(() => _filter = ClientFilter.inactive),
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                  child: filtered.isEmpty
                      ? const _ClientsEmptyState()
                      : Column(
                          children: [
                            for (final client in filtered)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: _ClientListCard(client: client),
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

  Future<List<Client>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getClients(token: token);
  }

  Future<void> _refresh() async {
    final next = _load();
    setState(() => _future = next);
    await next;
  }

  List<Client> _applyFilters(List<Client> clients) {
    final query = _searchQuery.trim().toLowerCase();
    final now = DateTime.now();
    final activeThreshold = now.subtract(const Duration(days: 90));

    return clients.where((client) {
      if (query.isNotEmpty) {
        final matchesName = client.name.toLowerCase().contains(query);
        final matchesEmail = client.email.toLowerCase().contains(query);
        if (!matchesName && !matchesEmail) return false;
      }

      final isActive = client.lastBooking.isAfter(activeThreshold);
      if (_filter == ClientFilter.active) return isActive;
      if (_filter == ClientFilter.inactive) return !isActive;
      return true;
    }).toList();
  }

  _ClientStats _computeStats(List<Client> clients) {
    final now = DateTime.now();
    var totalRevenue = 0.0;
    var repeatClients = 0;
    var bookingsThisMonth = 0;

    for (final client in clients) {
      totalRevenue += client.totalSpent;
      if (client.totalBookings > 1) {
        repeatClients += 1;
      }
      if (client.lastBooking.year == now.year &&
          client.lastBooking.month == now.month &&
          client.lastBooking.year > 1971) {
        bookingsThisMonth += 1;
      }
    }

    return _ClientStats(
      totalRevenue: totalRevenue,
      totalClients: clients.length,
      repeatClients: repeatClients,
      bookingsThisMonth: bookingsThisMonth,
    );
  }
}

class _RevenueHeroCard extends StatelessWidget {
  const _RevenueHeroCard({required this.stats});

  final _ClientStats stats;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 140,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFE8193C),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'TOTAL REVENUE',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.5,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
          ),
          const Spacer(),
          Text(
            _formatRevenue(stats.totalRevenue),
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  fontSize: 40,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                Icons.trending_up_rounded,
                size: 14,
                color: Colors.white.withValues(alpha: 0.9),
              ),
              const SizedBox(width: 6),
              Text(
                '+${stats.bookingsThisMonth} bookings this month',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static String _formatRevenue(double amount) {
    if (amount >= 100000) {
      return NumberFormat.compactCurrency(
        symbol: '\$',
        decimalDigits: 1,
      ).format(amount);
    }
    return NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(amount);
  }
}

class _ClientStatCard extends StatelessWidget {
  const _ClientStatCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF5D3F3F),
                ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF191C1D),
                ),
          ),
        ],
      ),
    );
  }
}

class _ClientsSearchBar extends StatelessWidget {
  const _ClientsSearchBar({
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
          hintText: 'Search clients...',
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

class _ClientFilterPill extends StatelessWidget {
  const _ClientFilterPill({
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

class _ClientListCard extends StatefulWidget {
  const _ClientListCard({required this.client});

  final Client client;

  @override
  State<_ClientListCard> createState() => _ClientListCardState();
}

class _ClientListCardState extends State<_ClientListCard> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed == value) return;
    setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    final client = widget.client;
    return AnimatedScale(
      scale: _pressed ? 0.97 : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: Container(
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
              Navigator.of(context).push(
                slidePageRoute(ClientDetailPage(client: client)),
              );
            },
            onTapDown: (_) => _setPressed(true),
            onTapCancel: () => _setPressed(false),
            onTapUp: (_) => _setPressed(false),
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  AvatarWidget(name: client.name, size: 48),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          client.name.isEmpty ? 'Unnamed client' : client.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${client.totalBookings} bookings · ${_formatSpent(client.totalSpent)}',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                fontSize: 12,
                                color: const Color(0xFF94A3B8),
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: Color(0xFFE6BCBB),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  static String _formatSpent(double amount) {
    return NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(amount);
  }
}

class _ClientsEmptyState extends StatelessWidget {
  const _ClientsEmptyState();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 360,
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
                Icons.person_outline_rounded,
                size: 34,
                color: Color(0xFFBE002B),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'No clients yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF191C1D),
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ClientsLoadingState extends StatelessWidget {
  const _ClientsLoadingState();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      children: [
        Container(
          height: 140,
          decoration: BoxDecoration(
            color: const Color(0xFFE8193C).withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: const [
            Expanded(child: _ClientStatShimmer()),
            SizedBox(width: 12),
            Expanded(child: _ClientStatShimmer()),
          ],
        ),
        const SizedBox(height: 16),
        Container(
          height: 54,
          decoration: BoxDecoration(
            color: const Color(0xFFF3F4F5),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: const [
            ShimmerLine(width: 64, height: 36, radius: 999),
            SizedBox(width: 8),
            ShimmerLine(width: 74, height: 36, radius: 999),
            SizedBox(width: 8),
            ShimmerLine(width: 84, height: 36, radius: 999),
          ],
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < 5; i++) ...[
          const _ClientCardShimmer(),
          if (i < 4) const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _ClientStatShimmer extends StatelessWidget {
  const _ClientStatShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
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
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ShimmerLine(width: 90, height: 12),
          SizedBox(height: 12),
          ShimmerLine(width: 52, height: 24),
        ],
      ),
    );
  }
}

class _ClientCardShimmer extends StatelessWidget {
  const _ClientCardShimmer();

  @override
  Widget build(BuildContext context) {
    return Container(
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
          ShimmerCircle(size: 48),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ShimmerLine(width: 120, height: 16),
                SizedBox(height: 8),
                ShimmerLine(width: 150, height: 12),
              ],
            ),
          ),
          SizedBox(width: 12),
          Icon(Icons.chevron_right_rounded, color: Color(0xFFE6BCBB)),
        ],
      ),
    );
  }
}

class _ClientStats {
  const _ClientStats({
    required this.totalRevenue,
    required this.totalClients,
    required this.repeatClients,
    required this.bookingsThisMonth,
  });

  final double totalRevenue;
  final int totalClients;
  final int repeatClients;
  final int bookingsThisMonth;
}
