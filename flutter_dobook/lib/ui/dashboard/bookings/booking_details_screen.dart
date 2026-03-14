import 'package:dobook/app/session.dart';
import 'package:dobook/data/dobook_repository.dart';
import 'package:dobook/data/models/booking.dart';
import 'package:dobook/data/models/staff.dart';
import 'package:dobook/invoices/invoice_preview_screen.dart';
import 'package:dobook/ui/dashboard/bookings/edit_booking_screen.dart';
import 'package:dobook/util/format.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class BookingDetailsScreen extends StatefulWidget {
  const BookingDetailsScreen({super.key, required this.booking});

  final Booking booking;

  @override
  State<BookingDetailsScreen> createState() => _BookingDetailsScreenState();
}

class _BookingDetailsScreenState extends State<BookingDetailsScreen> {
  late Booking _booking;
  bool _savingPayment = false;
  bool _sendingInvoice = false;
  bool _requestingReview = false;
  bool _cancelling = false;
  bool _staffLoading = false;
  bool _assigningStaff = false;
  String _staffSelection = '';
  String _assignedStaffName = '';
  String _assignedStaffId = '';
  List<Staff> _staffList = const [];

  @override
  void initState() {
    super.initState();
    _booking = widget.booking;
    _staffSelection = _booking.staffId;
    _assignedStaffId = _booking.staffId;
    _assignedStaffName = _booking.staffName;
    _loadStaff();
  }

  @override
  Widget build(BuildContext context) {
    final business = context.read<AppSession>().business!;
    final booking = _booking;

    final paymentStatusValue = _normalizePaymentStatus(booking.paymentStatus);
    final paymentMethodValue = _normalizePaymentMethod(booking.paymentMethod);

    final lineItems = booking.lineItems;
    final breakdown = _buildBreakdown(booking, lineItems);
    final activeStaff =
        _staffList.where((member) => member.isActive).toList();
    final activeStaffIds = activeStaff.map((member) => member.id).toSet();
    Staff? currentStaff;
    for (final member in _staffList) {
      if (member.id == _assignedStaffId || member.id == booking.staffId) {
        currentStaff = member;
        break;
      }
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(booking.invoiceId.isEmpty ? 'Booking' : booking.invoiceId),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Customer', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _kv('Name', booking.customerName),
                  _kv('Email', booking.customerEmail),
                  _kv('Phone', booking.customerPhone),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Booking', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _kv('Service', booking.serviceType),
                  _kv('Booth', booking.boothType),
                  _kv('Date', booking.bookingDate),
                  _kv('Time', booking.bookingTime),
                  _kv('Duration', '${booking.durationMinutes} min'),
                  if (booking.eventLocation.isNotEmpty)
                    _kv('Location', booking.eventLocation),
                  if (booking.notes.isNotEmpty) _kv('Notes', booking.notes),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Payments', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    key: ValueKey('payment-status-$paymentStatusValue'),
                    initialValue: paymentStatusValue,
                    decoration: const InputDecoration(
                      labelText: 'Payment status',
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
                    key: ValueKey('payment-method-$paymentMethodValue'),
                    initialValue:
                        paymentMethodValue.isEmpty ? null : paymentMethodValue,
                    decoration: const InputDecoration(
                      labelText: 'Payment method',
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
          Text('Charges', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  _amountRow('Base service price', breakdown.baseTotal),
                  if (breakdown.travelTotal > 0)
                    _amountRow('Travel fee', breakdown.travelTotal),
                  if (breakdown.cbdTotal > 0)
                    _amountRow('CBD logistics fee', breakdown.cbdTotal),
                  if (breakdown.addons.isNotEmpty) ...[
                    for (final addon in breakdown.addons)
                      _amountRow(addon.label, addon.total),
                  ],
                  const Divider(height: 24),
                  _amountRow(
                    'Total amount',
                    breakdown.totalAmount,
                    isBold: true,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Assigned Staff', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_staffLoading) ...[
                    const LinearProgressIndicator(),
                    const SizedBox(height: 12),
                  ],
                  if (_assignedStaffName.trim().isNotEmpty ||
                      (currentStaff?.name.trim().isNotEmpty ?? false))
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        'Currently assigned: ${_assignedStaffName.isNotEmpty ? _assignedStaffName : (currentStaff?.name ?? '')}',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  DropdownButtonFormField<String>(
                    key: ValueKey('staff-$_staffSelection'),
                    initialValue: activeStaffIds.contains(_staffSelection)
                        ? _staffSelection
                        : null,
                    decoration: const InputDecoration(
                      labelText: 'Select staff member',
                    ),
                    items: activeStaff
                        .map(
                          (member) => DropdownMenuItem(
                            value: member.id,
                            child: Text(member.name),
                          ),
                        )
                        .toList(),
                    onChanged: _assigningStaff
                        ? null
                        : (value) {
                            setState(() => _staffSelection = value ?? '');
                          },
                  ),
                  if (!_staffLoading && activeStaff.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 8),
                      child: Text(
                        'No active staff members yet.',
                        style: TextStyle(color: Colors.black54),
                      ),
                    ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      FilledButton(
                        onPressed: _assigningStaff || _staffSelection.isEmpty
                            ? null
                            : _assignStaff,
                        child: _assigningStaff
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Assign'),
                      ),
                      const SizedBox(width: 12),
                      if (_assignedStaffId.isNotEmpty)
                        TextButton(
                          onPressed: _assigningStaff ? null : _removeStaff,
                          child: const Text('Remove'),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Actions', style: _sectionStyle(context)),
          const SizedBox(height: 8),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  FilledButton.icon(
                    onPressed: () => _openEdit(context, booking),
                    icon: const Icon(Icons.edit),
                    label: const Text('Edit Booking'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _sendingInvoice ? null : _sendInvoice,
                    icon: _sendingInvoice
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.send),
                    label: Text(
                      _sendingInvoice ? 'Sending...' : 'Send Invoice',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _requestingReview ? null : _requestReview,
                    icon: _requestingReview
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.reviews),
                    label: Text(
                      _requestingReview ? 'Sending...' : 'Request Review',
                    ),
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => InvoicePreviewScreen(
                            business: business,
                            booking: booking,
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.picture_as_pdf),
                    label: const Text('Invoice PDF'),
                  ),
                  const SizedBox(height: 12),
                  TextButton.icon(
                    onPressed: _cancelling ? null : _confirmCancel,
                    icon: _cancelling
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.cancel),
                    label: const Text('Cancel Booking'),
                    style: TextButton.styleFrom(
                      foregroundColor: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  TextStyle _sectionStyle(BuildContext context) {
    return Theme.of(
      context,
    ).textTheme.titleSmall!.copyWith(fontWeight: FontWeight.w600);
  }

  Widget _kv(String k, String v, {String emptyValue = '—'}) {
    final value = v.isEmpty ? emptyValue : v;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(k, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _amountRow(String label, double amount, {bool isBold = false}) {
    final style = isBold
        ? const TextStyle(fontWeight: FontWeight.w700)
        : const TextStyle(fontWeight: FontWeight.w500);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(formatMoney(amount), style: style),
        ],
      ),
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

  Future<void> _loadStaff() async {
    setState(() => _staffLoading = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final list = await repo.getStaff(token: token);
      if (!mounted) return;
      Staff? assigned;
      if (_assignedStaffId.isNotEmpty) {
        for (final member in list) {
          if (member.id == _assignedStaffId) {
            assigned = member;
            break;
          }
        }
      }
      setState(() {
        _staffList = list;
        if (assigned != null) {
          _assignedStaffName = assigned.name;
        }
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _staffLoading = false);
    }
  }

  Future<void> _assignStaff() async {
    if (_assigningStaff || _staffSelection.isEmpty) return;
    setState(() => _assigningStaff = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      await repo.assignStaff(_booking.id, _staffSelection, token: token);
      if (!mounted) return;
      Staff? assigned;
      for (final member in _staffList) {
        if (member.id == _staffSelection) {
          assigned = member;
          break;
        }
      }
      setState(() {
        _assignedStaffId = _staffSelection;
        if (assigned != null) {
          _assignedStaffName = assigned.name;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Staff assigned')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _assigningStaff = false);
    }
  }

  Future<void> _removeStaff() async {
    if (_assigningStaff) return;
    setState(() => _assigningStaff = true);
    try {
      final repo = context.read<DobookRepository>();
      final token = context.read<AppSession>().token;
      final updated = await repo.updateBooking(
        _booking.id,
        {'staff_id': null},
        token: token,
      );
      if (!mounted) return;
      setState(() {
        _booking = updated;
        _assignedStaffId = '';
        _assignedStaffName = '';
        _staffSelection = '';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Staff removed')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString())),
      );
    } finally {
      if (mounted) setState(() => _assigningStaff = false);
    }
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
    final extraItems =
        lineItems.length > 1 ? lineItems.sublist(1) : const <Map<String, dynamic>>[];
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
      addons.add(
        _ChargeLine(label: _itemLabel(item), total: amount),
      );
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
    final desc = item['description']?.toString() ?? '';
    return desc.trim().toLowerCase();
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
  const _ChargeLine({required this.label, required this.total});

  final String label;
  final double total;
}
