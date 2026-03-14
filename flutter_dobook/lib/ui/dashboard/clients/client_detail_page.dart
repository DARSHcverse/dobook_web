import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/empty_state.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:dobook/ui/shared/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ClientDetailPage extends StatefulWidget {
  const ClientDetailPage({super.key, required this.client});

  final Client client;

  @override
  State<ClientDetailPage> createState() => _ClientDetailPageState();
}

class _ClientDetailPageState extends State<ClientDetailPage> {
  late Client _client;
  late TextEditingController _notesCtrl;
  Future<List<Booking>>? _future;
  bool _savingNotes = false;

  @override
  void initState() {
    super.initState();
    _client = widget.client;
    _notesCtrl = TextEditingController(text: _client.notes ?? '');
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future ??= _load();
  }

  @override
  void dispose() {
    _notesCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phone = _client.phone?.trim();

    return Scaffold(
      appBar: AppBar(title: const Text('Client')),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          final loading = !snapshot.hasData;
          final error = snapshot.hasError ? snapshot.error : null;
          final bookings = snapshot.data ?? const <Booking>[];

          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
            children: [
              _headerCard(phone),
              const SizedBox(height: 16),
              _statsCard(),
              const SizedBox(height: 16),
              _notesCard(),
              const SizedBox(height: 16),
              Text(
                'Booking History',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              if (loading)
                const LoadingView()
              else if (error != null)
                Text('Failed to load: $error')
              else if (bookings.isEmpty)
                const EmptyState(
                  icon: Icons.event_busy,
                  title: 'No bookings yet',
                  subtitle: 'This client has no booking history yet.',
                )
              else
                ...bookings.map(_bookingTile),
            ],
          );
        },
      ),
    );
  }

  Widget _headerCard(String? phone) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            AvatarWidget(name: _client.name, size: 56),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _client.name.isEmpty ? 'Unnamed client' : _client.name,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _client.email,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                  ),
                  if (phone != null && phone.isNotEmpty)
                    Text(
                      phone,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statsCard() {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _statRow('Total bookings', _client.totalBookings.toString()),
            _statRow('Total spent', formatMoney(_client.totalSpent)),
            _statRow('First booking', _formatDate(_client.firstBooking)),
            _statRow('Last booking', _formatDate(_client.lastBooking)),
          ],
        ),
      ),
    );
  }

  Widget _statRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _notesCard() {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Internal Notes',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              'Notes are private and never shown to customers.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notesCtrl,
              minLines: 3,
              maxLines: 6,
              decoration: const InputDecoration(
                hintText: 'Add internal notes for this client',
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _savingNotes ? null : _saveNotes,
                child: _savingNotes
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Save notes'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _bookingTile(Booking booking) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ListTile(
        title: Text(
          booking.serviceType.isEmpty ? 'Service' : booking.serviceType,
        ),
        subtitle: Text(booking.bookingDate),
        trailing: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              formatMoney(booking.total),
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w700,
                  ),
            ),
            const SizedBox(height: 6),
            StatusBadge(status: booking.status),
          ],
        ),
        onTap: () {
          Navigator.of(context).push(
            slidePageRoute(BookingDetailsScreen(booking: booking)),
          );
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    if (date.year <= 1971) return '—';
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  Future<List<Booking>> _load() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token!;
    return repo.getClientBookings(_client.email, token: token);
  }

  Future<void> _saveNotes() async {
    if (_savingNotes) return;
    setState(() => _savingNotes = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token!;
      await repo.saveClientNotes(
        _client.email,
        _notesCtrl.text.trim(),
        token: token,
      );
      if (!mounted) return;
      setState(() {
        _client = Client(
          email: _client.email,
          name: _client.name,
          phone: _client.phone,
          totalBookings: _client.totalBookings,
          totalSpent: _client.totalSpent,
          firstBooking: _client.firstBooking,
          lastBooking: _client.lastBooking,
          notes: _notesCtrl.text.trim(),
        );
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Notes saved')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _savingNotes = false);
    }
  }
}
