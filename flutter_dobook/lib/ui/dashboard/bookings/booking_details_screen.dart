import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/staff.dart';
import 'package:dobook/ui/dashboard/bookings/edit_booking_screen.dart';
import 'package:dobook/ui/shared/widgets/avatar_widget.dart';
import 'package:dobook/ui/shared/widgets/section_header.dart';
import 'package:dobook/ui/shared/widgets/status_badge.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class BookingDetailsScreen extends StatefulWidget {
  const BookingDetailsScreen({super.key, required this.booking});

  final Booking booking;

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  late Booking _booking;
  Future<List<Staff>>? _staffFuture;

  bool _savingPayment = false;
  bool _sendingInvoice = false;
  bool _requestingReview = false;
  bool _cancelling = false;
  bool _updatingStaff = false;

  String? _selectedStaffId;

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _staffFuture ??= _loadStaff();
  }

  @override
  Widget build(BuildContext context) {
    final booking = _booking;
    final breakdown = _buildBreakdown(booking, booking.lineItems);
    final paymentStatusValue = _normalizePaymentStatus(booking.paymentStatus);
    final paymentMethodValue = _normalizePaymentMethod(booking.paymentMethod);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).maybePop(),
          icon: const Icon(
            Icons.arrow_back_rounded,
            color: Color(0xFFBE002B),
          ),
        ),
        title: Text(
          booking.customerName.trim().isEmpty ? 'Booking' : booking.customerName,
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _SurfaceCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    AvatarWidget(name: booking.customerName, size: 64),
                    const SizedBox(height: 14),
                    Text(
                      booking.customerName.trim().isEmpty
                          ? 'Unknown Customer'
                          : booking.customerName,
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF191C1D),
                          ),
                    ),
                    const SizedBox(height: 12),
                    _CenteredInfoRow(
                      icon: Icons.mail_outline_rounded,
                      text: booking.customerEmail.isEmpty
                          ? 'No email provided'
                          : booking.customerEmail,
                    ),
                    if (booking.customerPhone.trim().isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _CenteredInfoRow(
                        icon: Icons.phone_outlined,
                        text: booking.customerPhone,
                      ),
                    ],
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _CircleActionButton(
                          icon: Icons.call_rounded,
                          tooltip: 'Call',
                          onTap: () => _showContactNotice(
                            booking.customerPhone.trim().isEmpty
                                ? 'No phone number available.'
                                : 'Call ${booking.customerPhone}',
                          ),
                        ),
                        const SizedBox(width: 12),
                        _CircleActionButton(
                          icon: Icons.mail_rounded,
                          tooltip: 'Email',
                          onTap: () => _showContactNotice(
                            booking.customerEmail.isEmpty
                                ? 'No email available.'
                                : 'Email ${booking.customerEmail}',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _SurfaceCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(label: 'Booking Details'),
                    _DetailsRow(
                      label: 'Service',
                      value: _serviceLabel(booking),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 24),
                    _DetailsRow(
                      label: 'Date',
                      value: _formatDisplayDate(booking.bookingDate),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 24),
                    _DetailsRow(
                      label: 'Time',
                      value: _formatDisplayTime(booking.bookingTime),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 24),
                    _DetailsRow(
                      label: 'Duration',
                      value: _formatDuration(booking.durationMinutes),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 24),
                    _DetailsRow(
                      label: 'Created',
                      value: _formatCreatedDate(booking.createdAt),
                    ),
                    const Divider(color: Color(0xFFF3F4F5), height: 24),
                    _DetailsRow(
                      label: 'Status',
                      trailing: Align(
                        alignment: Alignment.centerRight,
                        child: StatusBadge(status: booking.status),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _SurfaceCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(label: 'Payment'),
                    Text(
                      formatMoney(breakdown.totalAmount),
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFFBE002B),
                          ),
                    ),
                    const SizedBox(height: 16),
                    _PaymentLineItem(label: 'Base', amount: breakdown.baseTotal),
                    if (breakdown.travelTotal > 0)
                      _PaymentLineItem(
                        label: 'Travel',
                        amount: breakdown.travelTotal,
                      ),
                    if (breakdown.cbdTotal > 0)
                      _PaymentLineItem(
                        label: 'CBD',
                        amount: breakdown.cbdTotal,
                      ),
                    for (final addon in breakdown.addons)
                      _PaymentLineItem(label: addon.label, amount: addon.total),
                    const Divider(color: Color(0xFFF3F4F5), height: 28),
                    DropdownButtonFormField<String>(
                      initialValue: paymentStatusValue,
                      decoration: const InputDecoration(
                        labelText: 'Payment Status',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'unpaid',
                          child: Text('Unpaid'),
                        ),
                        DropdownMenuItem(
                          value: 'deposit_paid',
                          child: Text('Deposit Paid'),
                        ),
                        DropdownMenuItem(
                          value: 'paid_in_full',
                          child: Text('Paid in Full'),
                        ),
                      ],
                      onChanged: _savingPayment
                          ? null
                          : (value) {
                              if (value == null) return;
                              _savePayment({'payment_status': value});
                            },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue:
                          paymentMethodValue.isEmpty ? null : paymentMethodValue,
                      decoration: const InputDecoration(
                        labelText: 'Payment Method',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'bank_transfer',
                          child: Text('Bank Transfer'),
                        ),
                        DropdownMenuItem(value: 'cash', child: Text('Cash')),
                        DropdownMenuItem(value: 'online', child: Text('Online')),
                        DropdownMenuItem(value: 'other', child: Text('Other')),
                      ],
                      onChanged: _savingPayment
                          ? null
                          : (value) {
                              _savePayment({'payment_method': value ?? ''});
                            },
                    ),
                    if (_savingPayment) ...[
                      const SizedBox(height: 12),
                      const LinearProgressIndicator(),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _SurfaceCard(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: FutureBuilder<List<Staff>>(
                  future: _staffFuture,
                  builder: (context, snapshot) {
                    final allStaff = snapshot.data ?? const <Staff>[];
                    final activeStaff = allStaff
                        .where((staff) => staff.isActive)
                        .toList();
                    final assignedStaff = _findAssignedStaff(allStaff);

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SectionHeader(label: 'Assigned Staff'),
                        if (snapshot.connectionState == ConnectionState.waiting)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 12),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (snapshot.hasError)
                          Text(
                            'Unable to load staff',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF94A3B8),
                                ),
                          )
                        else if (_hasAssignedStaff(booking))
                          Row(
                            children: [
                              AvatarWidget(
                                name: assignedStaff?.name ?? booking.staffName,
                                size: 48,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      assignedStaff?.name.isNotEmpty == true
                                          ? assignedStaff!.name
                                          : _staffLabel(booking),
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(fontWeight: FontWeight.w700),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(
                                          Icons.mail_outline_rounded,
                                          size: 14,
                                          color: Color(0xFF94A3B8),
                                        ),
                                        const SizedBox(width: 6),
                                        Expanded(
                                          child: Text(
                                            assignedStaff?.email ?? 'No email',
                                            style: Theme.of(context)
                                                .textTheme
                                                .bodySmall
                                                ?.copyWith(
                                                  color: const Color(0xFF94A3B8),
                                                ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              TextButton(
                                onPressed:
                                    _updatingStaff ? null : _removeAssignedStaff,
                                child: Text(
                                  'Remove',
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelLarge
                                      ?.copyWith(
                                        color: const Color(0xFFBE002B),
                                        fontWeight: FontWeight.w700,
                                      ),
                                ),
                              ),
                            ],
                          )
                        else if (activeStaff.isEmpty)
                          Text(
                            'No active staff available.',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                  color: const Color(0xFF94A3B8),
                                ),
                          )
                        else ...[
                          DropdownButtonFormField<String>(
                            initialValue: _selectedStaffId,
                            decoration: const InputDecoration(
                              labelText: 'Select Staff',
                            ),
                            items: [
                              for (final staff in activeStaff)
                                DropdownMenuItem(
                                  value: staff.id,
                                  child: Text(staff.name),
                                ),
                            ],
                            onChanged: _updatingStaff
                                ? null
                                : (value) {
                                    setState(() => _selectedStaffId = value);
                                  },
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: _updatingStaff || _selectedStaffId == null
                                  ? null
                                  : _assignSelectedStaff,
                              child: _updatingStaff
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor:
                                            AlwaysStoppedAnimation<Color>(
                                          Colors.white,
                                        ),
                                      ),
                                    )
                                  : const Text('Assign'),
                            ),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ),
            if (booking.notes.trim().isNotEmpty) ...[
              const SizedBox(height: 16),
              _SurfaceCard(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(label: 'Notes'),
                      Text(
                        booking.notes,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              fontSize: 14,
                              color: const Color(0xFF5D3F3F),
                            ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _openEdit(context, booking),
                    child: const Text('Edit'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: _sendingInvoice ? null : _sendInvoice,
                    child: _sendingInvoice
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Send Invoice'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _requestingReview ? null : _requestReview,
              child: _requestingReview
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Request Review'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: _cancelling ? null : _confirmCancel,
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFBE002B),
                side: const BorderSide(color: Color(0xFFBE002B), width: 1.5),
              ),
              child: _cancelling
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Cancel Booking'),
            ),
          ],
        ),
      ),
    );
  }

  Future<List<Staff>> _loadStaff() async {
    final repo = context.read<DobookRepository>();
    final token = context.read<AppSession>().token;
    return repo.getStaff(token: token);
  }

  Staff? _findAssignedStaff(List<Staff> staffList) {
    if (_booking.staffId.trim().isNotEmpty) {
      for (final staff in staffList) {
        if (staff.id == _booking.staffId.trim()) return staff;
      }
    }
    if (_booking.staffName.trim().isNotEmpty) {
      for (final staff in staffList) {
        if (staff.name.trim().toLowerCase() ==
            _booking.staffName.trim().toLowerCase()) {
          return staff;
        }
      }
    }
    return null;
  }

  bool _hasAssignedStaff(Booking booking) {
    return booking.staffId.trim().isNotEmpty || booking.staffName.trim().isNotEmpty;
  }

  String _serviceLabel(Booking booking) {
    if (booking.boothType.trim().isEmpty) return booking.serviceType;
    if (booking.serviceType.trim().isEmpty) return booking.boothType;
    return '${booking.serviceType} / ${booking.boothType}';
  }

  String _formatDisplayDate(String raw) {
    final date = DateTime.tryParse(raw);
    if (date == null) return raw;
    return DateFormat('EEEE, d MMM yyyy').format(date);
  }

  String _formatCreatedDate(String raw) {
    final date = DateTime.tryParse(raw);
    if (date == null) return raw.isEmpty ? '—' : raw;
    return DateFormat('d MMM yyyy').format(date);
  }

  String _formatDisplayTime(String raw) {
    try {
      final parsed = DateFormat('HH:mm').parseStrict(raw);
      return DateFormat('h:mm a').format(parsed);
    } catch (_) {
      final fallback = DateTime.tryParse('2000-01-01T$raw');
      if (fallback != null) {
        return DateFormat('h:mm a').format(fallback);
      }
      return raw;
    }
  }

  String _formatDuration(int minutes) {
    if (minutes <= 0) return '—';
    final hours = minutes ~/ 60;
    final remainder = minutes % 60;
    if (hours == 0) return '$minutes min';
    if (remainder == 0) return '$hours hr';
    return '$hours hr $remainder min';
  }

  void _showContactNotice(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  String _normalizePaymentStatus(String status) {
    final value = status.trim().toLowerCase();
    if (value == 'paid') return 'paid_in_full';
    if (value == 'paid_in_full') return 'paid_in_full';
    if (value == 'deposit_paid') return 'deposit_paid';
    return 'unpaid';
  }

  String _normalizePaymentMethod(String method) {
    final value = method.trim().toLowerCase();
    switch (value) {
      case 'bank_transfer':
      case 'cash':
      case 'online':
      case 'other':
        return value;
      default:
        return '';
    }
  }

  String _staffLabel(Booking booking) {
    if (booking.staffName.trim().isNotEmpty) return booking.staffName.trim();
    if (booking.staffId.trim().isNotEmpty) return booking.staffId.trim();
    return 'Unassigned';
  }

  Future<void> _savePayment(Map<String, dynamic> updates) async {
    if (_savingPayment) return;
    setState(() => _savingPayment = true);

    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final updated = await repo.updateBooking(
        _booking.id,
        updates,
        token: token,
      );
      if (!mounted) return;
      setState(() => _booking = updated);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _savingPayment = false);
    }
  }

  Future<void> _assignSelectedStaff() async {
    final staffId = _selectedStaffId;
    if (staffId == null || _updatingStaff) return;
    await _updateAssignedStaff(staffId);
  }

  Future<void> _removeAssignedStaff() async {
    if (_updatingStaff) return;
    await _updateAssignedStaff(null);
  }

  Future<void> _updateAssignedStaff(String? staffId) async {
    setState(() => _updatingStaff = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final updated = await repo.updateBooking(
        _booking.id,
        {'staff_id': staffId},
        token: token,
      );
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _selectedStaffId = null;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _updatingStaff = false);
    }
  }

  Future<void> _openEdit(BuildContext context, Booking booking) async {
    final updated = await Navigator.of(context).push<Booking?>(
      MaterialPageRoute(
        builder: (_) => EditBookingScreen(booking: booking),
      ),
    );

    if (updated != null && mounted) {
      setState(() => _booking = updated);
    }
  }

  Future<void> _sendInvoice() async {
    if (_sendingInvoice) return;
    setState(() => _sendingInvoice = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.sendInvoice(_booking.id, token: token);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invoice sent to ${_booking.customerEmail}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _sendingInvoice = false);
    }
  }

  Future<void> _requestReview() async {
    if (_requestingReview) return;
    setState(() => _requestingReview = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.requestReview(_booking.id, token: token);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Review request sent')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _requestingReview = false);
    }
  }

  Future<void> _confirmCancel() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cancel this booking?'),
          content: const Text('This cannot be undone.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Go back'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (confirm == true) {
      await _cancelBooking();
    }
  }

  Future<void> _cancelBooking() async {
    if (_cancelling) return;
    setState(() => _cancelling = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.cancelBooking(_booking.id, token: token);
      if (!mounted) return;
      Navigator.of(context).pop('cancelled');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  _ChargesBreakdown _buildBreakdown(
    Booking booking,
    List<Map<String, dynamic>> lineItems,
  ) {
    if (lineItems.isEmpty) {
      final base = booking.price * booking.quantity;
      return _ChargesBreakdown(
        baseTotal: base,
        travelTotal: 0,
        cbdTotal: 0,
        addons: const [],
        totalAmount: booking.total,
      );
    }

    final baseItem = lineItems.first;
    final extraItems = lineItems.length > 1
        ? lineItems.sublist(1)
        : const <Map<String, dynamic>>[];
    final travelItem = extraItems.firstWhere(
      (item) => _itemDescription(item).contains('travel'),
      orElse: () => const {},
    );
    final cbdItem = extraItems.firstWhere(
      (item) => _itemDescription(item).contains('cbd'),
      orElse: () => const {},
    );

    final addons = <_ChargeLine>[];
    for (var i = 0; i < lineItems.length; i++) {
      final item = lineItems[i];
      if (i == 0) continue;
      if (identical(item, travelItem) || identical(item, cbdItem)) continue;
      final amount = _lineItemTotal(item);
      if (amount <= 0) continue;
      addons.add(_ChargeLine(label: _itemLabel(item), total: amount));
    }

    return _ChargesBreakdown(
      baseTotal: _lineItemTotal(baseItem),
      travelTotal: _lineItemTotal(travelItem),
      cbdTotal: _lineItemTotal(cbdItem),
      addons: addons,
      totalAmount: booking.total,
    );
  }

  String _itemDescription(Map<String, dynamic> item) {
    final description = item['description']?.toString() ?? '';
    return description.trim().toLowerCase();
  }

  String _itemLabel(Map<String, dynamic> item) {
    return item['description']?.toString().trim() ?? 'Add-on';
  }

  double _lineItemTotal(Map<String, dynamic> item) {
    if (item.isEmpty) return 0;
    final total = item['total'] ?? item['amount'];
    if (total is num) return total.toDouble();
    if (total is String) return double.tryParse(total) ?? 0;

    final unit = item['unit_price'] ?? item['unitPrice'] ?? item['price'];
    final qty = item['qty'] ?? item['quantity'] ?? 1;

    final unitValue = unit is num
        ? unit.toDouble()
        : double.tryParse(unit?.toString() ?? '') ?? 0;
    final qtyValue = qty is num
        ? qty.toDouble()
        : double.tryParse(qty?.toString() ?? '') ?? 1;

    return unitValue * (qtyValue <= 0 ? 1 : qtyValue);
  }
}

class _SurfaceCard extends StatelessWidget {
  const _SurfaceCard({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A191C1D),
            blurRadius: 24,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }
}

class _CenteredInfoRow extends StatelessWidget {
  const _CenteredInfoRow({
    required this.icon,
    required this.text,
  });

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            text,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF94A3B8),
                ),
          ),
        ),
      ],
    );
  }
}

class _CircleActionButton extends StatelessWidget {
  const _CircleActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: const Color(0xFFF3F4F5),
        shape: const CircleBorder(),
        child: InkWell(
          onTap: onTap,
          customBorder: const CircleBorder(),
          child: SizedBox(
            width: 48,
            height: 48,
            child: Icon(icon, color: const Color(0xFFBE002B)),
          ),
        ),
      ),
    );
  }
}

class _DetailsRow extends StatelessWidget {
  const _DetailsRow({
    required this.label,
    this.value,
    this.trailing,
  });

  final String label;
  final String? value;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: const Color(0xFF94A3B8),
                ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: trailing ??
              Text(
                value ?? '—',
                textAlign: TextAlign.right,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF191C1D),
                    ),
              ),
        ),
      ],
    );
  }
}

class _PaymentLineItem extends StatelessWidget {
  const _PaymentLineItem({
    required this.label,
    required this.amount,
  });

  final String label;
  final double amount;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: const Color(0xFF5D3F3F),
                  ),
            ),
          ),
          Text(
            formatMoney(amount),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF191C1D),
                ),
          ),
        ],
      ),
    );
  }
}

class _ChargesBreakdown {
  const _ChargesBreakdown({
    required this.baseTotal,
    required this.travelTotal,
    required this.cbdTotal,
    required this.addons,
    required this.totalAmount,
  });

  final double baseTotal;
  final double travelTotal;
  final double cbdTotal;
  final List<_ChargeLine> addons;
  final double totalAmount;
}

class _ChargeLine {
  const _ChargeLine({
    required this.label,
    required this.total,
  });

  final String label;
  final double total;
}
