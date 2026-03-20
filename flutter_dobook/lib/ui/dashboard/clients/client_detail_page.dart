import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/client.dart';
import 'package:dobook/ui/dashboard/bookings/booking_details_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/loading_shimmer.dart';
import 'package:dobook/ui/shared/widgets/page_transitions.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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
  final FocusNode _notesFocusNode = FocusNode();
  final ScrollController _scrollController = ScrollController();
  final GlobalKey _notesKey = GlobalKey();

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
    _notesFocusNode.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phone = _client.phone?.trim() ?? '';

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text('Client Profile'),
        actions: [
          IconButton(
            tooltip: 'Edit notes',
            onPressed: _focusNotesEditor,
            icon: const Icon(
              Icons.edit_outlined,
              color: Color(0xFFBE002B),
            ),
          ),
        ],
      ),
      body: FutureBuilder<List<Booking>>(
        future: _future,
        builder: (context, snapshot) {
          final bookings = _sortedBookings(snapshot.data ?? const <Booking>[]);

          return SingleChildScrollView(
            controller: _scrollController,
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(phone),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _ClientMetricCard(
                        label: 'Bookings',
                        value: _client.totalBookings.toString(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ClientMetricCard(
                        label: 'Total Spent',
                        value: _formatSpend(_client.totalSpent),
                        valueColor: const Color(0xFFBE002B),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _ClientMetricCard(
                        label: 'Last Visit',
                        value: _formatLongDate(_client.lastBooking),
                        compact: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  key: _notesKey,
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
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Internal Notes',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const Spacer(),
                            Text(
                              'STAFF ONLY',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelSmall
                                  ?.copyWith(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.4,
                                    color: const Color(0xFFBE002B),
                                  ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF3F4F5),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: TextField(
                            controller: _notesCtrl,
                            focusNode: _notesFocusNode,
                            minLines: 5,
                            maxLines: 8,
                            decoration: InputDecoration(
                              filled: false,
                              hintText: 'Add private notes for this client',
                              hintStyle: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(color: const Color(0xFF94A3B8)),
                              border: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              contentPadding: const EdgeInsets.all(16),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerRight,
                          child: _SoftPillButton(
                            label: _savingNotes ? 'Saving...' : 'Save Notes',
                            onTap: _savingNotes ? null : _saveNotes,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Text(
                      'Booking History',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: bookings.isEmpty
                          ? null
                          : () {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Showing all bookings'),
                                ),
                              );
                            },
                      child: Text(
                        'View All',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: const Color(0xFFBE002B),
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (!snapshot.hasData && !snapshot.hasError)
                  const _ClientHistoryLoading()
                else if (snapshot.hasError)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text('Failed to load: ${snapshot.error}'),
                  )
                else if (bookings.isEmpty)
                  const _ClientHistoryEmptyState()
                else
                  Column(
                    children: [
                      for (final booking in bookings)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: _HistoryBookingCard(booking: booking),
                        ),
                    ],
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(String phone) {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            AvatarWidget(name: _client.name, size: 96),
            Positioned(
              right: -2,
              bottom: -2,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0xFFBE002B),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 3),
                ),
                child: const Icon(
                  Icons.check_rounded,
                  size: 14,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Text(
          _client.name.isEmpty ? 'Unnamed client' : _client.name,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF191C1D),
              ),
        ),
        const SizedBox(height: 8),
        Text(
          _client.email,
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontSize: 14,
                color: const Color(0xFF94A3B8),
              ),
        ),
        const SizedBox(height: 16),
        _CallClientButton(
          phone: phone,
          onTap: () {
            final message = phone.isEmpty ? 'No phone number available.' : phone;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(message)),
            );
          },
        ),
      ],
    );
  }

  void _focusNotesEditor() {
    final target = _notesKey.currentContext;
    if (target != null) {
      Scrollable.ensureVisible(
        target,
        duration: const Duration(milliseconds: 250),
        curve: Curves.easeOut,
      );
    }
    _notesFocusNode.requestFocus();
  }

  List<Booking> _sortedBookings(List<Booking> bookings) {
    final sorted = List<Booking>.from(bookings);
    sorted.sort((a, b) => _sortDate(b).compareTo(_sortDate(a)));
    return sorted;
  }

  DateTime _sortDate(Booking booking) {
    final dateTime = DateTime.tryParse(
      '${booking.bookingDate}T${booking.bookingTime}',
    );
    if (dateTime != null) return dateTime;
    final fallback = DateTime.tryParse(booking.bookingDate);
    return fallback ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  String _formatSpend(double value) {
    return NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(value);
  }

  String _formatLongDate(DateTime date) {
    if (date.year <= 1971) return '—';
    return DateFormat('d MMM yyyy').format(date);
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

class _CallClientButton extends StatelessWidget {
  const _CallClientButton({
    required this.phone,
    required this.onTap,
  });

  final String phone;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFF3F4F5),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.call_rounded,
                size: 18,
                color: Color(0xFFBE002B),
              ),
              const SizedBox(width: 8),
              Text(
                phone.isEmpty ? 'Call Client' : 'Call Client',
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: const Color(0xFFBE002B),
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ClientMetricCard extends StatelessWidget {
  const _ClientMetricCard({
    required this.label,
    required this.value,
    this.valueColor = const Color(0xFF191C1D),
    this.compact = false,
  });

  final String label;
  final String value;
  final Color valueColor;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
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
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF94A3B8),
                ),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            textAlign: TextAlign.center,
            maxLines: compact ? 2 : 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontSize: compact ? 12 : 18,
                  fontWeight: FontWeight.w700,
                  color: valueColor,
                ),
          ),
        ],
      ),
    );
  }
}

class _SoftPillButton extends StatelessWidget {
  const _SoftPillButton({
    required this.label,
    required this.onTap,
  });

  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFFE7E8E9),
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Text(
            label,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: const Color(0xFFBE002B),
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ),
    );
  }
}

class _HistoryBookingCard extends StatelessWidget {
  const _HistoryBookingCard({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final accent = _serviceColor(booking.serviceType);
    return Container(
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
              slidePageRoute(BookingDetailsScreen(booking: booking)),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    Icons.design_services_rounded,
                    color: accent,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.serviceType.isEmpty ? 'Service' : booking.serviceType,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${_formatDate(booking.bookingDate)} · ${_formatTime(booking.bookingTime)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: const Color(0xFF94A3B8),
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
                      NumberFormat.currency(
                        symbol: '\$',
                        decimalDigits: 0,
                      ).format(booking.total),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF191C1D),
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _statusLabel(booking.status),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: _statusColor(booking.status),
                          ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static Color _serviceColor(String serviceType) {
    const palette = [
      Color(0xFFBE002B),
      Color(0xFF059669),
      Color(0xFF6366F1),
      Color(0xFFD97706),
    ];
    final hash = serviceType.runes.fold<int>(0, (sum, rune) => sum + rune);
    return palette[hash % palette.length];
  }

  static String _formatDate(String raw) {
    final date = DateTime.tryParse(raw);
    if (date == null) return raw;
    return DateFormat('d MMM yyyy').format(date);
  }

  static String _formatTime(String raw) {
    try {
      final parsed = DateFormat('HH:mm').parseStrict(raw);
      return DateFormat('h:mm a').format(parsed);
    } catch (_) {
      final fallback = DateTime.tryParse('2000-01-01T$raw');
      if (fallback != null) return DateFormat('h:mm a').format(fallback);
      return raw;
    }
  }

  static String _statusLabel(String status) {
    final value = status.trim().toLowerCase();
    if (value.isEmpty) return 'Pending';
    return '${value[0].toUpperCase()}${value.substring(1)}';
  }

  static Color _statusColor(String status) {
    final value = status.trim().toLowerCase();
    if (value == 'cancelled') return const Color(0xFF93000A);
    if (value == 'confirmed') return const Color(0xFF004F51);
    return const Color(0xFF5D3F3F);
  }
}

class _ClientHistoryEmptyState extends StatelessWidget {
  const _ClientHistoryEmptyState();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Text(
          'No booking history yet.',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: const Color(0xFF94A3B8),
              ),
        ),
      ),
    );
  }
}

class _ClientHistoryLoading extends StatelessWidget {
  const _ClientHistoryLoading();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (var i = 0; i < 3; i++) ...[
          Container(
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
                ShimmerBox(
                  width: 40,
                  height: 40,
                  radius: BorderRadius.all(Radius.circular(12)),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ShimmerLine(width: 120, height: 16),
                      SizedBox(height: 8),
                      ShimmerLine(width: 160, height: 12),
                    ],
                  ),
                ),
                SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    ShimmerLine(width: 60, height: 14),
                    SizedBox(height: 6),
                    ShimmerLine(width: 48, height: 10),
                  ],
                ),
              ],
            ),
          ),
          if (i < 2) const SizedBox(height: 8),
        ],
      ],
    );
  }
}
