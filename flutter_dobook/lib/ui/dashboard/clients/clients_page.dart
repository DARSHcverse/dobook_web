import 'package:dobook/app/session.dart';
import 'package:dobook/app/theme.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/ui/dashboard/clients/client_detail_page.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/empty_state.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
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
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Clients')),
      body: FutureBuilder<List<Client>>(
        future: _future,
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            if (snapshot.hasError) {
              return Center(child: Text('Failed to load: ${snapshot.error}'));
            }
            return const LoadingShimmerList();
          }

          final clients = snapshot.data!;
          if (clients.isEmpty) {
            return const EmptyState(
              icon: Icons.people_alt_outlined,
              title: 'No clients yet',
              subtitle: 'Clients appear automatically when bookings are created.',
            );
          }

          final stats = _computeStats(clients);
          final filtered = _applyFilters(clients);

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
              itemCount: filtered.length + 3,
              separatorBuilder: (context, index) =>
                  index < 3 ? const SizedBox(height: 12) : const SizedBox(height: 8),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _statsRow(stats);
                }

                if (index == 1) {
                  return Container(
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: TextField(
                      controller: _searchCtrl,
                      decoration: InputDecoration(
                        filled: false,
                        hintText: 'Search by name or email',
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

                if (index == 2) {
                  return SizedBox(
                    height: 40,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _filterChip('All', ClientFilter.all),
                        const SizedBox(width: 8),
                        _filterChip('Active', ClientFilter.active),
                        const SizedBox(width: 8),
                        _filterChip('Inactive', ClientFilter.inactive),
                      ],
                    ),
                  );
                }

                final client = filtered[index - 3];
                return _clientCard(client);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _statsRow(_ClientStats stats) {
    final brand = Theme.of(context).extension<BrandColors>();
    return Row(
      children: [
        Expanded(
          child: _statCard(
            'Total Clients',
            stats.totalClients.toString(),
            brand?.statIconRed,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard(
            'Repeat Clients',
            stats.repeatClients.toString(),
            brand?.statIconBlue,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard(
            'Total Revenue',
            formatMoney(stats.totalRevenue),
            brand?.statIconGreen,
          ),
        ),
      ],
    );
  }

  Widget _statCard(String label, String value, Color? iconColor) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    final accent = iconColor ?? scheme.primary;
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
          Stack(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(left: 8, top: 4),
                child: FittedBox(
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
              ),
            ],
          ),
          const SizedBox(height: 6),
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

  Widget _clientCard(Client client) {
    final scheme = Theme.of(context).colorScheme;
    final brand = Theme.of(context).extension<BrandColors>();
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: brand?.cardShadow ?? Theme.of(context).shadowColor,
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.of(context).push(
            slidePageRoute(ClientDetailPage(client: client)),
          );
        },
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
                      client.name.isEmpty ? '(No name)' : client.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${client.totalBookings} bookings',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMoney(client.totalSpent),
                    maxLines: 1,
                    softWrap: false,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: scheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _formatDate(client.lastBooking),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterChip(String label, ClientFilter filter) {
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

  String _formatDate(DateTime date) {
    if (date.year <= 1971) return '—';
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  _ClientStats _computeStats(List<Client> clients) {
    var totalRevenue = 0.0;
    var repeat = 0;
    for (final client in clients) {
      totalRevenue += client.totalSpent;
      if (client.totalBookings > 1) repeat += 1;
    }
    return _ClientStats(
      totalClients: clients.length,
      repeatClients: repeat,
      totalRevenue: totalRevenue,
    );
  }

  List<Client> _applyFilters(List<Client> clients) {
    final query = _searchQuery.trim().toLowerCase();
    final cutoff = DateTime.now().subtract(const Duration(days: 90));

    return clients.where((client) {
      if (query.isNotEmpty) {
        final name = client.name.toLowerCase();
        final email = client.email.toLowerCase();
        if (!name.contains(query) && !email.contains(query)) {
          return false;
        }
      }

      if (_filter == ClientFilter.all) return true;
      final last = client.lastBooking;
      final isActive = last.isAfter(cutoff);
      if (_filter == ClientFilter.active) return isActive;
      if (_filter == ClientFilter.inactive) return !isActive;
      return true;
    }).toList();
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
}

class _ClientStats {
  const _ClientStats({
    required this.totalClients,
    required this.repeatClients,
    required this.totalRevenue,
  });

  final int totalClients;
  final int repeatClients;
  final double totalRevenue;
}
