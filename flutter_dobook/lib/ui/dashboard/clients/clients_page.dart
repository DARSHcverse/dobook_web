import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/ui/dashboard/clients/client_detail_page.dart';
import 'package:dobook/ui/widgets/empty_state.dart';
import 'package:dobook/ui/widgets/loading_shimmer.dart';
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

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  Widget build(BuildContext context) {
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
              subtitle:
                  'Clients appear automatically when bookings are created.',
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
                  return TextField(
                    decoration: const InputDecoration(
                      hintText: 'Search by name or email',
                      prefixIcon: Icon(Icons.search),
                    ),
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                    },
                  );
                }

                if (index == 2) {
                  return Wrap(
                    spacing: 8,
                    children: [
                      _filterChip('All', ClientFilter.all),
                      _filterChip('Active', ClientFilter.active),
                      _filterChip('Inactive', ClientFilter.inactive),
                    ],
                  );
                }

                final client = filtered[index - 3];
                return Card(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ClientDetailPage(client: client),
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
                                  client.name.isEmpty
                                      ? '(No name)'
                                      : client.name,
                                  style:
                                      Theme.of(context).textTheme.titleMedium,
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  client.email,
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
                                  '${client.totalBookings} bookings',
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
                                formatMoney(client.totalSpent),
                                maxLines: 1,
                                softWrap: false,
                                overflow: TextOverflow.ellipsis,
                                style: Theme.of(context)
                                    .textTheme
                                    .titleSmall
                                    ?.copyWith(
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                _formatDate(client.lastBooking),
                                style:
                                    Theme.of(context).textTheme.bodySmall,
                              ),
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

  Widget _statsRow(_ClientStats stats) {
    return Row(
      children: [
        Expanded(child: _statCard('Total Clients', stats.totalClients)),
        const SizedBox(width: 12),
        Expanded(child: _statCard('Repeat Clients', stats.repeatClients)),
        const SizedBox(width: 12),
        Expanded(
          child: _statCard('Total Revenue', formatMoney(stats.totalRevenue)),
        ),
      ],
    );
  }

  Widget _statCard(String label, Object value) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            FittedBox(
              fit: BoxFit.scaleDown,
              child: Text(
                value.toString(),
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
            Text(label, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String label, ClientFilter filter) {
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
